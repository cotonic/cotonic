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

import { fill, remove_named_wildcards } from "./cotonic.mqtt.js";
import { subscribe, publish, publish_mqtt_message, find_subscriptions_below } from "./cotonic.broker.js";
import * as mqtt_session_import from "./cotonic.mqtt_session.js";
import * as mqtt_session_opener_import from "./cotonic.mqtt_session_opener.js";

const BRIDGE_LOCAL_TOPIC = "bridge/+name/#topic";
const BRIDGE_STATUS_TOPIC = "$bridge/+name/status";
const BRIDGE_AUTH_TOPIC = "$bridge/+name/auth";
const BRIDGE_CONTROL_TOPIC = "$bridge/+name/control";

const SESSION_IN_TOPIC = "session/+name/in";
const SESSION_OUT_TOPIC = "session/+name/out";
const SESSION_STATUS_TOPIC = "session/+name/status";
const SESSION_CONTROL_TOPIC = "session/+name/control";
const SESSION_EVENT_TOPIC = "session/+name/event";

// Bridges to remote servers and clients
const bridges = {};

function newBridge( remote, options ) {
    remote = remote || 'origin';
    options = options || {};

    if(!options.mqtt_session) {
        if (remote == 'opener') {
            options.mqtt_session = mqtt_session_opener_import;
        } else {
            options.mqtt_session = mqtt_session_import;
        }
    }

    let bridge = bridges[remote];

    if (!bridge) {
        bridge = new mqttBridge();
        bridges[remote] = bridge;
        bridge.connect(remote, options);
    }
    return bridge;
};

function disconnectBridge( remote ) {
    const bridge = findBridge(remote);

    if(!bridge)
        return;

    return bridge.disconnect();
};

function findBridge( remote ) {
    remote = remote || 'origin';
    return bridges[remote];
};

function deleteBridge( remote ) {
    remote = remote || 'origin';
    delete bridges[remote];
};


/*************************************************************************************************/
/****************************************** MQTT Bridge ******************************************/
/*************************************************************************************************/

function mqttBridge () {

    let remote;
    let name;
    let session;
    let clientId;
    let routingId = undefined;      // Must have same initial value as in mqtt_session
    const local_topics = {};
    let is_connected = false;
    let is_ui_state = false;
    let session_present = false;
    let wid;
    let mqtt_session;

    this.connect = function ( rmt, options ) {
        mqtt_session = options.mqtt_session;
        name = (options.name || rmt.replace(/[^0-9a-zA-Z\.]/g, '-'));
        remote = rmt;
        wid = `bridge/${ name }`;
        is_ui_state = options.is_ui_state || (rmt == 'origin');
        Object.assign(local_topics, {
            // Comm between local broker and bridge
            bridge_local: fill(BRIDGE_LOCAL_TOPIC, {name: name, topic: "#topic"}),
            bridge_status: fill(BRIDGE_STATUS_TOPIC, {name: name}),
            bridge_auth: fill(BRIDGE_AUTH_TOPIC, {name: name}),
            bridge_control: fill(BRIDGE_CONTROL_TOPIC, {name: name}),

            // Comm between session and bridge
            session_in: fill(SESSION_IN_TOPIC, {name: name}),
            session_out: fill(SESSION_OUT_TOPIC, {name: name}),
            session_status: fill(SESSION_STATUS_TOPIC, {name: name}),
            session_control: fill(SESSION_CONTROL_TOPIC, {name: name}),
            session_event: fill(SESSION_EVENT_TOPIC, {name: name})
        });

        subscribe(local_topics.bridge_local, relayOut, {wid: wid, no_local: true});
        subscribe(local_topics.bridge_control, bridgeControl);
        subscribe(local_topics.session_in, relayIn);
        subscribe(local_topics.session_status, sessionStatus);

        // Start a mqtt_session for the remote
        session = mqtt_session.newSession(rmt, local_topics, options);

        publishStatus();
    };

    // Disconnect the session of this bridge.
    this.disconnect = function() {
        session.disconnect();
        mqtt_session.deleteSession(remote);
        session = undefined;
        mqtt_session = undefined;
        publishStatus();
    };

    // Relay a publish message to the remote
    function relayOut ( msg, _props ) {
        // console.log("handleBridgeLocal", msg, props)
        switch (msg.type) {
            case 'publish':
                // - remove "bridge/+name/" from the topic
                // - rewrite response_topic (prefix "bridge/+routingId/")
                // - publish to local_topics.session_out
                msg.topic = dropRoutingTopic(msg.topic);
                if (msg.properties && msg.properties.response_topic) {
                    msg.properties.response_topic = remoteRoutingTopic(msg.properties.response_topic);
                }
                publish(local_topics.session_out, msg);
                break;
            default:
                console.log("Bridge relayOut received unknown message", msg);
                break;
        }
    }

    // Handle a message from the session, maybe relay to the local broker
    function relayIn ( msg ) {
        const relay = msg.payload;
        switch (relay.type) {
            case 'publish':
                {
                    const topic = relay.topic;
                    const m = topic.match(/^bridge\/([^\/]+)\/(.*)/);
                    if (m) {
                        if (m[1] != clientId && m[1] != routingId) {
                            console.log("Bridge relay for unknown routing-id", topic);
                            return;
                        }
                        relay.topic = m[2];
                    } else {
                        relay.topic = localRoutingTopic(relay.topic);
                    }
                    if (relay.properties && relay.properties.response_topic) {
                        relay.properties.response_topic = localRoutingTopic(relay.properties.response_topic);
                    }
                    publish_mqtt_message(relay, { wid: wid });
                }
                break;
            case 'connack':
                sessionConnack(relay);
                break;
            case 'disconnect':
                is_connected = false;
                publishStatus();
                break;
            case 'auth':
                // Publish authentication status changes, might need user interaction
                publish(local_topics.bridge_auth, relay, { wid: wid });
                break;
            case 'suback':
                // suback (multiple topics)
                // non-conformant: the topics are added to the ack
                for (let k = 0; k < relay.acks; k++) {
                    // Relay acks to bridge?
                }
                break;
            case 'puback':
            case 'pubrec':
                // puback (per topic)
                // non-conformant: add the topic in the ack
                for (let k = 0; k < relay.acks; k++) {
                    // Relay acks to bridge?
                }
                break;
            default:
                console.log("Bridge relayIn received unknown message", msg);
                break;
        }
    }

    // Bridge control, called by broker on subscribe, unsubscribe, and for auth
    function bridgeControl ( msg ) {
        const payload = msg.payload;
        switch (payload.type) {
            case 'subscribe':
                // Fetch topics
                // Remove "bridge/+/" from topic
                for(let k = 0; k < payload.topics.length; k++) {
                    payload.topics[k].topic = dropRoutingTopic(payload.topics[k].topic);
                }
                // Check administration:
                //  - drop if qos <= or retain_handling >=
                //  - subscribe if new or qos > or retain_handling <
                // Relay subscribe with new topic list
                publish(local_topics.session_out, payload);
                break;
            case 'unsubscribe':
                // Fetch topics
                // For all topics: check if subscriber exists on broker
                // If no subscriber: add to unsub list
                // If subscriber: remove from unsub list
                // Remove "bridge/+/" from topic
                // Relay unsubscribe with new topic list
                break;
            case 'auth':
                // Forward AUTH messages as-is via the session to the remote server
                publish(local_topics.session_out, payload);
                break;
            default:
                console.log("Bridge bridgeControl received unknown message", msg);
                break;
        }
    }

    function sessionConnack ( msg ) {
        // 1. Register the clientId and the optional 'cotonic-routing-id' property
        is_connected = msg.is_connected;
        if (msg.is_connected) {
            // Either the existing client-id or an assigned client-id
            clientId = msg.client_id;

            // Optional routing-id, assigned by the server
            const props = msg.connack.properties;
            if (props && props['cotonic-routing-id']) {
                routingId = props['cotonic-routing-id'];
            } else {
                routingId = msg.client_id;
            }

            if (!msg.connack.session_present) {
                // Subscribe to the client + routing forward topics
                const topics = [
                    { topic: `bridge/${ clientId }/#`, qos: 2, no_local: true }
                ];
                if (clientId != routingId) {
                    topics.push({ topic: `bridge/${ routingId }/#`, qos: 2, no_local: true });
                }
                const subscribe = {
                    type: "subscribe",
                    topics: topics,
                };
                publish(local_topics.session_out, subscribe);
                resubscribeTopics();
                session_present = !!msg.connack.session_present;
            } else {
                session_present = true;
            }
        }
        publishStatus();
    }

    function resubscribeTopics ( ) {
        const subs = find_subscriptions_below(`bridge/${ name }`);
        const topics = {};
        for (let i = 0; i < subs.length; i++) {
            if (subs[i].wid == wid) {
                continue;
            }
            const sub = Object.assign({}, subs[i].sub);
            sub.topic = remove_named_wildcards(sub.topic);
            if (!topics[sub.topic]) {
                topics[sub.topic] = sub;
            } else {
                mergeSubscription(topics[sub.topic], sub);
            }
        }
        const ts = [];
        for (const t in topics) {
            ts.push(topics[t]);
        }
        if (ts.length > 0) {
            bridgeControl({ type: 'publish', payload: { type: 'subscribe', topics: ts } });
        }
    }

    // Session status changes
    function sessionStatus ( msg ) {
        is_connected = msg.is_connected;
    }

    function remoteRoutingTopic ( topic ) {
        return `bridge/${ routingId }/${ topic }`;
    }

    function remoteClientTopic ( topic ) {
        return `bridge/${ clientId }/${ topic }`;
    }

    function localRoutingTopic ( topic ) {
        return `bridge/${ name }/${ topic }`;
    }

    function publishStatus() {
        publish(
            local_topics.bridge_status,
            {
                is_connected: is_connected,
                session_present: session_present,
                client_id: clientId
            },
            { retain: true });

        publish(
            'model/sessionStorage/post/mqtt$clientBridgeTopic',
            remoteClientTopic(""));

        if (is_ui_state) {
            const ui = {
                classes: [],
                status: {
                    'remote': remote,
                    'name': name
                }
            };
            if (is_connected) {
                ui.classes.push('connected');
            } else {
                ui.classes.push('disconnected');
            }
            publish("model/bridge/event/ui-status", ui);
        }
    }
}

function mergeSubscription ( subA, subB ) {
    const qosA = subA.qos || 0;
    const qosB = subB.qos || 0;
    subA.qos = Math.max(qosA, qosB);

    const rhA = subA.retain_handling || 0;
    const rhB = subB.retain_handling || 0;
    subA.retain_handling = Math.min(rhA, rhB);

    subA.retain_as_published = subA.retain_as_published || subB.retain_as_published || false;
    subA.no_local = subA.no_local && subB.no_local;
}

function dropRoutingTopic ( topic ) {
    return topic.replace(/^bridge\/[^\/]+\//, '');
}


export {newBridge, disconnectBridge, findBridge, deleteBridge, bridges};
