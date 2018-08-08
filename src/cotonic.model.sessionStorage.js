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

    cotonic.broker.subscribe("model/sessionStorage/get/+key", function(msg, bindings) {
        if (msg.properties.response_topic) {
            let v = window.sessionStorage.getItem(bindings.key);
            cotonic.broker.publish(msg.properties.response_topic, v);
        }
    });

    cotonic.broker.subscribe("model/sessionStorage/post/+key", function(msg, bindings) {
        if (typeof msg.payload == 'undefined') {
            window.sessionStorage.removeItem(bindings.key);
        } else {
            window.sessionStorage.setItem(bindings.key, msg.payload);
        }
        if (msg.properties.response_topic) {
            cotonic.broker.publish(msg.properties.response_topic, msg.payload);
        }
    });

    cotonic.broker.subscribe("model/sessionStorage/delete/+key", function(msg, bindings) {
        window.sessionStorage.removeItem(bindings.key);
        if (msg.properties.response_topic) {
            cotonic.broker.publish(msg.properties.response_topic, undefined);
        }
    });

}(cotonic));
