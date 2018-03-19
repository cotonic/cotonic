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

    /**
     * Possible transports for remotes.
     *
     * For 'origin':
     * - wss with mqtt-transport controller
     * - sse + post to mqtt-transport controller
     *
     * For other remotes (clients):
     * - WebRTC
     */

    // Lookup list of all remotes with their connections
    // One of them is 'origin' (which is a special case)
    var sessions = {};

    var WS_CONTROLLER_PATH = '/mqtt-transport'; // Default controller for websocket connections etc.
    var WS_CONNECT_DELAY = 20;                  // Wait 20msec before connecting via ws
    var WS_PERIODIC_DELAY = 1000;               // Every second check the ws connection


    var newSession = function( remote ) {
        remote = remote || 'origin';
        if (sessions[ remote ]) {
            return sessions[remote];
        } else {
            var ch = new mqttSession();
            sessions[remote] = ch;
            ch.connect(remote);
            return ch;
        }
    };

    var findSession = function( remote ) {
        remote = remote || 'origin';
        return sessions[remote];
    };


    /*************************************************************************************************/
    /****************************************** MQTT Session *****************************************/
    /*************************************************************************************************/


    /**
     * MQTT session to a remote server/client.
     * Keeps track of logged on user and authentication.
     * Tries to reconnect if needed.
     */
    function mqttSession() {
        this.connections = {};       // Websocket and other connection
        this.clientId = '';          // Re-assigned by server
        this.sendQueue = [];         // Queued outgoing messages
        this.receiveQueue = [];      // Queue with received messages
        this.isSentConnect = false;
        this.isWaitConnack = false;
        this.connectProps = {};
        var self = this;

        this.connect = function( remote ) {
            if (remote == 'origin') {
                self.connections['ws'] = new ws( remote, self );
                // todo: also connect SSE and postback interfaces
            } else {
                // todo: add webRTC
            }
        };

        this.connected = function ( channel ) {
            // Connection established - try to send out 'connect'
            if (channel == 'ws') {
                if (isStateNew()) {
                    self.isSentConnect = self.sendMessage({
                        type: 'connect',
                        client_id: self.clientId,
                        clean_start: false
                    });
                    if (self.isSentConnect) {
                        self.isWaitConnack = true;
                    }
                }
            }
        };

        this.publish = function( topic, payload, options ) {
            // Queue message
        };

        this.subscribe = function( topics ) {
            // Queue message
        };

        this.unsubscribe = function ( topics ) {
            // Queue message
        }

        // Handle incoming message from another server or client
        this.receiveMessage = function ( msg ) {
            self.receiveQueue.push(msg);
            if (!self.receiveTimer) {
                self.receiveTimer = setTimeout(function() { doReceive(); }, 1);
            }
        };

        this.sendMessage = function ( msg ) {
            if (self.connections.ws) {
                self.connections.ws.sendMessage(msg);
            }
            // todo: use direct post or webrtc async
        };

        this.queueMessage = function ( msg ) {
            this.queue.push(msg);
            // todo: drop QoS 0 messages that are waiting too long
        };

        this.disconnected = function( channel, reason ) {
            if (channel == 'ws') {
                // WebSocket was closed. Reset our connection.
                self.isSentConnect = false;
                self.isWaitConnack = false;
            }
        };

        /**
         * State functions
         */
        function isStateNew() {
            return !self.isSentConnect;
        }

        function isStateWaitingConnAck() {
            return self.isSentConnect && self.isWaitConnack;
        }

        function isStateConnected() {
            return !self.isWaitConnack;
        }


        /**
         * Receive the messages in the incoming message queue
         */
        function doReceive() {
            for (var i=0; i < self.receiveQueue; i++) {
                handleReceivedMessage( self.receiveQueue[i] );
            }
            self.receiveQueue = [];
            self.receiveTimer = false;
        }

        function handleReceivedMessage ( msg ) {
            switch (msg.type) {
                case 'connack':
                    if (!isStateWaitingConnAck()) {
                        console.log("Unexpected CONNACK");
                    }
                    self.isWaitConnack = false;
                    self.connectProps = msg.properties;
                    // 1. Start pinger for pingreq keep-alive interval
                    // 2. Check clean_start
                    break;
                case 'pingreq':
                    // Send pingresp
                    break;
                case 'pingresp':
                    // Reset keep-alive check
                    break;
                case 'disconnect':
                    self.isSentConnect = false;
                    self.isWaitConnack = false;
                    closeConnections();
                    break;
                default:
                    break;
            }
        };


        /**
         * Force all connections closed - happens on reveive of 'DISCONNECT'
         */
        function closeConnections() {
            for (k in self.connection) {
                self.connection[k].closeConnection();
            }
            self.connection = {};
        }
    }


    /*************************************************************************************************/
    /********************************* Connections using SSE and POST ********************************/
    /*************************************************************************************************/

    // ... todo ...

    /*************************************************************************************************/
    /********************************** Connections using Websocket **********************************/
    /*************************************************************************************************/

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
                socket.send( b.buffer );
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
            if (!isStateClosed()) {
                if (self.backoff > 0) {
                    self.backoff--;
                } else {
                    connect();
                }
            }
            setTimeout(function() { periodic() }, WS_PERIODIC_DELAY);
        }

        function handleError( reason ) {
            console.log("Closing websocket connection to "+self.remoteUrl+" due to "+reason);
            self.errorsSinceLastData++;
            if (isStateConnected()) {
                self.socket.close();
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
                if (self.socket.protocol == 'mqtt.cotonic.org') {
                    // Send ping and await pong to check channel.
                    self.randomPing = Uint8Array([
                        255, 254, 42, Math.floor(Math.random()*100), Math.floor(Math.random()*100)
                    ]),
                    socket.send( self.randomPing.buffer );
                    self.awaitPong = true;
                } else {
                    self.awaitPong = false;
                    self.session.connected('ws');
                }
                self.isConnected = true;
            };
            self.socket.onclose = function() {  self.isConnected = false; };
            self.socket.onerror = function() {  handleError('ws'); };
            self.socket.onmessage = function( message ) {
                if (message.data instanceof ArrayBuffer) {
                    var data = new Uint8Array(message.data);

                    if (self.awaitPong) {
                        if (equalData(data, self.randomPing)) {
                            self.awaitPong = false;
                            self.errorsSinceLastData = 0;
                            self.session.connected('ws');
                        } else {
                            handleError('pongdata');
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
            try {
                [ msg, rest ] = cotonic.mqtt_packet.decode(self.data);
                self.errorsSinceLastData = 0;
                self.data = rest;
                self.session.receiveMessage(msg);
                decodeReceivedData();
            } catch (e) {
                if (e != 'incomplete_packet') {
                    handleError(e);
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
            setTimeout( function() { connect(); }, WS_CONNECT_DELAY);
        }

        init();
    }

    // Publish the packet functions.
    cotonic.mqtt_transport = cotonic.mqtt_packet || {};
    cotonic.mqtt_transport.newSession = newSession;

}(cotonic));
