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

import { fill, remove_named_wildcards } from "cotonic.mqtt";
import { subscribe, publish, publish_mqtt_message, find_subscriptions_below } from "cotonic.broker";
import * as mqtt_session from "cotonic.mqtt_session";

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
var bridges = {};

var newBridge = function( remote, options ) {
    remote = remote || 'origin';
    options = options || {}; if(!options.mqtt_session) {
        options.mqtt_session = mqtt_session;
    }

    let bridge = bridges[remote];

    if (!bridge) {
        bridge = new mqttBridge();
        bridges[remote] = bridge;
        bridge.connect(remote, options);
    }
    return bridge;
};

var disconnectBridge = function( remote ) {
    const bridge = findBridge(remote);

    if(!bridge)
        return;

    return bridge.disconnect();
};

var findBridge = function( remote ) {
    remote = remote || 'origin';
    return bridges[remote];
};

var deleteBridge = function( remote ) {
    remote = remote || 'origin';
    delete bridges[remote];
};


/*************************************************************************************************/
/****************************************** MQTT Bridge ******************************************/
/*************************************************************************************************/

function mqttBridge () {

    var remote;
    var name;
    var session;
    var clientId;
    var routingId = undefined;      // Must have same initial value as in mqtt_session
    var local_topics = {};
    var sessionTopic;
    var is_connected = false;
    var is_ui_state = false;
    var session_present = false;
    var self = this;
    var wid;

    this.connect = function ( remote, options ) {
        self.mqtt_session = options.mqtt_session;
        self.name = (options.name || remote.replace(/[^0-9a-zA-Z\.]/g, '-'));
        self.remote = remote;
        self.wid = "bridge/" + self.name;
        self.is_ui_state = options.is_ui_state || (remote == 'origin');
        self.local_topics = {
            // Comm between local broker and bridge
            bridge_local: fill(BRIDGE_LOCAL_TOPIC, {name: self.name, topic: "#topic"}),
            bridge_status: fill(BRIDGE_STATUS_TOPIC, {name: self.name}),
            bridge_auth: fill(BRIDGE_AUTH_TOPIC, {name: self.name}),
            bridge_control: fill(BRIDGE_CONTROL_TOPIC, {name: self.name}),

            // Comm between session and bridge
            session_in: fill(SESSION_IN_TOPIC, {name: self.name}),
            session_out: fill(SESSION_OUT_TOPIC, {name: self.name}),
            session_status: fill(SESSION_STATUS_TOPIC, {name: self.name}),
            session_control: fill(SESSION_CONTROL_TOPIC, {name: self.name}),
            session_event: fill(SESSION_EVENT_TOPIC, {name: self.name})
        };
        subscribe(self.local_topics.bridge_local, relayOut, {wid: self.wid, no_local: true});
        subscribe(self.local_topics.bridge_control, bridgeControl);
        subscribe(self.local_topics.session_in, relayIn);
        subscribe(self.local_topics.session_status, sessionStatus);

            // Start a mqtt_session for the remote
            self.session = self.mqtt_session.newSession(remote, self.local_topics, options);
            publishStatus();
        };

        // Disconnect the session of this bridge.
        this.disconnect = function() {
            self.session.disconnect();
            self.mqtt_session.deleteSession(self.remote);
            self.session = undefined;
            self.mqtt_session = undefined;
            publishStatus();
        };

        // Relay a publish message to the remote
        function relayOut ( msg, props ) {
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
                    publish(self.local_topics.session_out, msg);
                    break;
                default:
                    console.log("Bridge relayOut received unknown message", msg);
                    break;
            }
        }

        // Handle a message from the session, maybe relay to the local broker
        function relayIn ( msg ) {
            let relay = msg.payload;
            switch (relay.type) {
                case 'publish':
                    let topic = relay.topic;
                    let m = topic.match(/^bridge\/([^\/]+)\/(.*)/);
                    if (m) {
                        if (m[1] != self.clientId && m[1] != self.routingId) {
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
                    publish_mqtt_message(relay, { wid: self.wid });
                    break;
                case 'connack':
                    sessionConnack(relay);
                    break;
                case 'disconnect':
                    self.is_connected = false;
                    publishStatus();
                    break;
                case 'auth':
                    // Publish authentication status changes, might need user interaction
                    publish(self.local_topics.bridge_auth, relay, { wid: self.wid });
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
            let payload = msg.payload;
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
                    publish(self.local_topics.session_out, payload);
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
                    publish(self.local_topics.session_out, payload);
                    break;
                default:
                    console.log("Bridge bridgeControl received unknown message", msg);
                    break;
            }
        }

        function sessionConnack ( msg ) {
            // 1. Register the clientId and the optional 'cotonic-routing-id' property
            self.is_connected = msg.is_connected;
            if (msg.is_connected) {
                // Either the existing client-id or an assigned client-id
                self.clientId = msg.client_id;

                // Optional routing-id, assigned by the server
                let props = msg.connack.properties;
                if (props && props['cotonic-routing-id']) {
                    self.routingId = props['cotonic-routing-id'];
                } else {
                    self.routingId = msg.client_id;
                }

                if (!msg.connack.session_present) {
                    // Subscribe to the client + routing forward topics
                    let topics = [
                        { topic: "bridge/" + self.clientId + "/#", qos: 2, no_local: true }
                    ];
                    if (self.clientId != self.routingId) {
                        topics.push({ topic: "bridge/" + self.routingId + "/#", qos: 2, no_local: true });
                    }
                    let subscribe = {
                        type: "subscribe",
                        topics: topics,
                    };
                    publish(self.local_topics.session_out, subscribe);
                    resubscribeTopics();
                    self.session_present = !!msg.connack.session_present;
                } else {
                    self.session_present = true;
                }
            }
            publishStatus();
        }

        function resubscribeTopics ( ) {
            let subs = find_subscriptions_below("bridge/" + self.name);
            let topics = {};
            for (let i = 0; i < subs.length; i++) {
                if (subs[i].wid == self.wid) {
                    continue;
                }
                let sub = Object.assign({}, subs[i].sub);
                sub.topic = remove_named_wildcards(sub.topic);
                if (!topics[sub.topic]) {
                    topics[sub.topic] = sub;
                } else {
                    mergeSubscription(topics[sub.topic], sub);
                }
            }
            let ts = [];
            for (let t in topics) {
                ts.push(topics[t]);
            }
            if (ts.length > 0) {
                bridgeControl({ type: 'publish', payload: { type: 'subscribe', topics: ts } });
            }
        }

        function mergeSubscription ( subA, subB ) {
            let qosA = subA.qos || 0;
            let qosB = subB.qos || 0;
            subA.qos = Math.max(qosA, qosB);

            let rhA = subA.retain_handling || 0;
            let rhB = subB.retain_handling || 0;
            subA.retain_handling = Math.min(rhA, rhB);

            subA.retain_as_published = subA.retain_as_published || subB.retain_as_published || false;
            subA.no_local = subA.no_local && subB.no_local;
        }

    // Session status changes
    function sessionStatus ( msg ) {
        self.is_connected = msg.is_connected;
    }

    function remoteRoutingTopic ( topic ) {
        return "bridge/" + self.routingId + "/" + topic;
    }

    function remoteClientTopic ( topic ) {
        return "bridge/" + self.routingId + "/" + topic;
    }

    function localRoutingTopic ( topic ) {
        return "bridge/" + self.name + "/" + topic;
    }

    function dropRoutingTopic ( topic ) {
        return topic.replace(/^bridge\/[^\/]+\//, '');
    }

        function publishStatus() {
            publish(
                self.local_topics.bridge_status,
                {
                    is_connected: self.is_connected,
                    session_present: self.session_present,
                    client_id: self.clientId
                },
                { retain: true });

            publish(
                'model/sessionStorage/post/mqtt$clientBridgeTopic',
                remoteClientTopic(""));

            if (self.is_ui_state) {
                let ui = {
                    classes: [],
                    status: {
                        'remote': self.remote,
                        'name': self.name
                    }
                };
                if (self.is_connected) {
                    ui.classes.push('connected');
                } else {
                    ui.classes.push('disconnected');
                }
                publish("model/bridge/event/ui-status", ui);
            }
        }

    }

export {newBridge, disconnectBridge, findBridge, deleteBridge, bridges};
