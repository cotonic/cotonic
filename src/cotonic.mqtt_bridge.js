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
    const LOCAL_TOPIC = "bridge/+remote/#topic";
    const STATUS_TOPIC = "$bridge/+remote/status";

    // Bridges to remote servers and clients
    var bridges = {};

    var newBridge = function( remote, mqtt_session ) {
        remote = remote || 'origin';
        mqtt_session = mqtt_session || cotonic.mqtt_session;

        if (bridges[ remote ]) {
            return bridges[remote];
        } 

        let bridge = new mqttBridge();
        bridges[remote] = bridge;

        bridge.connect(remote, mqtt_session);
         
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
        var statusTopic;
        var self = this;


        // TODO: pass authentication details to the session
        this.connect = function ( remote , mqtt_session ) {
            self.remote = remote;
            statusTopic = cotonic.mqtt.fill(STATUS_TOPIC, {remote: remote});

            // 1. Start a mqtt_session for the remote
            self.session = mqtt_session.newSession(remote, self);
            publishStatus( false );

        };

        this.match = function ( topicId ) {
            return self.clientId === topicId || self.routingId === topicId;
        };

        this.auth = function ( /* ... */ ) {
            // Start a re-authentication, useful when logging on
            // TODO: decide if we need to restart the session with a new clientId (could be an option)
        };

        this.sessionConnack = function ( clientId, connack ) {
            // 1. Register the clientId and the optional 'cotonic-routing-id' property
            self.clientId = clientId;

            // 2. Check 'session_present' flag
            //    - If not present then:
            //      1. Add subscription on server for "bridge/<clientId>/#"
            //      2. Add subscription on server for "bridge/<routingId>/#"
            //      3. Resubscribe client subscriptions (fetch all local subscriptions matching 'bridge/<remote>/#')
            // Publish to '$bridge/<remote>/status' topic that we connected (retained)
            // Subscribers then handle the 'session_present' flag.

            // Subscribe to the local topic
            cotonic.broker.subscribe(cotonic.mqtt.fill(LOCAL_TOPIC, {remote: remote, topic: "#topic"}), function(m, p) {
                console.log(m, p);
                // Relay code here
            });

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

    }

    function publishStatus( session_present ) {
        cotonic.broker.publish(statusTopic, {
            session_present: session_present
        }, {retained: true});
    }

    function init() {
        // 1. Subscribe to 'bridge/#'
        // 2. Add a mqtt router hook for subscriptions to 'bridge/#'
        // 3. ?? Start a bridge to 'origin'
    }

    init();

    // Publish the MQTT bridge functions.
    cotonic.mqtt_bridge = cotonic.mqtt_bridge || {};
    cotonic.mqtt_bridge.newBridge = newBridge;
    cotonic.mqtt_bridge.findBridge = findBridge;
    cotonic.mqtt_bridge.deleteBridge = deleteBridge;

}(cotonic));
