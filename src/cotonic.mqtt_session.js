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

// TODO: change this into a web-worker

// TODO: Limit in-flight acks (both ways)
// TODO: Drop QoS 0 messages if sendQueue gets too large
// TODO: add support for WebRTC and SSE+post

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

    const MQTT_RC_SUCCESS                  = 0;
    const MQTT_RC_DISCONNECT_WITH_WILL     = 4;
    const MQTT_RC_CLIENT_ID_INVALID        = 133;
    const MQTT_RC_BAD_USERNAME_OR_PASSWORD = 134;
    const MQTT_RC_PACKET_ID_IN_USE         = 145;
    const MQTT_RC_PACKET_ID_NOT_FOUND      = 146;

    var newSession = function( remote, bridgeTopics ) {
        remote = remote || 'origin';
        if (sessions[ remote ]) {
            return sessions[remote];
        } else {
            var ch = new mqttSession(bridgeTopics);
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
    function mqttSession( mqttBridgeTopics ) {
        this.bridgeTopics = mqttBridgeTopics;   // mqtt_bridge responsible for this session
        this.connections = {};                  // Websocket and other connections
        this.clientId = '';                     // Assigned by server
        this.sendQueue = [];                    // Queued outgoing messages
        this.receiveQueue = [];                 // Queued incoming messages
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
        this.authUserPassword = { username: '', password: '' };

        var self = this;

        /**
         * A message sent from the bridge, to be relayed to the server
         * The bridge took care of rewriting topics
         */
        function sessionToRemote( msg ) {
            switch (msg.payload.type) {
                case "publish":
                    publish(msg.payload);
                    break;
                case "subscribe":
                    subscribe(msg.payload);
                    break;
                case "unsubscribe":
                    unsubscribe(msg.payload);
                    break;
                case "auth":
                    self.sendMessage(msg.payload);
                    break;
                default:
                    // Error: unknown msg to relay
                    break;
            }
        }

        /**
         * Relay a publish to the bridge, the bridge will rewrite the topic
         * and republish it locally.
         */
        function sessionToBridge( msg ) {
            localPublish(self.bridgeTopics.session_in, msg);
        }

        /**
         * Control messages from the bridge for this session
         */
        function sessionControl( msg ) {
        }

        /**
         * Start a transport to the remote
         * Called by the bridge or other components that manage a MQTT connection
         */
        this.connect = function( remote ) {
            if (remote == 'origin') {
                self.connections['ws'] = cotonic.mqtt_transport.ws.newTransport( remote, self );
                // TODO: also start SSE+postback transport for fallback if ws not working
            } else {
                // TODO: start webRTC dataChannel for p2p
            }
        };

        /**
         * Called by a transport after it has established a data-connection
         * Send the MQTT 'connect' message to establish a MQTT session over
         * the data-connection.
         */
        this.connected = function ( transportName ) {
            // Connection established - try to send out 'connect'
            if (transportName == 'ws') {
                if (isStateNew()) {
                    let connectMessage = {
                        type: 'connect',
                        client_id: self.clientId,
                        clean_start: self.clientId === '',
                        keep_alive: MQTT_KEEP_ALIVE,
                        username: self.authUserPassword.username,
                        password: self.authUserPassword.password,
                        properties: {
                            session_expiry_interval: MQTT_SESSION_EXPIRY
                        }
                    };
                    self.isSentConnect = self.sendMessage(connectMessage, true);
                    if (self.isSentConnect) {
                        self.isWaitConnack = true;
                    }
                }
            }
        };

        this.reconnectWithUsernamePassword = function ( username, password ) {
            self.authUserPassword.username = username;
            self.authUserPassword.password = password;
            disconnect();
        };

        function disconnect () {
            let msg = {
                type: 'disconnect',
                reason_code: MQTT_RC_DISCONNECT_WITH_WILL
            };
            self.sendMessage(msg);
            self.clientId = '';
        };

        function publish( pubmsg ) {
            const payload = pubmsg.payload;
            let properties = pubmsg.properties || {}
            let encodedPayload;

            if (typeof payload == "undefined" || payload === null) {
                encodedPayload = new Uint8Array(0);
            } else {
                let contentType = properties.content_type || guessContentType(payload);
                encodedPayload = encodePayload(payload, contentType);
                properties.content_type = contentType;
            }
            let msg = {
                type: 'publish',
                topic: pubmsg.topic,
                payload: encodedPayload,
                qos: pubmsg.qos || 0,
                retain: pubmsg.retain || 0,
                properties: properties
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

        function subscribe( submsg ) {
            let topics = submsg.topics;
            if (typeof topics == "string") {
                topics = [ { topic: topics } ];
            }
            var msg = {
                type: 'subscribe',
                packet_id: nextPacketId(),
                topics: topics,
                properties: submsg.properties || {}
            }
            self.awaitingAck[msg.packet_id] = {
                type: 'suback',
                nr: self.messageNr++,
                msg: msg
            }
            self.sendMessage(msg);
        };

        function unsubscribe ( unsubmsg ) {
            let topics = unsubmsg.topics;
            if (typeof topics == "string") {
                topics = [ topics ];
            }
            var msg = {
                type: 'unsubscribe',
                packet_id: nextPacketId(),
                topics: topics,
                properties: unsubmsg.properties || {}
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
                            // Forget the username/password (if any)
                            self.authUserPassword.username = '';
                            self.authUserPassword.password = '';

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
                            }
                            if (typeof self.connectProps.server_keep_alive == "number") {
                                self.keepAliveInterval = self.connectProps.server_keep_alive;
                            } else {
                                self.keepAliveInterval = MQTT_KEEP_ALIVE;
                            }
                            resetKeepAliveTimer();
                            sendQueuedMessages();

                            // Relay the connack to the bridge (might need to resubscribe)
                            publishStatus(true);
                            sessionToBridge({
                                type: "connack",
                                is_connected: true,
                                client_id: self.clientId,
                                connack: msg
                            });
                            break;
                        case MQTT_RC_BAD_USERNAME_OR_PASSWORD:
                            // Bad credentials, retry anonymous
                            self.authUserPassword.username = '';
                            self.authUserPassword.password = '';
                        case MQTT_RC_CLIENT_ID_INVALID:
                            // On next retry let the server pick a client id.
                            self.clientId = '';
                        default:
                            publishStatus(false);
                            sessionToBridge({
                                type: "connack",
                                is_connected: false,
                                connack: msg
                            });
                            break;
                    }
                    break;
                case 'puback':
                    if (self.awaitingAck[msg.packet_id]) {
                        if (self.awaitingAck[msg.packet_id].type != 'puback') {
                            console.log("MQTT: Unexpected puback for ", self.awaitingAck[msg.packet_id])
                        } else {
                            // TODO: associate the original publish command
                            // sessionToBridge(msg);
                        }
                        delete self.awaitingAck[msg.packet_id];
                    } else {
                        console.log("MQTT: puback for unknown packet_id", msg.packet_id);
                    }
                    break;
                case 'pubrec':
                    if (self.awaitingAck[msg.packet_id]) {
                        // TODO: associate the original publish command
                        // sessionToBridge(msg);
                    }
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
                    if (self.awaitingAck[msg.packet_id]) {
                        if (self.awaitingAck[msg.packet_id].type != 'pubcomp') {
                            console.log("MQTT: Unexpected pubcomp for ", self.awaitingAck[msg.packet_id])
                        }
                        delete self.awaitingAck[msg.packet_id];
                    }
                    break;
                case 'suback':
                    if (self.awaitingAck[msg.packet_id]) {
                        if (self.awaitingAck[msg.packet_id].type != 'suback') {
                            console.log("MQTT: Unexpected suback for ", self.awaitingAck[msg.packet_id])
                        } else {
                            let ackMsg = {
                                type: 'suback',
                                topics: self.awaitingAck[msg.packet_id].topics,
                                acks: msg.acks
                            };
                            sessionToBridge(ackMsg);
                        }
                        delete self.awaitingAck[msg.packet_id];
                    }
                    break;
                case 'unsuback':
                    if (self.awaitingAck[msg.packet_id]) {
                        if (self.awaitingAck[msg.packet_id].type != 'unsuback') {
                            console.log("MQTT: Unexpected unsuback for ", self.awaitingAck[msg.packet_id])
                        } else {
                            let ackMsg = {
                                type: 'unsuback',
                                topics: self.awaitingAck[msg.packet_id].topics,
                                acks: msg.acks
                            };
                            sessionToBridge(msg);
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

                        sessionToBridge(msg);

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
                    sessionToBridge(msg);
                    break;
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
            publishStatus(false);
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

        /**
         * Publish a message to the broker
         */
        function localPublish( topic, msg, opts ) {
            cotonic.broker.publish(topic, msg, opts);
        }

        /**
         * Subscribe to a topic on the broker
         */
        function localSubscribe( topic, callback ) {
            cotonic.broker.subscribe(topic, callback);
        }

        /**
         * Publish the current connection status
         */
        function publishStatus( isConnected ) {
            localPublish(
                self.bridgeTopics.session_status,
                { is_connected: isConnected },
                { retain: true });
        }

        /**
         * Initialize, connect to local topics
         */
        function init() {
            console.log(self.bridgeTopics);
            publishStatus( false );
            localSubscribe(self.bridgeTopics.session_out, sessionToRemote);
            localSubscribe(self.bridgeTopics.session_control, sessionControl);
        }

        init();
    }

    // Publish the MQTT session functions.
    cotonic.mqtt_session = cotonic.mqtt_session || {};
    cotonic.mqtt_session.newSession = newSession;
    cotonic.mqtt_session.findSession = findSession;

}(cotonic));
