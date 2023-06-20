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

import { subscribe, publish } from "./cotonic.broker.js";

subscribe("model/localStorage/get/+key",
    (msg, bindings) => {
        if (msg.properties.response_topic) {
            let value = window.localStorage.getItem(bindings.key);
            if (typeof value == "string") {
                try { value = JSON.parse(value); }
                catch (e) { }
            }
            publish(msg.properties.response_topic, value);
        }
    },
    {wid: "model.localStorage"}
);

subscribe("model/localStorage/post/+key",
    (msg, bindings) => {
        window.localStorage.setItem(bindings.key, JSON.stringify(msg.payload));
        if (msg.properties.response_topic) {
            publish(msg.properties.response_topic, msg.payload);
        }
        publish("model/localStorage/event/" + bindings.key, msg.payload);
    },
    {wid: "model.localStorage"}
);

subscribe("model/localStorage/delete/+key",
    (msg, bindings) => {
        window.localStorage.removeItem(bindings.key);
        if (msg.properties.response_topic) {
            publish(msg.properties.response_topic, null);
        }
        publish("model/localStorage/event/" + bindings.key, null);
    },
    {wid: "model.localStorage"}
);

// Called if localStorage is changed in another window
window.addEventListener(
    'storage',
    (evt) => {
        if (evt.type == 'storage' && evt.storageArea === window.localStorage) {
            let value = evt.newValue;
            if (typeof value == "string") {
                try { value = JSON.parse(value); }
                catch (e) { }
            }
            publish("model/localStorage/event/" + evt.key, value);
        }
    },
    false
);

publish("model/localStorage/event/ping", "pong", { retain: true });
