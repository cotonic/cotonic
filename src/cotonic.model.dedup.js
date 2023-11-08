/**
 * Copyright 2023 The Cotonic Authors. All Rights Reserved.
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

// Default timeout after which we consider a message to be lost.
const TIMEOUT = 15000;

// All messages that are in-flight, if a new message arrives then
// that is recorded as queued.
const in_flight = {};

function init() {
    publish("model/dedup/event/ping", "pong", { retain: true });
}

function key(message) {
    const key = message.payload.topic
            + "::"
            + (message.properties?.response_topic ?? "");
    return btoa(key);
}

function deep_copy(o) {
    return JSON.parse(JSON.stringify(o));
}

function dedup(msg, key) {
    const timeout = msg.payload.timeout ?? TIMEOUT;
    let m = in_flight[key];

    if (m) {
        m.queued_message = msg;
        m.queued_timeout = Date.now() + timeout;
    } else {
        m = {
            response_topic: msg.properties?.response_topic,
            queued_message: undefined,
            queued_timeout: undefined,
            timeout: setTimeout(() => { done(false, key); }, timeout)
        }
        in_flight[key] = m;

        const options = {
            qos: msg.qos,
            properties: {
                response_topic: "model/dedup/post/done/" + key
            }
        }
        publish(msg.payload.topic, msg.payload.payload, options);
    }
}

function done(response, key) {
    const m = in_flight[key];

    if (m) {
        delete in_flight[key];

        if (m.timeout) {
            clearTimeout(m.timeout);
        }
        if (response !== false && m.response_topic) {
            publish(m.response_topic, response.payload, { qos: response.qos ?? 0 });
        }
        if (m.queued_message && Date.now() < m.queued_timeout) {
            dedup(m.queued_message, key);
        }
    }
}

subscribe("model/dedup/post/done/+key", (msg, bindings) => {
    done(msg, bindings.key);
});

subscribe("model/dedup/post/message", (msg) => {
        dedup(msg, key(msg));
    },
    {wid: "model.dedup"}
);

subscribe("model/dedup/post/message/+key", (msg, bindings) => {
        dedup(msg, bindings.key);
    },
    {wid: "model.dedup"}
);

init();
