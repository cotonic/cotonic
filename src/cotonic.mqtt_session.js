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

    var MQTT_KEEP_ALIVE = 300;                  // Default PINGREQ interval in seconds
    var MQTT_SESSION_EXPIRY = 1800;             // Expire the session if we couldn't reconnect in 30 minutes

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
        this.isWaitPingResp = false;
        this.connectProps = {};
        this.keepAliveTimer = false;
        this.keepAliveInterval = MQTT_KEEP_ALIVE;
        var self = this;

        this.connect = function( remote ) {
            if (remote == 'origin') {
                self.connections['ws'] = cotonic.mqtt_transport.ws.newTransport( remote, self );
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
                        clean_start: self.clientId === '',
                        keep_alive: MQTT_KEEP_ALIVE,
                        properties: {
                            session_expiry_interval: MQTT_SESSION_EXPIRY
                        }
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

        this.keepAlive = function() {
            if (isStateWaitingPingResp()) {
                if (isStateConnected() || isStateWaitingConnAck()) {
                    closeConnections();
                }
            } else {
                self.isWaitPingResp = true;
                self.sendMessage({ type: 'pingreq' });
                resetKeepAliveTimer();
            }
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
                return true;
            }
            // todo: use direct post or webrtc async
            return false;
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

        function isStateWaitingPingResp() {
            return self.isWaitPingResp && isStateConnected();
        }

        /**
         * Receive the messages in the incoming message queue
         */
        function doReceive() {
            for (var i=0; i < self.receiveQueue.length; i++) {
                handleReceivedMessage( self.receiveQueue[i] );
            }
            self.receiveQueue = [];
            self.receiveTimer = false;
            resetKeepAliveTimer();
        }

        function resetKeepAliveTimer() {
            if (self.keepAliveTimer) {
                clearTimeout(self.keepAliveTimer);
            }
            self.keepAliveTimer = setTimeout(function() { self.keepAlive(); }, self.keepAliveInterval * 1000);
        }

        function handleReceivedMessage ( msg ) {
            console.log(msg);
            switch (msg.type) {
                case 'connack':
                    if (!isStateWaitingConnAck()) {
                        console.log("Unexpected CONNACK");
                    }
                    self.isWaitConnack = false;
                    self.connectProps = msg.properties;
                    if (self.connectProps.assigned_client_identifier) {
                        self.clientId = self.connectProps.assigned_client_identifier;
                    }
                    // Reset keep-alive timer
                    if (typeof self.connectProps.server_keep_alive == "number") {
                        self.keepAliveInterval = self.connectProps.server_keep_alive;
                    } else {
                        self.keepAliveInterval = MQTT_KEEP_ALIVE;
                    }
                    resetKeepAliveTimer();
                    // Resent pending connack and connrel messages
                    // Sent queued messages
                    // Check clean_start - resubscribe if set
                    // TODO
                    break;
                case 'pingreq':
                    self.sendMessage({ type: 'pingresp' });
                    break;
                case 'pingresp':
                    self.isWaitPingResp = false;
                    break;
                case 'disconnect':
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
            self.isWaitPingResp = false;
            self.isSentConnect = false;
            self.isWaitConnack = false;
        }
    }

    // Publish the packet functions.
    cotonic.mqtt_session = cotonic.mqtt_session || {};
    cotonic.mqtt_session.newSession = newSession;
    cotonic.mqtt_session.findSession = findSession;

}(cotonic));
