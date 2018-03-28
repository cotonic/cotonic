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

// TODO: Limit in-flight acks (both ways)
// TODO: Drop QoS 0 messages if sendQueue gets too large

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

    const MQTT_KEEP_ALIVE = 300;                  // Default PINGREQ interval in seconds
    const MQTT_SESSION_EXPIRY = 1800;             // Expire the session if we couldn't reconnect in 30 minutes

    const MQTT_RC_SUCCESS              = 0;
    const MQTT_RC_CLIENT_ID_INVALID    = 133;
    const MQTT_RC_PACKET_ID_IN_USE     = 145;
    const MQTT_RC_PACKET_ID_NOT_FOUND  = 146;

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
        this.connections = {};       // Websocket and other connections
        this.clientId = '';          // Assigned by server
        this.sendQueue = [];         // Queued outgoing messages
        this.receiveQueue = [];      // Queued incoming messages
        this.isSentConnect = false;
        this.isWaitConnack = false;
        this.isWaitPingResp = false;
        this.connectProps = {};
        this.keepAliveTimer = false;
        this.keepAliveInterval = MQTT_KEEP_ALIVE;
        this.packetId = 1;
        this.messageNr = 0;
        this.awaitingAck = {};
        this.awaitingRel = {};
        var self = this;

        this.connect = function( remote ) {
            if (remote == 'origin') {
                self.connections['ws'] = cotonic.mqtt_transport.ws.newTransport( remote, self );
                // TODO: also connect SSE and postback interface for fallback if ws not working
            } else {
                // TODO: add webRTC dataChannel for p2p
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
                    }, true);
                    if (self.isSentConnect) {
                        self.isWaitConnack = true;
                    }
                }
            }
        };

        this.publish = function( topic, payload, options ) {
            options = options || {};
            var encodedPayload;
            if (typeof payload == "undefined" || payload === null) {
                encodedPayload = new Uint8Array(0);
            } else {
                var contentType = options.content_type || guessContentType(payload);
                encodedPayload = encodePayload(payload, contentType);
                var props = options.properties || {};
                props.content_type = contentType;
            }
            var msg = {
                type: 'publish',
                topic: topic,
                payload: encodedPayload,
                qos: options.qos || 0,
                retain: options.retain || 0,
                properties: props
            };
            switch (msg.qos) {
                case 0:
                    break;
                case 1:
                    msg.packet_id = nextPacketId();
                    self.awaitingAck[msg.packet_id] = {
                        type: 'puback',
                        nr: self.messageNr++,
                        msg: msg
                    }
                    break;
                case 2:
                    msg.packet_id = nextPacketId();
                    self.awaitingAck[msg.packet_id] = {
                        type: 'pubrec',
                        nr: self.messageNr++,
                        msg: msg
                    }
                    break;
            }
            self.sendMessage(msg);
        };

        this.subscribe = function( topics, options ) {
            options = options || {};
            var props = options.properties || {};
            if (typeof topics == "string") {
                topics = [ { topic: topics } ];
            }
            var msg = {
                type: 'subscribe',
                packet_id: nextPacketId(),
                topics: topics,
                properties: props
            }
            self.awaitingAck[msg.packet_id] = {
                type: 'suback',
                nr: self.messageNr++,
                msg: msg
            }
            self.sendMessage(msg);
        };

        this.unsubscribe = function ( topics, options ) {
            options = options || {};
            if (typeof topics == "string") {
                topics = [ topics ];
            }
            var props = options.properties || {};
            var msg = {
                type: 'unsubscribe',
                packet_id: nextPacketId(),
                topics: topics,
                properties: props
            }
            self.awaitingAck[msg.packet_id] = {
                type: 'unsuback',
                nr: self.messageNr++,
                msg: msg
            }
            self.sendMessage(msg);
        }

        this.keepAlive = function() {
            if (isStateWaitingPingResp()) {
                closeConnections();
            } else {
                self.isWaitPingResp = true;
                self.sendMessage({ type: 'pingreq' });
            }
        }

        // Handle incoming message from another server or client
        this.receiveMessage = function ( msg ) {
            self.receiveQueue.push(msg);
            if (!self.receiveTimer) {
                self.receiveTimer = setTimeout(function() { doReceive(); }, 1);
            }
        };

        this.sendMessage = function ( msg, connecting ) {
            var isSent = false;
            var packetId;
            if (isStateConnected() || (connecting && isStateNew())) {
                isSent = self.sendTransport(msg);
            }
            if (!isSent) {
                self.queueMessage(msg);
            }
            return isSent;
        };

        this.sendTransport = function( msg ) {
            var isSent = false;
            for (var conn in self.connections) {
                if (!isSent) {
                    isSent = self.connections[conn].sendMessage(msg);
                }
            }
            return isSent;
        };

        this.queueMessage = function ( msg ) {
            switch (msg.type) {
                case 'pingresp':
                case 'pingreq':
                    break;
                default:
                    self.sendQueue.push(msg);
                    break;
            }
        };

        this.disconnected = function( channel, reason ) {
            // Use timeout so that all incoming messages are handled
            setTimeout(function() {
                if (isStateWaitingConnAck()) {
                    // Something wrong during the connect - start with a new session
                    self.clientId = '';
                }
                self.isSentConnect = false;
                self.isWaitConnack = false;
                self.keepAliveInterval = 0;
                stopKeepAliveTimer();
            });
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
            return self.isSentConnect && !self.isWaitConnack;
        }

        function isStateWaitingPingResp() {
            return self.isWaitPingResp && isStateConnected();
        }

        /**
         * Payload encoder/decoder
         */
        function encodePayload( payload, contentType ) {
            switch (contentType) {
                case "binary/octet-stream":
                    return payload;
                case "text/plain":
                    return payload;
                case "text/x-integer":
                case "text/x-number":
                    return payload.toString();
                case "text/x-datetime":
                    return payload.toJSON();
                case "application/json":
                    return JSON.stringify(payload);
                default:
                    return payload;
            }
        }

        function decodePayload( payload, contentType ) {
            switch (contentType) {
                case "text/plain":
                    return cotonic.mqtt_packet.UTF8ToString(payload);
                case "text/x-integer":
                    return parseInt(cotonic.mqtt_packet.UTF8ToString(payload), 10);
                case "text/x-number":
                    return Number(cotonic.mqtt_packet.UTF8ToString(payload));
                case "text/x-datetime":
                    return new Date(cotonic.mqtt_packet.UTF8ToString(payload));
                case "application/json":
                    return JSON.parse(cotonic.mqtt_packet.UTF8ToString(payload));
                case "binary/octet-stream":
                    return payload;
                default:
                    if (payload.length == 0) {
                        return undefined;
                    }
                    return payload;
            }
        }

        function guessContentType( payload ) {
            switch (typeof(payload)) {
                case "string":
                    return "text/plain";
                case "number":
                    if (Number.isInteger(payload)) {
                        return "text/x-integer";
                    }
                    return "text/x-number";
                case "object":
                    if (payload === null) {
                        return undefined;
                    } if (payload instanceof Date) {
                        return "text/x-datetime";
                    } else if (typeof payload.BYTES_PER_ELEMENT == "number") {
                        return "binary/octet-stream";
                    }
                    return "application/json";
                default:
                    console.log("Do not know how to serialize a ", typeof(payload));
                    return "application/json";
            }
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
            self.isPacketReceived = true;
        }

        function resetKeepAliveTimer() {
            stopKeepAliveTimer();
            if (self.keepAliveInterval > 0) {
                self.keepAliveTimer = setInterval(function() { self.keepAlive(); }, self.keepAliveInterval * 1000);
            }
        }

        function stopKeepAliveTimer() {
            if (self.keepAliveTimer) {
                clearTimeout(self.keepAliveTimer);
                self.keepAliveTimer = false;
            }
            self.isWaitPingResp = false;
        }


        // Cleanup the sendQueue - remove:
        // - publish with QoS > 0
        // - ack messages
        // - expired publish (QoS 0) [TODO]
        function cleanupSendQueue() {
            var q = [];
            for (var k in self.sendQueue) {
                var msg = self.sendQueue[k];
                switch (msg.type) {
                    case 'publish':
                        if (msg.qos == 0) {
                            q.push(msg);
                        }
                        break;
                    default:
                        break;
                }
            }
            self.sendQueue = q;
        }

        // Send all queued messages
        function sendQueuedMessages() {
            var queue = self.sendQueue;
            self.sendQueue = [];
            for (var k = 0; k < queue.length; k++) {
                self.sendMessage(queue[k]);
            }
        }

        // Resend unacknowledged publish (QoS > 0) and pubrec messages
        function resendUnacknowledged() {
            var msgs = [];
            for (var packetId in self.awaitingAck) {
                var unack = self.awaitingAck[packetId];
                var msg;
                switch (unack.type) {
                    case 'puback':
                    case 'pubrec':
                        msg = unack.msg;
                        msg.dup = true;
                        msgs.push({ nr: unack.nr, msg: msg });
                        break;
                    case 'unsuback':
                    case 'suback':
                        msg = unack.msg;
                        msgs.push({ nr: unack.nr, msg: msg });
                        break;
                    case 'pubcomp':
                        msg = {
                            type: 'pubrec',
                            packet_id: packetId
                        };
                        msgs.push({ nr: unack.nr, msg: msg });
                        break;
                    default:
                        console.log("Unknown type in awaitingAck", unack);
                        break;
                }
            }
            msgs.sort(function(a, b) { a.nr - b.nr });
            for (var k in msgs) {
                self.sendMessage(msgs[k].msg);
            }
        }

        function handleReceivedMessage ( msg ) {
            var replyMsg;

            console.log(msg);
            switch (msg.type) {
                case 'connack':
                    if (!isStateWaitingConnAck()) {
                        console.log("Unexpected CONNACK", msg);
                    }
                    self.isWaitConnack = false;
                    switch (msg.reason_code) {
                        case MQTT_RC_SUCCESS:
                            self.connectProps = msg.properties;
                            if (msg.properties.assigned_client_identifier) {
                                self.clientId = msg.properties.assigned_client_identifier;
                            }
                            cleanupSendQueue();
                            if (msg.session_present) {
                                // Resend pending connack and connrel messages
                                resendUnacknowledged();
                            } else {
                                self.clientId = msg.properties.assigned_client_identifier;
                                self.awaitingRel = {};
                                self.awaitingAck = {};
                                // TODO: relay that we need to resubscribe to bridge
                            }
                            if (typeof self.connectProps.server_keep_alive == "number") {
                                self.keepAliveInterval = self.connectProps.server_keep_alive;
                            } else {
                                self.keepAliveInterval = MQTT_KEEP_ALIVE;
                            }
                            resetKeepAliveTimer();
                            sendQueuedMessages();
                            break;
                        case MQTT_RC_CLIENT_ID_INVALID:
                            self.clientId = '';
                            break;
                        default:
                            break;
                    }
                    break;
                case 'puback':
                    // TODO relay status to bridge
                    if (self.awaitingAck[msg.packet_id]) {
                        if (self.awaitingAck[msg.packet_id].type != 'puback') {
                            console.log("MQTT: Unexpected puback for ", self.awaitingAck[msg.packet_id])
                        }
                        delete self.awaitingAck[msg.packet_id];
                    } else {
                        console.log("MQTT: puback for unknown packet_id", msg.packet_id);
                    }
                    break;
                case 'pubrec':
                    // TODO relay status to bridge
                    if (msg.reason_code < 0x80) {
                        if (self.awaitingAck[msg.packet_id]) {
                            if (self.awaitingAck[msg.packet_id].type != 'pubrec') {
                                console.log("MQTT: Unexpected pubrec for ", self.awaitingAck[msg.packet_id])
                            }
                            self.awaitingAck[msg.packet_id].type = 'pubcomp';
                            self.awaitingAck[msg.packet_id].msg = undefined;
                            replyMsg = { type: 'pubrel', packet_id: msg.packet_id };
                        } else {
                            replyMsg = { type: 'pubrel', packet_id: msg.packet_id, reason_code: MQTT_RC_PACKET_ID_NOT_FOUND };
                        }
                    } else {
                        if (self.awaitingAck[msg.packet_id]) {
                            delete self.awaitingAck[msg.packet_id];
                        }
                    }
                    break;
                case 'pubcomp':
                    // TODO relay status to bridge
                    if (self.awaitingAck[msg.packet_id]) {
                        if (self.awaitingAck[msg.packet_id].type != 'pubcomp') {
                            console.log("MQTT: Unexpected pubcomp for ", self.awaitingAck[msg.packet_id])
                        }
                        delete self.awaitingAck[msg.packet_id];
                    }
                    break;
                case 'suback':
                    // TODO: relay status to bridge
                    if (self.awaitingAck[msg.packet_id]) {
                        if (self.awaitingAck[msg.packet_id].type != 'suback') {
                            console.log("MQTT: Unexpected suback for ", self.awaitingAck[msg.packet_id])
                        }
                        delete self.awaitingAck[msg.packet_id];
                    }
                    break;
                case 'unsuback':
                    // TODO: relay status to bridge
                    if (self.awaitingAck[msg.packet_id]) {
                        if (self.awaitingAck[msg.packet_id].type != 'unsuback') {
                            console.log("MQTT: Unexpected unsuback for ", self.awaitingAck[msg.packet_id])
                        }
                        delete self.awaitingAck[msg.packet_id];
                    }
                    break;
                case 'publish':
                    var isPubOk = false;
                    var await;
                    switch (msg.qos) {
                        case 0:
                            isPubOk = true;
                            break;
                        case 1:
                            if (self.awaitingRel[msg.packet_id]) {
                                replyMsg = {
                                    type: 'puback',
                                    packet_id: msg.packet_id,
                                    reason_code: MQTT_RC_PACKET_IN_USE
                                }
                            } else {
                                isPubOk = true;
                                replyMsg = {
                                    type: 'puback',
                                    packet_id: msg.packet_id
                                }
                            }
                            break;
                        case 2:
                            replyMsg = {
                                type: 'pubrec',
                                packet_id: msg.packet_id
                            };
                            if (self.awaitingRel[msg.packet_id]) {
                                await = self.awaitingRel[msg.packet_id];
                                replyMsg.reason_code = await.reason_code;
                            } else {
                                isPubOk = true;
                            }
                            self.awaitingRel[msg.packet_id] = {
                                type: 'pubrel',
                                nr: self.messageNr++
                            }
                    }
                    if (isPubOk) {
                        var ct = msg.properties.content_type;
                        msg.payload = decodePayload(msg.payload, ct);
                        // TODO: relay received message to bridge
                        if (replyMsg) {
                            replyMsg.reason_code = MQTT_RC_SUCCESS;
                        }
                        if (await) {
                            await.reason_code = MQTT_RC_SUCCESS;
                        }
                    }
                    break;
                case 'pubrel':
                    if (self.awaitingRel[msg.packet_id]) {
                        delete self.awaitingRel[msg.packet_id];
                        replyMsg = {
                            type: 'pubcomp',
                            packet_id: msg.packet_id
                        };
                    } else {
                        replyMsg = {
                            type: 'pubcomp',
                            packet_id: msg.packet_id,
                            reason_code: MQTT_RC_PACKET_ID_NOT_FOUND
                        };
                    }
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
                case 'auth':
                    // TODO: pass AUTH message to the runtime for re-authentication
                default:
                    break;
            }
            if (replyMsg) {
                setTimeout(function() { self.sendMessage(replyMsg); }, 0);
            }
        };


        /**
         * Force all connections closed - happens on:
         * - receive of 'DISCONNECT'
         * - keep-alive timeout
         */
        function closeConnections() {
            for (k in self.connection) {
                self.connection[k].closeConnection();
            }
            self.connection = {};
            self.isWaitPingResp = false;
            self.isSentConnect = false;
            self.isWaitConnack = false;
            self.keepAliveInterval = 0;
            stopKeepAliveTimer();
        }

        /**
         * Set the packetId to the next unused number
         */
        function nextPacketId() {
            do {
                self.packetId++;
                if (self.packetId > 65535) {
                    self.packetId = 1;
                }
            } while (self.awaitingAck[self.packetId]);
            return self.packetId;
        }
    }

    // Publish the MQTT session functions.
    cotonic.mqtt_session = cotonic.mqtt_session || {};
    cotonic.mqtt_session.newSession = newSession;
    cotonic.mqtt_session.findSession = findSession;

}(cotonic));
