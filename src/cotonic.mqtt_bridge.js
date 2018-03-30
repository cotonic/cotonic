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

    // Bridges to remote servers and clients
    var bridges = {};

    var newBridge = function( remote ) {
        remote = remote || 'origin';
        if (sessions[ remote ]) {
            return bridges[remote];
        } else {
            var bridge = new mqttBridge();
            bridges[remote] = bridge;
            bridge.connect(remote);
            return bridge;
        }
    };

    var findBridge = function( remote ) {
        remote = remote || 'origin';
        return bridges[remote];
    };


    /*************************************************************************************************/
    /****************************************** MQTT Bridge ******************************************/
    /*************************************************************************************************/

    function mqttBridge () {

        var remote;
        var session;
        var self = this;
        var clientId;
        var routingId;

        // TODO: pass authentication details to the session
        this.connect = function ( remote ) {
            self.remote = remote;
            // 1. Start a mqtt_session for the remote
            self.session = cotonic.mqtt_session.newSession(remote, self);
        }

        this.match = function ( topicId ) {
            return self.clientId === topicId || self.routingId === topicId;
        }

        this.auth = function ( /* ... */ ) {
            // Start a re-authentication, useful when logging on
            // TODO: decide if we need to restart the session with a new clientId (could be an option)
        }

        this.sessionConnack = function ( clientId, connack ) {
            // 1. Register the clientId and the optional 'cotonic-routing-id' property
            // 2. Check 'session_present' flag
            //    - If not present then:
            //      1. Add subscription on server for "bridge/<clientId>/#"
            //      2. Add subscription on server for "bridge/<routingId>/#"
            //      3. Resubscribe client subscriptions (fetch all local subscriptions matching 'bridge/<remote>/#')
            // Publish to '$bridge/<remote>/status' topic that we connected (retained)
            // Subscribers then handle the 'session_present' flag.
        }

        this.sessionAuth = function ( ConnectOrAuth, isConnected ) {
            // Either:
            // - Add authentication credentials to the CONNECT packet
            // - Received an AUTH packet, perform extended (re-)authentication
        }

        this.sessionDisconnect = function ( optDisconnect ) {
            // Publish to '$bridge/<remote>/status' topic that this remote disconnected (retained)
        }

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

}(cotonic));
