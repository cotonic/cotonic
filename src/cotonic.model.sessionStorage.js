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

import { publish, subscribe } from "cotonic.broker";

// Direct key / value
subscribe("model/sessionStorage/get/+key",
    function(msg, bindings) {
        if (msg.properties.response_topic) {
            let value = window.sessionStorage.getItem(bindings.key);
            if (typeof value == "string") {
                try { value = JSON.parse(value); }
                catch (e) { }
            }
            cotonic.broker.publish(msg.properties.response_topic, value);
        }
    },
    {wid: "model.sessionStorage"}
);

subscribe("model/sessionStorage/post/+key",
    function(msg, bindings) {
        window.sessionStorage.setItem(bindings.key, JSON.stringify(msg.payload));
        if (msg.properties.response_topic) {
            cotonic.broker.publish(msg.properties.response_topic, msg.payload);
        }
        cotonic.broker.publish("model/sessionStorage/event/" + bindings.key, msg.payload);
    },
    {wid: "model.sessionStorage"}
);

subscribe("model/sessionStorage/delete/+key",
    function(msg, bindings) {
        window.sessionStorage.removeItem(bindings.key);
        if (msg.properties.response_topic) {
            publish(msg.properties.response_topic, null);
        }
        publish("model/sessionStorage/event/" + bindings.key, null);
    },
    {wid: "model.sessionStorage"}
);

// Item with subkeys
subscribe("model/sessionStorage/get/+key/+subkey",
    function(msg, bindings) {
        if (msg.properties.response_topic) {
            let value = window.sessionStorage.getItem(bindings.key);
            if (typeof value == "string") {
                try { value = JSON.parse(value); }
                catch (e) { value = {}; }
            }
            value = value || {};
            publish(msg.properties.response_topic, value[bindings.subkey]);
        }
    },
    {wid: "model.sessionStorage"}
);

subscribe("model/sessionStorage/post/+key/+subkey",
    function(msg, bindings) {
        let value = window.sessionStorage.getItem(bindings.key);
        if (typeof value == "string") {
            try { value = JSON.parse(value); }
            catch (e) { value = {}; }
        }
        value = value || {};
        value[bindings.subkey] = msg.payload;
        window.sessionStorage.setItem(bindings.key, JSON.stringify(value));
        if (msg.properties.response_topic) {
            publish(msg.properties.response_topic, value);
        }
    },
    {wid: "model.sessionStorage"}
);

subscribe("model/sessionStorage/delete/+key/+subkey",
    function(msg, bindings) {
        let value = window.sessionStorage.getItem(bindings.key);
        if (typeof value == "string") {
            try { value = JSON.parse(value); }
            catch (e) { value = {}; }
        }
        value = value || {};
        delete value[bindings.subkey];
        window.sessionStorage.setItem(bindings.key, JSON.stringify(value));
        if (msg.properties.response_topic) {
            publish(msg.properties.response_topic, value);
        }
    },
    {wid: "model.sessionStorage"}
);


// Called if sessionStorage is changed in an iframe in the same tab
window.addEventListener(
    'storage',
    function(evt) {
        if (evt.type == 'storage' && evt.storageArea === window.sessionStorage) {
            let value = evt.newValue;
            if (typeof value == "string") {
                try { value = JSON.parse(value); }
                catch (e) { }
            }
            publish("model/sessionStorage/event/" + evt.key, value);
        }
    },
    false);

publish("model/sessionStorage/event/ping", "pong", { retain: true });

