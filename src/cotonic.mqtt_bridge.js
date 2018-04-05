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

// TODO: subscribe on the remote routing/client-id topics
// TODO: strip remote routing/client-id topics before relaying to local tree
// TODO: unsubscribe
// TOOD: admin for de-duplication of subscriptions

"use strict";
var cotonic = cotonic || {};

(function (cotonic) {
    const BRIDGE_LOCAL_TOPIC = "bridge/+remote/#topic";
    const BRIDGE_STATUS_TOPIC = "$bridge/+remote/status";
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
        var remote_subscriptions = {};
        var sessionTopic;
        var self = this;

        // TODO: pass authentication details to the session
        this.connect = function ( remote, mqtt_session ) {
            self.remote = remote;
            self.local_topics = {
                // Comm between system and bridge
                bridge_status: cotonic.mqtt.fill(BRIDGE_STATUS_TOPIC, {remote: remote}),
                bridge_local: cotonic.mqtt.fill(BRIDGE_LOCAL_TOPIC, {remote: remote, topic: "#topic"}),
                bridge_control: cotonic.mqtt.fill(BRIDGE_CONTROL_TOPIC, {remote: remote, topic: "#topic"}),

                // Comm between session and bridge
                session_in: cotonic.mqtt.fill(SESSION_IN_TOPIC, {remote: remote}),
                session_out: cotonic.mqtt.fill(SESSION_OUT_TOPIC, {remote: remote}),
                session_status: cotonic.mqtt.fill(SESSION_STATUS_TOPIC, {remote: remote}),
                session_control: cotonic.mqtt.fill(SESSION_CONTROL_TOPIC, {remote: remote})
            };
            let wid = "bridge/" + remote;
            cotonic.broker.subscribe(self.local_topics.bridge_local, relayOut, {wid: wid, no_local: true});
            cotonic.broker.subscribe(self.local_topics.bridge_control, bridgeControl);
            cotonic.broker.subscribe(self.local_topics.session_in, relayIn);
            cotonic.broker.subscribe(self.local_topics.session_status, sessionStatus);

            // 3. Start a mqtt_session WebWorker for the remote
            self.session = mqtt_session.newSession(remote, self.local_topics);
            publishStatus( false );
        };


        // Relay a publish message to the remote
        function relayOut ( msg, props ) {
            console.log("handleBridgeLocal", msg, props)
            switch (msg.type) {
                case 'publish':
                    // - remove "bridge/+remote/" from the topic
                    // - rewrite response_topic (prefix "bridge/+routingid/")
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
                    // TODO: handle publish to the routing and client-id topics
                    //       these prefixes must be removed (but not other prefixes)
                    // relay.topic = localRoutingTopic(relay.topic);
                    if (relay.properties && relay.properties.response_topic) {
                        relay.properties.response_topic = remoteRoutingTopic(relay.properties.response_topic);
                    }
                    cotonic.broker.publish_mqtt_message(relay);
                    break;
                case 'connack':
                    sessionConnack(relay);
                    break;
                case 'disconnect':
                    break;
                case 'auth':
                    // auth (re-authenticate)
                    break;
                case 'suback':
                    // suback (per topic)
                    // non-conformant: add the topic in the ack
                    // discuss: should this be a publish with payload?
                    break;
                case 'puback':
                case 'pubrec':
                    // puback (per topic)
                    // non-conformant: add the topic in the ack
                    // discuss: should this be a publish with payload?
                    break;
                case 'publish':
                    // status in payload
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

        // Session status changes
        function sessionStatus ( msg ) {
            console.log("sessionStatus", msg);
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


        this.match = function ( topicId ) {
            return self.clientId === topicId || self.routingId === topicId;
        };

        function sessionConnack ( msg ) {
            // 1. Register the clientId and the optional 'cotonic-routing-id' property
            self.clientId = msg.client_id;
            if (msg.properties && msg.properties['cotonic-routing-id']) {
                self.routingId = msg.properties['cotonic-routing-id']
            } else {
                self.routingId = msg.client_id;
            }

            // 2. Check 'session_present' flag
            //    - If not present then:
            //      1. Add subscription on server for "bridge/<clientId>/#"
            //      2. Add subscription on server for "bridge/<routingId>/#"
            //      3. Resubscribe client subscriptions (fetch all local subscriptions matching 'bridge/<remote>/#')
            // Publish to '$bridge/<remote>/status' topic that we connected (retained)
            // Subscribers then handle the 'session_present' flag.

            publishStatus( true );
        };

        this.sessionAuth = function ( ConnectOrAuth, isConnected ) {
            // Either:
            // - Add authentication credentials to the CONNECT packet
            // - Received an AUTH packet, perform extended (re-)authentication
        };

        this.sessionDisconnect = function ( optDisconnect ) {
            // Publish to '$bridge/<remote>/status' topic that this remote disconnected (retained)
            publishStatus( false );
        };


        function publishStatus( session_present ) {
            cotonic.broker.publish(
                self.local_topics.bridge_status,
                { session_present: session_present },
                { retained: true });
        }
    }

    function init() {
        // 1. Subscribe to 'bridge/#'
        // 2. Add a mqtt router hook for subscriptions to 'bridge/#'
    }

    init();

    // Publish the MQTT bridge functions.
    cotonic.mqtt_bridge = cotonic.mqtt_bridge || {};
    cotonic.mqtt_bridge.newBridge = newBridge;
    cotonic.mqtt_bridge.findBridge = findBridge;
    cotonic.mqtt_bridge.deleteBridge = deleteBridge;

}(cotonic));
