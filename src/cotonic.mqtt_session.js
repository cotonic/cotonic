/**
 * Copyright 2018-2023 The Cotonic Authors. All Rights Reserved.
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

import { publish as brokerPublish, subscribe as brokerSubscribe, call as brokerCall } from "./cotonic.broker.js";
import { UTF8ToString } from "./cotonic.mqtt_packet.js";
import { newTransport as newWSTransport } from "./cotonic.mqtt_transport.ws.js";

const console = globalThis.console;

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
const sessions = {};

const MQTT_KEEP_ALIVE = 300;                  // Default PINGREQ interval in seconds
const MQTT_SESSION_EXPIRY = 1800;             // Expire the session if we couldn't reconnect in 30 minutes

const MQTT_RC_SUCCESS                  = 0;
const MQTT_RC_DISCONNECT_WITH_WILL     = 4;
const MQTT_RC_CLIENT_ID_INVALID        = 133;
const MQTT_RC_BAD_USERNAME_OR_PASSWORD = 134;
const MQTT_RC_PACKET_ID_IN_USE         = 145;
const MQTT_RC_PACKET_ID_NOT_FOUND      = 146;

function newSession( remote, bridgeTopics, options ) {
    remote = remote || 'origin';
    if (sessions[remote]) {
        return sessions[remote];
    } else {
        const ch = new mqttSession(bridgeTopics);
        sessions[remote] = ch;
        ch.connect(remote, options);
        return ch;
    }
};

function findSession( remote ) {
    remote = remote || 'origin';
    return sessions[remote];
};

function deleteSession( remote ) {
    remote = remote || 'origin';

    delete sessions[remote];
};

function init() {
    /**
     * Called if the authentication on the origin connection is changing
     */
    brokerSubscribe('model/auth/event/auth-changing', function(_msg) {
        if (sessions['origin']) {
            sessions['origin'].disconnect( MQTT_RC_DISCONNECT_WITH_WILL );
        }
    });

    /**
     * Called if a new origin identity has been established
     */
    brokerSubscribe('model/auth/event/auth-user-id', function(_msg) {
        if (sessions['origin']) {
            sessions['origin'].reconnect('origin');
        }
    });

    /**
     * Called if there are new language / timezone preferences
     */
    brokerSubscribe("model/auth/event/auth", function(msg) {
        if (typeof msg.payload == 'object') {
            if (sessions['origin'] && sessions['origin'].isConnected()) {
                const data = {
                    user_id: msg.payload.user_id,
                    options: msg.payload.options || {},
                    preferences: msg.payload.preferences || {}
                }
                const topic = 'bridge/origin/$client/' + sessions['origin'].clientId + "/auth";
                brokerPublish(topic, data, { qos: 0 });
            }
        }
    });


    /**
     * Called if the cotonic-sid changes.
     */
    brokerSubscribe("model/sessionId/event", function(msg) {
        if (typeof msg.payload == 'string') {
            if (sessions['origin'] && sessions['origin'].isConnected()) {
                const data = {
                    options: { sid: msg.payload }
                }
                const topic = 'bridge/origin/$client/' + sessions['origin'].clientId + "/sid";
                brokerPublish(topic, data, { qos: 0 });
            }
        }
    });
}


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
    this.routingId = undefined;             // Assigned by server, use 'undefined' as in mqtt_bridge.
    this.cleanStart = true;
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
    this.authUserPassword = { username: undefined, password: undefined };
    this.disconnectReason = '';

    /**
     * A message sent from the bridge, to be relayed to the server
     * The bridge took care of rewriting topics
     */
    const sessionToRemote = ( msg ) => {
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
                this.sendMessage(msg.payload);
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
    const sessionToBridge = ( msg ) => {
        localPublish(this.bridgeTopics.session_in, msg);
    }

    /**
     * Control messages from the bridge for this session
     */
    const sessionControl = ( _msg ) => {
    }

    /**
     * Start a transport to the remote
     * Called by the bridge or other components that manage a MQTT connection
     */
    this.connect = ( remote, options ) => {
        options = options || {};
        if (typeof options.client_id === "string") {
            this.clientId = options.client_id;
        }
        if (typeof options.clean_start === "boolean") {
            this.cleanStart = options.clean_start;
        }
        if (typeof options.username === "string") {
            this.authUserPassword.username = options.username;
            this.authUserPassword.password = options.password || undefined;
        }
        this.connections['ws'] = newWSTransport( remote, this, options );
    };

    this.disconnect = (reasonCode) => {
        if(reasonCode === undefined) {
            reasonCode = MQTT_RC_SUCCESS;
        }

        const msg = {
            type: 'disconnect',
            reason_code: reasonCode
        };
            
        this.sendMessage(msg);
        this.clientId = '';

        if(reasonCode === MQTT_RC_SUCCESS) {
            const transport = this.connections['ws'];
            if(transport) {
                transport.closeConnection();
                delete this.connections['ws'];
                publishStatus(false);
            }
        }

        sessionToBridge({type: "disconnect"});
    };

    this.reconnect = ( remote ) => {
        if (remote == 'origin' && this.connections['ws']) {
            this.connections['ws'].openConnection();
        }
    };

    this.isConnected = () => {
        return isStateConnected();
    };

    /**
     * Called by a transport after it has established a data-connection
     * Send the MQTT 'connect' message to establish a MQTT session over
     * the data-connection.
     */
    this.connected = ( transportName ) => {
        // Connection established - try to send out 'connect'
        if (transportName === 'ws') {
            if (isStateNew()) {
                brokerCall("model/sessionId/get")
                    .then((msg) => {
                        const connectMessage = {
                            type: 'connect',
                            client_id: this.clientId,
                            clean_start: this.cleanStart,
                            keep_alive: MQTT_KEEP_ALIVE,
                            username: this.authUserPassword.username,
                            password: this.authUserPassword.password,
                            properties: {
                                session_expiry_interval: MQTT_SESSION_EXPIRY,
                                cotonic_sid: msg.payload
                            }
                        };
                        this.isSentConnect = this.sendMessage(connectMessage, true);
                        if (this.isSentConnect) {
                            this.isWaitConnack = true;
                        }
                    });
            }
        }

        publishEvent("transport/connected");
    };

    const publish = ( pubmsg ) => {
        const payload = pubmsg.payload;
        const properties = pubmsg.properties || {};
        let encodedPayload;

        if (typeof payload == "undefined" || payload === null) {
            encodedPayload = new Uint8Array(0);
        } else {
            const contentType = properties.content_type || guessContentType(payload);
            encodedPayload = encodePayload(payload, contentType);
            properties.content_type = contentType;
        }
        const msg = {
            type: 'publish',
            topic: pubmsg.topic,
            payload: encodedPayload,
            qos: pubmsg.qos || 0,
            retain: pubmsg.retain || 0,
            properties: properties
        };
        this.sendMessage(msg);
    }

    const subscribe = ( submsg ) => {
        let topics = submsg.topics;
        if (typeof topics == "string") {
            topics = [ { topic: topics } ];
        }
        const msg = {
            type: 'subscribe',
            packet_id: nextPacketId(),
            topics: topics,
            properties: submsg.properties || {}
        };
        this.awaitingAck[msg.packet_id] = {
            type: 'suback',
            nr: this.messageNr++,
            msg: msg
        };
        this.sendMessage(msg);
    }

    const unsubscribe = ( unsubmsg ) => {
        let topics = unsubmsg.topics;
        if (typeof topics == "string") {
            topics = [ topics ];
        }
        const msg = {
            type: 'unsubscribe',
            packet_id: nextPacketId(),
            topics: topics,
            properties: unsubmsg.properties || {}
        };
        this.awaitingAck[msg.packet_id] = {
            type: 'unsuback',
            nr: this.messageNr++,
            msg: msg
        };
        this.sendMessage(msg);
    }

    this.keepAlive = () => {
        if (isStateWaitingPingResp()) {
            closeConnections();
        } else {
            this.isWaitPingResp = true;
            this.sendMessage({ type: 'pingreq' });
        }
    };

    // Handle incoming message from another server or client
    this.receiveMessage = ( msg ) => {
        this.receiveQueue.push(msg);
        if (!this.receiveTimer) {
            this.receiveTimer = setTimeout(() => { doReceive(); }, 1);
        }
    };

    this.sendMessage = ( msg, connecting ) => {
        let isSent = false;
        if (isStateConnected() || (connecting && isStateNew())) {
            switch (msg.type) {
                case 'subscribe':
                    msg.packet_id = nextPacketId(),
                        this.awaitingAck[msg.packet_id] = {
                            type: 'suback',
                            nr: this.messageNr++,
                            msg: msg
                        };
                    break;
                case 'publish':
                    switch (msg.qos) {
                        case 0:
                            break;
                        case 1:
                            msg.packet_id = nextPacketId();
                            this.awaitingAck[msg.packet_id] = {
                                type: 'puback',
                                nr: this.messageNr++,
                                msg: msg
                            };
                            break;
                        case 2:
                            msg.packet_id = nextPacketId();
                            this.awaitingAck[msg.packet_id] = {
                                type: 'pubrec',
                                nr: this.messageNr++,
                                msg: msg
                            };
                            break;
                    }
                    break;
                default:
                    break;
            }
            isSent = this.sendTransport(msg);
        }
        if (!isSent) {
            this.queueMessage(msg);
        }
        return isSent;
    };

    this.sendTransport = ( msg ) => {
        let isSent = false;
        for (const conn in this.connections) {
            if (!isSent) {
                isSent = this.connections[conn].sendMessage(msg);
            }
        }
        return isSent;
    };

    this.queueMessage = ( msg ) => {
        switch (msg.type) {
            case 'pingresp':
            case 'pingreq':
                break;
            default:
                this.sendQueue.push(msg);
                break;
        }
    };

    this.disconnected = ( ) => {
        // Use timeout so that all incoming messages are handled
        setTimeout(() => {
            if (isStateWaitingConnAck()) {
                // Something wrong during the connect - start with a new session
                    this.clientId = '';
            }
            this.isSentConnect = false;
            this.isWaitConnack = false;
            this.keepAliveInterval = 0;
            stopKeepAliveTimer();
        });

        publishEvent("transport/disconnected");
    };

    /**
     * State functions
     */
    const isStateNew = () => {
        return !this.isSentConnect;
    }

    const isStateWaitingConnAck = () => {
        return this.isSentConnect && this.isWaitConnack;
    }

    const isStateConnected = () => {
        return this.isSentConnect && !this.isWaitConnack;
    }

    const isStateWaitingPingResp = () => {
        return this.isWaitPingResp && isStateConnected();
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
                return UTF8ToString(payload);
            case "text/x-integer":
                return parseInt(UTF8ToString(payload), 10);
            case "text/x-number":
                return Number(UTF8ToString(payload));
            case "text/x-datetime":
                return new Date(UTF8ToString(payload));
            case "application/json":
                return JSON.parse(UTF8ToString(payload));
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
            case "boolean":
                return "application/json";
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
    const doReceive = () => {
        for (let i=0; i < this.receiveQueue.length; i++) {
            handleReceivedMessage( this.receiveQueue[i] );
        }
        this.receiveQueue = [];
        this.receiveTimer = false;
        this.isPacketReceived = true;
    }

    const resetKeepAliveTimer = () => {
        stopKeepAliveTimer();
        if (this.keepAliveInterval > 0) {
            this.keepAliveTimer = setInterval(() => { this.keepAlive(); }, this.keepAliveInterval * 1000);
        }
    }

    const stopKeepAliveTimer = () => {
        if (this.keepAliveTimer) {
            clearTimeout(this.keepAliveTimer);
            this.keepAliveTimer = false;
        }
        this.isWaitPingResp = false;
    }


    // Cleanup the sendQueue - remove:
    // - rewrite response topics to use the new routingId
    // - publish with QoS > 0
    // - ack messages
    // - expired publish (QoS 0) [TODO]
    const cleanupSendQueue = (previousRoutingId) => {
        const previousBridgePrefix = "bridge/" + previousRoutingId + "/";
        const bridgePrefix = "bridge/" + this.routingId + "/";
        const q = [];

        for (const k in this.sendQueue) {
            const msg = this.sendQueue[k];
            switch (msg.type) {
                case 'publish':
                    if (   msg.properties
                        && msg.properties.response_topic
                        && msg.properties.response_topic.startsWith(previousBridgePrefix)) {
                        msg.properties.response_topic = msg.properties.response_topic.replace(previousBridgePrefix, bridgePrefix)
                    }
                    if (msg.qos > 0) {
                        q.push(msg);
                    }
                    break;
                default:
                    break;
            }
        }
        this.sendQueue = q;
    }

    // Send all queued messages
    const sendQueuedMessages = () => {
        const queue = this.sendQueue;
        this.sendQueue = [];
        for (let k = 0; k < queue.length; k++) {
            this.sendMessage(queue[k]);
        }
    }

    // Resend unacknowledged publish (QoS > 0) and pubrec messages
    const resendUnacknowledged = () => {
        const msgs = [];
        for (const packetId in this.awaitingAck) {
            const unack = this.awaitingAck[packetId];
            let msg;
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
        msgs.sort(function(a, b) { return a.nr - b.nr; });
        for (const k in msgs) {
            this.sendMessage(msgs[k].msg);
        }
    }

    const handleReceivedMessage = ( msg ) => {
        let replyMsg;

        switch (msg.type) {
            case 'connack':
                if (!isStateWaitingConnAck()) {
                    console.log("Unexpected CONNACK", msg);
                }
                this.isWaitConnack = false;
                switch (msg.reason_code) {
                    case MQTT_RC_SUCCESS:
                        {
                            const previousRoutingId = this.routingId;
                            this.connectProps = msg.properties;

                            // Optional client-id, assigned by the server
                            if (msg.properties.assigned_client_identifier) {
                                this.clientId = msg.properties.assigned_client_identifier;
                            }
                            // Optional routing-id, assigned by the server
                            if (msg.properties['cotonic-routing-id']) {
                                this.routingId = msg.properties['cotonic-routing-id'];
                            } else {
                                this.routingId = this.clientId;
                            }
                            cleanupSendQueue(previousRoutingId);
                            if (msg.session_present) {
                                // Resend pending connack and connrel messages
                                resendUnacknowledged();
                            } else {
                                this.awaitingRel = {};
                                this.awaitingAck = {};
                                this.cleanStart = false;
                            }
                            if (typeof this.connectProps.server_keep_alive == "number") {
                                this.keepAliveInterval = this.connectProps.server_keep_alive;
                            } else {
                                this.keepAliveInterval = MQTT_KEEP_ALIVE;
                            }
                            resetKeepAliveTimer();

                            // Relay the connack to the bridge (might need to resubscribe)
                            publishStatus(true);
                            sessionToBridge({
                                type: "connack",
                                is_connected: true,
                                client_id: this.clientId,
                                connack: msg
                            });

                            // Now that the bridge resubscribed we can send the queued messages.
                            sendQueuedMessages();
                        }
                        break;
                    case MQTT_RC_BAD_USERNAME_OR_PASSWORD:
                        // Bad credentials, retry anonymous
                        this.authUserPassword.username = undefined;
                        this.authUserPassword.password = undefined;
                        /* falls through */
                    case MQTT_RC_CLIENT_ID_INVALID:
                        // On next retry let the server pick a client id.
                        this.clientId = '';
                        /* falls through */
                    default:
                        publishStatus(false);
                        sessionToBridge({
                            type: "connack",
                            is_connected: false,
                            connack: msg
                        });
                }
                break;
            case 'puback':
                if (this.awaitingAck[msg.packet_id]) {
                    if (this.awaitingAck[msg.packet_id].type != 'puback') {
                        console.log("MQTT: Unexpected puback for ", this.awaitingAck[msg.packet_id]);
                    } else {
                        // TODO: associate the original publish command
                        // sessionToBridge(msg);
                    }
                    delete this.awaitingAck[msg.packet_id];
                } else {
                    console.log("MQTT: puback for unknown packet_id", msg.packet_id);
                }
                break;
            case 'pubrec':
                if (this.awaitingAck[msg.packet_id]) {
                    // TODO: associate the original publish command
                    // sessionToBridge(msg);
                }
                if (msg.reason_code < 0x80) {
                    if (this.awaitingAck[msg.packet_id]) {
                        if (this.awaitingAck[msg.packet_id].type != 'pubrec') {
                            console.log("MQTT: Unexpected pubrec for ", this.awaitingAck[msg.packet_id]);
                        }
                        this.awaitingAck[msg.packet_id].type = 'pubcomp';
                        this.awaitingAck[msg.packet_id].msg = undefined;
                        replyMsg = { type: 'pubrel', packet_id: msg.packet_id };
                    } else {
                        replyMsg = { type: 'pubrel', packet_id: msg.packet_id, reason_code: MQTT_RC_PACKET_ID_NOT_FOUND };
                    }
                } else {
                    if (this.awaitingAck[msg.packet_id]) {
                        delete this.awaitingAck[msg.packet_id];
                    }
                }
                break;
            case 'pubcomp':
                if (this.awaitingAck[msg.packet_id]) {
                    if (this.awaitingAck[msg.packet_id].type != 'pubcomp') {
                        console.log("MQTT: Unexpected pubcomp for ", this.awaitingAck[msg.packet_id]);
                    }
                    delete this.awaitingAck[msg.packet_id];
                }
                break;
            case 'suback':
                if (this.awaitingAck[msg.packet_id]) {
                    if (this.awaitingAck[msg.packet_id].type != 'suback') {
                        console.log("MQTT: Unexpected suback for ", this.awaitingAck[msg.packet_id]);
                    } else {
                        const ackMsg = {
                            type: 'suback',
                            topics: this.awaitingAck[msg.packet_id].topics,
                            acks: msg.acks
                        };
                        sessionToBridge(ackMsg);
                    }
                    delete this.awaitingAck[msg.packet_id];
                }
                break;
            case 'unsuback':
                if (this.awaitingAck[msg.packet_id]) {
                    if (this.awaitingAck[msg.packet_id].type != 'unsuback') {
                        console.log("MQTT: Unexpected unsuback for ", this.awaitingAck[msg.packet_id]);
                    } else {
                        const ackMsg = {
                            type: 'unsuback',
                            topics: this.awaitingAck[msg.packet_id].topics,
                            acks: msg.acks
                        };
                        sessionToBridge(ackMsg);
                    }
                    delete this.awaitingAck[msg.packet_id];
                }
                break;
            case 'publish':
                {
                    let isPubOk = false;
                    let awaitRel;
                    switch (msg.qos) {
                        case 0:
                            isPubOk = true;
                            break;
                        case 1:
                            if (this.awaitingRel[msg.packet_id]) {
                                replyMsg = {
                                    type: 'puback',
                                    packet_id: msg.packet_id,
                                    reason_code: MQTT_RC_PACKET_ID_IN_USE
                                };
                            } else {
                                isPubOk = true;
                                replyMsg = {
                                    type: 'puback',
                                    packet_id: msg.packet_id
                                };
                            }
                            break;
                        case 2:
                            replyMsg = {
                                type: 'pubrec',
                                packet_id: msg.packet_id
                            };
                            if (this.awaitingRel[msg.packet_id]) {
                                awaitRel = this.awaitingRel[msg.packet_id];
                                replyMsg.reason_code = awaitRel.reason_code;
                            } else {
                                isPubOk = true;
                            }
                            this.awaitingRel[msg.packet_id] = {
                                type: 'pubrel',
                                nr: this.messageNr++
                            };
                    }
                    if (isPubOk) {
                        const ct = msg.properties.content_type;
                        msg.payload = decodePayload(msg.payload, ct);

                        sessionToBridge(msg);

                        if (replyMsg) {
                            replyMsg.reason_code = MQTT_RC_SUCCESS;
                        }
                        if (awaitRel) {
                            awaitRel.reason_code = MQTT_RC_SUCCESS;
                        }
                    }
                }
                break;
            case 'pubrel':
                if (this.awaitingRel[msg.packet_id]) {
                    delete this.awaitingRel[msg.packet_id];
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
                this.sendMessage({ type: 'pingresp' });
                break;
            case 'pingresp':
                this.isWaitPingResp = false;
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
            setTimeout(() => { this.sendMessage(replyMsg); }, 0);
        }
    }

    /**
     * Force all connections closed - happens on:
     * - receive of 'DISCONNECT'
     * - keep-alive timeout
     */
    const closeConnections = () => {
        for (const k in this.connection) {
            this.connection[k].closeConnection();
        }
        this.connection = {};
        this.isWaitPingResp = false;
        this.isSentConnect = false;
        this.isWaitConnack = false;
        this.keepAliveInterval = 0;
        stopKeepAliveTimer();
        publishStatus(false);
    }

    /**
     * Set the packetId to the next unused number
     */
    const nextPacketId = () => {
        do {
            this.packetId++;
            if (this.packetId > 65535) {
                this.packetId = 1;
            }
        } while (this.awaitingAck[this.packetId]);
        return this.packetId;
    }

    /**
     * Publish a message to the broker
     */
    function localPublish( topic, msg, opts ) {
        brokerPublish(topic, msg, opts);
    }

    /**
     * Subscribe to a topic on the broker
     */
    function localSubscribe( topic, callback ) {
        brokerSubscribe(topic, callback);
    }

    /**
     * Publish the current connection status
     */
    const publishStatus = ( isConnected ) => {
        localPublish(
            this.bridgeTopics.session_status,
            { is_connected: isConnected, client_id: this.clientId  },
            { retain: true });
    }

    /**
     * Publish a session event
     */
    const publishEvent = ( event ) => {
        localPublish(`${ this.bridgeTopics.session_event }/${ event }`, {});
    }

    /**
     * Initialize, connect to local topics
     */
    const init = () => {
        publishStatus( false );
        localSubscribe(this.bridgeTopics.session_out, sessionToRemote);
        localSubscribe(this.bridgeTopics.session_control, sessionControl);
    }

    init();
}

init();

export { newSession, findSession, deleteSession };

