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

(function(cotonic) {
"use strict";

    cotonic = cotonic || {};

    cotonic.broker.subscribe("model/localStorage/get/+key", function(msg, bindings) {
        if (msg.properties.response_topic) {
            let value = window.localStorage.getItem(bindings.key);
            if (typeof value == "string") {
                try { value = JSON.parse(value); }
                catch (e) { }
            }
            cotonic.broker.publish(msg.properties.response_topic, value);
        }
    });

    cotonic.broker.subscribe("model/localStorage/post/+key", function(msg, bindings) {
        window.localStorage.setItem(bindings.key, JSON.stringify(msg.payload));
        if (msg.properties.response_topic) {
            cotonic.broker.publish(msg.properties.response_topic, msg.payload);
        }
        cotonic.broker.publish("model/localStorage/event/" + bindings.key, msg.payload);
    });

    cotonic.broker.subscribe("model/localStorage/delete/+key", function(msg, bindings) {
        window.localStorage.removeItem(bindings.key);
        if (msg.properties.response_topic) {
            cotonic.broker.publish(msg.properties.response_topic, null);
        }
        cotonic.broker.publish("model/localStorage/event/" + bindings.key, null);
    });

    // Called if localStorage is changed in another window
    window.addEventListener(
        'storage',
        function(evt) {
            if (evt.type == 'storage' && evt.storageArea === window.localStorage) {
                let value = evt.newValue;
                if (typeof value == "string") {
                    try { value = JSON.parse(value); }
                    catch (e) { }
                }
                cotonic.broker.publish("model/localStorage/event/" + evt.key, value);
            }
        },
        false);

    cotonic.broker.publish("model/localStorage/event/ping", "pong", { retain: true });

}(cotonic));
