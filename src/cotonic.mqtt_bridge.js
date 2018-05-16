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
    const BRIDGE_LOCAL_TOPIC = "bridge/+remote/#topic";
    const BRIDGE_STATUS_TOPIC = "$bridge/+remote/status";
    const BRIDGE_AUTH_TOPIC = "$bridge/+remote/auth";
    const BRIDGE_CONTROL_TOPIC = "$bridge/+remote/control";

    const SESSION_IN_TOPIC = "session/+remote/in"
    const SESSION_OUT_TOPIC = "session/+remote/out"
    const SESSION_STATUS_TOPIC = "session/+remote/status"
    const SESSION_CONTROL_TOPIC = "session/+remote/control"

    // Bridges to remote servers and clients
    var bridges = {};

    var newBridge = function( remote, mqtt_session ) {
        remote = remote || 'origin';
        mqtt_session = mqtt_session || cotonic.mqtt_session;

        let bridge = bridges[remote];

        if (!bridge) {
            bridge = new mqttBridge();
            bridges[remote] = bridge;
            bridge.connect(remote, mqtt_session);
        }
        return bridge;
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
        var session;
        var clientId;
        var routingId;
        var local_topics = {};
        var sessionTopic;
        var is_connected = false;
        var session_present = false;
        var self = this;
        var wid;

        // TODO: pass authentication details to the session
        this.connect = function ( remote, mqtt_session ) {
            self.wid = "bridge/" + remote;
            self.remote = remote;
            self.local_topics = {
                // Comm between local broker and bridge
                bridge_local: cotonic.mqtt.fill(BRIDGE_LOCAL_TOPIC, {remote: remote, topic: "#topic"}),
                bridge_status: cotonic.mqtt.fill(BRIDGE_STATUS_TOPIC, {remote: remote}),
                bridge_auth: cotonic.mqtt.fill(BRIDGE_AUTH_TOPIC, {remote: remote}),
                bridge_control: cotonic.mqtt.fill(BRIDGE_CONTROL_TOPIC, {remote: remote}),

                // Comm between session and bridge
                session_in: cotonic.mqtt.fill(SESSION_IN_TOPIC, {remote: remote}),
                session_out: cotonic.mqtt.fill(SESSION_OUT_TOPIC, {remote: remote}),
                session_status: cotonic.mqtt.fill(SESSION_STATUS_TOPIC, {remote: remote}),
                session_control: cotonic.mqtt.fill(SESSION_CONTROL_TOPIC, {remote: remote})
            };
            cotonic.broker.subscribe(self.local_topics.bridge_local, relayOut, {wid: self.wid, no_local: true});
            cotonic.broker.subscribe(self.local_topics.bridge_control, bridgeControl);
            cotonic.broker.subscribe(self.local_topics.session_in, relayIn);
            cotonic.broker.subscribe(self.local_topics.session_status, sessionStatus);

            // 3. Start a mqtt_session WebWorker for the remote
            self.session = mqtt_session.newSession(remote, self.local_topics);
            publishStatus();
        };


        // Relay a publish message to the remote
        function relayOut ( msg, props ) {
            console.log("handleBridgeLocal", msg, props)
            switch (msg.type) {
                case 'publish':
                    // - remove "bridge/+remote/" from the topic
                    // - rewrite response_topic (prefix "bridge/+routingId/")
                    // - publish to local_topics.session_out
                    msg.topic = dropRoutingTopic(msg.topic);
                    if (msg.properties && msg.properties.response_topic) {
                        msg.properties.response_topic = remoteRoutingTopic(msg.properties.response_topic);
                    }
                    cotonic.broker.publish(self.local_topics.session_out, msg);
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
                    cotonic.broker.publish_mqtt_message(relay, { wid: self.wid });
                    break;
                case 'connack':
                    sessionConnack(relay);
                    break;
                case 'disconnect':
                    self.is_connected = false;
                    publishStatus();
                    break;
                case 'auth':
                    cotonic.broker.publish(self.local_topics.bridge_auth, relay, { wid: self.wid });
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

        // Bridge control, called by broker on subscribe and unsubscribe
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
                    cotonic.broker.publish(self.local_topics.session_out, payload);
                    break;
                case 'unsubscribe':
                    // Fetch topics
                    // For all topics: check if subscriber exists on broker
                    // If no subscriber: add to unsub list
                    // If subscriber: remove from unsub list
                    // Remove "bridge/+/" from topic
                    // Relay unsubscribe with new topic list
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
                    self.routingId = props['cotonic-routing-id']
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
                    cotonic.broker.publish(self.local_topics.session_out, subscribe);
                    resubscribeTopics()
                    self.session_present = !!msg.connack.session_present
                } else {
                    self.session_present = true;
                }
            }
            publishStatus();
        }

        function resubscribeTopics ( ) {
            let subs = cotonic.broker.find_subscriptions_below("bridge/" + self.remote);
            let topics = {};
            for (let i = 0; i < subs.length; i++) {
                if (subs[i].wid == self.wid) {
                    continue;
                }
                let sub = Object.assign({}, subs[i].sub);
                sub.topic = cotonic.mqtt.remove_named_wildcards(sub.topic);
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

            subA.retain_as_published = subA.retain_as_published || subB.retain_as_published || false
            subA.no_local = subA.no_local && subB.no_local;
        }

        // Session status changes
        function sessionStatus ( msg ) {
            self.is_connected = msg.is_connected;
        }

        function remoteRoutingTopic ( topic ) {
            return "bridge/" + self.routingId + "/" + topic;
        }

        function localRoutingTopic ( topic ) {
            return "bridge/" + self.remote + "/" + topic;
        }

        function dropRoutingTopic ( topic ) {
            return topic.replace(/^bridge\/[^\/]+\//, '');
        }

        function publishStatus() {
            cotonic.broker.publish(
                self.local_topics.bridge_status,
                {
                    is_connected: self.is_connected,
                    session_present: self.session_present
                },
                { retain: true });
        }

    }

    // Publish the MQTT bridge functions.
    cotonic.mqtt_bridge = cotonic.mqtt_bridge || {};
    cotonic.mqtt_bridge.newBridge = newBridge;
    cotonic.mqtt_bridge.findBridge = findBridge;
    cotonic.mqtt_bridge.deleteBridge = deleteBridge;

}(cotonic));
