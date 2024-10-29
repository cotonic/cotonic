/**
 * Copyright 2023 The Cotonic Authors. All Rights Reserved.
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

import { publish as brokerPublish, subscribe as brokerSubscribe } from "./cotonic.broker.js";

const console = globalThis.console;

/**
 * Possible transports for remotes.
 *
 * For 'origin':
 * - wss with mqtt-transport controller
 * - sse + post to mqtt-transport contr4oller
 *
 * For other remotes (clients):
 * - WebRTC
 */

// Lookup list of all remotes with their connections
// One of them is 'origin' (which is a special case)
const sessions = {};

const MQTT_KEEP_ALIVE = 300; // Default PINGREQ interval in seconds

function newSession( remote, bridgeTopics, options ) {
    remote = remote || 'opener';
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
    remote = remote || 'opener';
    return sessions[remote];
};

function deleteSession( remote ) {
    remote = remote || 'opener';

    delete sessions[remote];
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
    this.clientId = '';                     // Assigned by server
    this.routingId = undefined;             // Assigned by server, use 'undefined' as in mqtt_bridge.
    this.disconnectReason = '';
    this.keepAliveTimer = false;
    this.keepAliveInterval = MQTT_KEEP_ALIVE;

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
     * Control messages from the bridge for this session
     */
    function sessionControl( _msg ) {
    }

    /**
     * Start a transport to the remote
     * Called by the bridge or other components that manage a MQTT connection
     */
    this.connect = ( _remote, options ) => {
        options = options || {};
        if (typeof options.client_id === "string") {
            this.clientId = options.client_id;
        }
        if (globalThis.opener) {
            resetKeepAliveTimer();
            publishEvent("transport/connected");
        } else {
            stopKeepAliveTimer();
            publishEvent("transport/disconnected");
        }
    };

    this.disconnect = ( _reasonCode ) => {
        stopKeepAliveTimer();
        publishStatus(false);
    };

    this.reconnect = ( _remote ) => {
        if (globalThis.opener) {
            resetKeepAliveTimer();
            publishEvent("transport/connected");
        } else {
            stopKeepAliveTimer();
            publishEvent("transport/disconnected");
        }
    };

    this.isConnected = () => {
        if (globalThis.opener) {
            return true;
        } else {
            return false;
        }
    };

    const publish = ( pubmsg ) => {
        const payload = pubmsg.payload;
        const properties = pubmsg.properties || {};

        if (typeof payload != "undefined" && payload !== null) {
            const contentType = properties.content_type || guessContentType(payload);
            properties.content_type = contentType;
        }
        const msg = {
            type: 'publish',
            topic: pubmsg.topic,
            payload: pubmsg.payload,
            qos: pubmsg.qos || 0,
            retain: pubmsg.retain || 0,
            properties: properties
        };
        this.sendMessage(msg);
    }

    const subscribe = ( _submsg ) => {
        // TODO
    }

    const unsubscribe = ( _unsubmsg ) => {
        // TODO
    }

    this.keepAlive = () => {
        if (!globalThis.opener) {
            stopKeepAliveTimer();
            publishStatus(false);
        }
    };

    this.sendMessage = ( msg ) => {
        if (globalThis.opener) {
            globalThis.opener.cotonic.broker.publish_mqtt_message(msg);
            return true;
        } else {
            return false;
        }
    };

    /**
     * State functions
     */

    const guessContentType = ( payload ) => {
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
    }

    /**
     * Publish a message to the broker
     */
    const localPublish = ( topic, msg, opts ) => {
        brokerPublish(topic, msg, opts);
    }

    /**
     * Subscribe to a topic on the broker
     */
    const localSubscribe = ( topic, callback ) => {
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

export { newSession, findSession, deleteSession };

