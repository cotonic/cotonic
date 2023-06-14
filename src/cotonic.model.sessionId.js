/**
 * Copyright 2021-2023 The Cotonic Authors. All Rights Reserved.
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

function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
}

function setcookie(value) {
    publish("model/document/post/cookie/cotonic-sid",
        { value: value, exdays: 14 });
}

function generate() {
    let value = s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    window.localStorage.setItem("cotonic-sid", JSON.stringify(value));
    publish("model/document/post/cookie/cotonic-sid",
        { value: value, exdays: 4 });
    publish("model/sessionId/event", value);
    return value;
}

subscribe("model/sessionId/get",
    function(msg, bindings) {
        if (msg.properties.response_topic) {
            let value = window.localStorage.getItem("cotonic-sid");
            if (typeof value == "string") {
                try { value = JSON.parse(value); }
                catch (e) {
                    value = generate();
                }
            } else {
                value = generate();
            }
            publish(msg.properties.response_topic, value);
        }
    }
    {wid: "model.sessionId"}
);

subscribe("model/sessionId/post/reset",
    function(msg, bindings) {
        let value = generate();
        if (msg.properties.response_topic) {
            cotonic.broker.publish(msg.properties.response_topic, value);
        }
    },
    {wid: "model.sessionId"}
);

subscribe("model/sessionId/delete",
    function(msg, bindings) {
        window.localStorage.removeItem("cotonic-sid");
        if (msg.properties.response_topic) {
            publish(msg.properties.response_topic, null);
        }
        publish("model/document/post/cookie/cotonic-sid",
            { value: "", exdays: 0 });
        publish("model/sessionId/event", null);
    },
    {wid: "model.sessionId"}

);

subscribe("model/localStorage/event/cotonic-sid",
    (value) => {
        publish("model/sessionId/event", value);
    },
    {wid: "model.sessionId"}
);


function init() {
    let value = window.localStorage.getItem("cotonic-sid");
    if (typeof value == "string") {
        try {
            value = JSON.parse(value);
            if (typeof value == "string" && value !== "") {
                setcookie(value);
            } else {
                generate();
            }
        }
        catch (e) {
            value = generate();
        }
    } else {
        value = generate();
    }
}

init();

publish("model/sessionId/event/ping", "pong", { retain: true });
