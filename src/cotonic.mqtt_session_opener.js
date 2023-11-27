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

import { publish as brokerPublish, subscribe as brokerSubscribe, call as brokerCall } from "./cotonic.broker.js";

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

const MQTT_KEEP_ALIVE = 300;                  // Default PINGREQ interval in seconds
const MQTT_SESSION_EXPIRY = 1800;             // Expire the session if we couldn't reconnect in 30 minutes

const MQTT_RC_SUCCESS                  = 0;
const MQTT_RC_DISCONNECT_WITH_WILL     = 4;
const MQTT_RC_CLIENT_ID_INVALID        = 133;
const MQTT_RC_BAD_USERNAME_OR_PASSWORD = 134;
const MQTT_RC_PACKET_ID_IN_USE         = 145;
const MQTT_RC_PACKET_ID_NOT_FOUND      = 146;

var newSession = function( remote, bridgeTopics, options ) {
    remote = remote || 'opener';
    if (sessions[remote]) {
        return sessions[remote];
    } else {
        let ch = new mqttSession(bridgeTopics);
        sessions[remote] = ch;
        ch.connect(remote, options);
        return ch;
    }
};

var findSession = function( remote ) {
    remote = remote || 'opener';
    return sessions[remote];
};

var deleteSession = function( remote ) {
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
    this.connect = function( remote, options ) {
        options = options || {};
        if (typeof options.client_id === "string") {
            self.clientId = options.client_id;
        }
        if (window.opener) {
            resetKeepAliveTimer();
            publishEvent("transport/connected");
        } else {
            stopKeepAliveTimer();
            publishEvent("transport/disconnected");
        }
    };

    this.disconnect = function (reasonCode) {
        stopKeepAliveTimer();
        publishStatus(false);
    };

    this.reconnect = function( remote ) {
        if (window.opener) {
            resetKeepAliveTimer();
            publishEvent("transport/connected");
        } else {
            stopKeepAliveTimer();
            publishEvent("transport/disconnected");
        }
    };

    this.isConnected = function() {
        if (window.opener) {
            return true;
        } else {
            return false;
        }
    };

    function publish( pubmsg ) {
        const payload = pubmsg.payload;
        let properties = pubmsg.properties || {};

        if (typeof payload != "undefined" && payload !== null) {
            let contentType = properties.content_type || guessContentType(payload);
            properties.content_type = contentType;
        }
        let msg = {
            type: 'publish',
            topic: pubmsg.topic,
            payload: pubmsg.payload,
            qos: pubmsg.qos || 0,
            retain: pubmsg.retain || 0,
            properties: properties
        };
        self.sendMessage(msg);
    }

    function subscribe ( submsg ) {
        // TODO
    }

    function unsubscribe ( unsubmsg ) {
        // TODO
    }

    this.keepAlive = function() {
        if (!window.opener) {
            stopKeepAliveTimer();
            publishStatus(false);
        }
    };

    this.sendMessage = function ( msg ) {
        if (window.opener) {
            window.opener.cotonic.broker.publish_mqtt_message(msg);
            return true;
        } else {
            return false;
        }
    };

    /**
     * State functions
     */
    function isStateConnected() {
        return !!window.opener;
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
    }

    /**
     * Force all connections closed - happens on:
     * - receive of 'DISCONNECT'
     * - keep-alive timeout
     */
    function closeConnections() {
        stopKeepAliveTimer();
        publishStatus(false);
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
    function publishStatus( isConnected ) {
        localPublish(
            self.bridgeTopics.session_status,
            { is_connected: isConnected, client_id: self.clientId  },
            { retain: true });
    }

    /**
     * Publish a session event
     */
    function publishEvent( event ) {
        localPublish(`${ self.bridgeTopics.session_event }/${ event }`, {});
    }

    /**
     * Initialize, connect to local topics
     */
    function init() {
        publishStatus( false );
        localSubscribe(self.bridgeTopics.session_out, sessionToRemote);
        localSubscribe(self.bridgeTopics.session_control, sessionControl);
    }

    init();
}

export { newSession, findSession, deleteSession };

