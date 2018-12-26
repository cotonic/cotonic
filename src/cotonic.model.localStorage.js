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

(function(cotonic) {

    cotonic.broker.subscribe("model/localStorage/get/+key", function(msg, bindings) {
        if (msg.properties.response_topic) {
            let v = window.localStorage.getItem(bindings.key);
            cotonic.broker.publish(msg.properties.response_topic, v);
        }
    });

    cotonic.broker.subscribe("model/localStorage/post/+key", function(msg, bindings) {
        if (typeof msg.payload == 'undefined') {
            window.localStorage.removeItem(bindings.key);
        } else {
            window.localStorage.setItem(bindings.key, msg.payload);
        }
        if (msg.properties.response_topic) {
            cotonic.broker.publish(msg.properties.response_topic, msg.payload);
        }
        cotonic.broker.publish("model/localStorage/event/" + bindings.key, msg.payload);
    });

    cotonic.broker.subscribe("model/localStorage/delete/+key", function(msg, bindings) {
        window.localStorage.removeItem(bindings.key);
        if (msg.properties.response_topic) {
            cotonic.broker.publish(msg.properties.response_topic, undefined);
        }
        cotonic.broker.publish("model/localStorage/event/" + bindings.key, undefined);
    });

    window.addEventListener(
        'storage',
        function(evt) {
            if (evt.type == 'storage' && evt.storageArea === window.localStorage) {
                cotonic.broker.publish("model/localStorage/event/" + evt.key, evt.newValue);
            }
        },
        false);

}(cotonic));
