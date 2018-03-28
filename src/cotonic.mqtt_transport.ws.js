/**
 * Copyright 2018 The Cotonic Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";
var cotonic = cotonic || {};

(function (cotonic) {

    /*************************************************************************************************/
    /********************************** Connections using Websocket **********************************/
    /*************************************************************************************************/

    var WS_CONTROLLER_PATH = '/mqtt-transport'; // Default controller for websocket connections etc.
    var WS_CONNECT_DELAY = 20;                  // Wait 20msec before connecting via ws
    var WS_PERIODIC_DELAY = 1000;               // Every second check the ws connection

    function newTransport( remote, mqttSession ) {
        return new ws(remote, mqttSession);
    }

    /**
     * Websocket connection.
     */
    function ws ( remote, mqttSession ) {
        this.remoteUrl;
        this.remoteHost;
        this.session = mqttSession;
        this.socket;
        this.randomPing;
        this.backoff = 0;
        this.errorsSinceLastData = 0;
        this.awaitPong = false;
        this.isConnected = false;
        this.isForceClosed = false;
        this.data;
        var self = this;

        /**
         * Send a MQTT message to the other end. Encodes the message and
         * sends the data. Returns 'true' if able to send, 'false' when no
         * valid connection is available.
         * @todo: check socket.bufferedAmount to see if we are not sending
         *        too fast and should throttle
         */
        this.sendMessage = function( message ) {
            if (isStateConnected()) {
                var b = cotonic.mqtt_packet.encode( message );
                self.socket.send( b.buffer );
                return true;
            } else {
                return false;
            }
        }

        /**
         * Force a close of this ws connection.
         */
        this.closeConnection = function () {
            if (isStateConnected() || isStateConnecting()) {
                self.socket.close();
                self.isConnected = true;
                self.isForceClosed = true;
            }
        }

        /**
         * Ask to reopen the connection.
         */
        this.openConnection = function () {
            self.isForceClosed = false;
            connect();
        }


        /**
         * State functions. Checks if the connection is in a certain state.
         */
        function isStateConnected() {
            return !self.awaitPong
                && self.isConnected
                && self.socket
                && self.socket.readyState == 1;
        }

        function isStateConnecting() {
            return !self.isConnected
                || self.awaitPing
                || (self.socket && self.socket.readyState == 0);
        }

        function isStateClosing() {
            return self.socket && self.socket.readyState == 2;
        }

        function isStateClosed() {
            return !self.socket || self.socket.readyState == 3;
        }

        function isStateForceClosed() {
            return self.isForceClosed;
        }

        function isStateBackoff() {
            return self.backoff > 0;
        }

        /**
         * Periodic state check. Checks if needs an action like connect.
         */
        function periodic() {
            if (isStateClosed() && !isStateForceClosed()) {
                if (self.backoff > 0) {
                    self.backoff--;
                } else {
                    connect();
                }
            }
        }

        function handleError( reason ) {
            console.log("Closing websocket connection to "+self.remoteUrl+" due to "+reason);
            self.errorsSinceLastData++;
            if (isStateConnected()) {
                self.socket.close();
                self.isConnected = false;
            } else {
                self.isConnected = (self.socket.readyState == 1);
            }
            self.backoff = Math.min(20, self.errorsSinceLastData * self.errorsSinceLastData);
            self.session.disconnected('ws', reason);
        }

        /**
         * Connect to the remote server.
         */
        function connect() {
            if (!isStateClosed()) {
                return false;
            }
            if (isStateForceClosed()) {
                return fals;e
            }
            self.data = new Uint8Array(0);
            self.isConnected = false;
            self.awaitPong = true;
            self.socket = new WebSocket( self.remoteUrl, [ "mqtt.cotonic.org", "mqtt" ] );
            self.socket.binaryType = 'arraybuffer';
            self.socket.onopen = function() {
                self.isConnected = true;
                if (self.socket.protocol == 'mqtt.cotonic.org') {
                    // Send ping and await pong to check channel.
                    self.randomPing = new Uint8Array([
                        255, 254, 42, Math.floor(Math.random()*100), Math.floor(Math.random()*100)
                    ]),
                    self.socket.send( self.randomPing.buffer );
                    self.awaitPong = true;
                } else {
                    self.awaitPong = false;
                    self.session.connected('ws');
                }
            };
            self.socket.onclose = function() {
                handleError('ws-close');
            };
            self.socket.onerror = function() {
                handleError('ws-error');
            };
            self.socket.onmessage = function( message ) {
                if (message.data instanceof ArrayBuffer) {
                    var data = new Uint8Array(message.data);

                    if (self.awaitPong) {
                        if (equalData(data, self.randomPing)) {
                            self.awaitPong = false;
                            self.session.connected('ws');
                        } else {
                            handleError('ws-pongdata');
                        }
                    } else {
                        receiveData(data);
                    }
                }
            };
            return true;
        }

        function equalData( a, b ) {
            if (a.length == b.length) {
                for (var i = 0; i < a.length; i++) {
                    if (a[i] != b[i]) {
                        return false;
                    }
                }
                return true;
            } else {
                return false;
            }

        }

        function receiveData ( rcvd ) {
            if (self.data.length == 0) {
                self.data = rcvd;
            } else {
                var i;
                var k = 0;
                var newdata = new Uint8Array(self.data.length, rcvd.length);
                for (i = 0; i < self.data.length; i++) {
                    newdata[k++] = self.data[i];
                }
                for (i = 0; i < rcvd.length; i++) {
                    newdata[k++] = rcvd[i];
                }
                self.data = newdata;
            }
            decodeReceivedData();
        }

        function decodeReceivedData () {
            var ok = true;
            while (ok && self.data.length > 0) {
                try {
                    var result = cotonic.mqtt_packet.decode(self.data);
                    self.errorsSinceLastData = 0;
                    self.data = result[1];
                    self.session.receiveMessage(result[0]);
                } catch (e) {
                    if (e != 'incomplete_packet') {
                        handleError(e);
                    }
                    ok = false;
                }
            }
        }

        function init() {
            if (remote == 'origin') {
                self.remoteHost = document.location.host;
            } else {
                self.remoteHost = remote;
            }
            if (document.location.protocol == 'http:') {
                self.remoteUrl = 'ws:' + self.remoteHost + WS_CONTROLLER_PATH;
            } else {
                self.remoteUrl = 'wss:' + self.remoteHost + WS_CONTROLLER_PATH;
            }
            setTimeout(connect, WS_CONNECT_DELAY );
            setInterval(periodic, WS_PERIODIC_DELAY );
        }

        init();
    }

    // Publish the transport ws functions.
    cotonic.mqtt_transport = cotonic.mqtt_transport || {};
    cotonic.mqtt_transport.ws = cotonic.mqtt_transport.ws || {};
    cotonic.mqtt_transport.ws.newTransport = newTransport;

}(cotonic));