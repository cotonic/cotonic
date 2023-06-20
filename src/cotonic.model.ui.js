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

import { publish, subscribe, call } from "./cotonic.broker.js";
import { on, get, insert, remove, update, render,
    updateStateClass, updateStateData } from "./cotonic.ui.js";

let is_activity_event = false;
let render_serial = 1;
const render_cache = {};

function maybeRespond(result, properties) {
    if(properties.response_topic) {
        publish(properties.response_topic, result);
    }
}

function hashCode( s ) {
    let hash = 0, i = 0, len = s.length;
    while ( i < len ) {
        hash  = ((hash << 5) - hash + s.charCodeAt(i++)) << 0;
    }
    return hash;
}

function init() {
    // Track activity, for refreshing active sessions
    document.addEventListener("visibilitychange", activity_event, { passive: true });
    document.addEventListener("scroll", activity_event, { passive: true });
    document.addEventListener("keydown", activity_event, { passive: true });
    document.addEventListener("mousemove", activity_event, { passive: true });
    document.addEventListener("click", activity_event, { passive: true });
    document.addEventListener("focus", activity_event, { passive: true });
    setInterval(activity_publish, 10000);

    initTopicEvents(document);

    IncrementalDOM.notifications.nodesCreated = function(nodes) {
        for(const n in nodes) {
            if(!n.id) continue;
            publish("model/ui/event/node-created/" + n.id, {id: n.id});
        }
    };

    IncrementalDOM.notifications.nodesDeleted = function(nodes) {
        for(const n in nodes) {
            if(!n.id) continue;
            publish("model/ui/event/node-deleted/" + n.id, {id: n.id});
        }
    };

    /* 
     * Check if there are buffered events which are triggered before
     * the cotonic library was loaded. When there are, publish the
     * events.
     */
    if (globalThis.cotonic && globalThis.cotonic.bufferedEvents) {
        for (const e in globalThis.cotonic.bufferedEvents) {
            topic_event(globalThis.cotonic.bufferedEvents[e], true);
        }
        globalThis.cotonic.bufferedEvents = [];
    }
}

// Hook into topic-connected event handlers (submit, click, etc.)
function initTopicEvents(elt) {
    elt.addEventListener("submit", topic_event);
    elt.addEventListener("click", topic_event);
}

// The topic 'model/ui/event/recent-activity' is periodically pinged with a flag
// signifying if there was user activity in the previous period.

function activity_event() {
    is_activity_event = true;
}

function activity_publish() {
    publish("model/ui/event/recent-activity", { is_active: is_activity_event });
    is_activity_event = false;
}

// Map form submit and element clicks to topics.

function topic_event( event, isBuffered ) {
    const topicName = `on${ event.type }Topic`;
    let topicTarget = undefined;

    let elt = event.target;
    while(elt) {
        if(topicName in elt.dataset) {
            topicTarget = elt;
            break;
        } 

        elt = elt.parentElement;
    }

    if(!topicTarget)
        return;

    const topic = topicTarget.dataset[topicName]
    let msg;
    let cancel = true;

    if (isBuffered) {
        // Buffered events are already canceled
        cancel = false;
    } else {
        let cancel = getFromDataset(event.target, topicTarget, `on${ event.type }Cancel`);

        switch (cancel) {
            case "0":
            case "no":
            case "false":
                cancel = false;
                break;
            case "preventDefault":
                cancel = 'preventDefault';
                break;
            default:
                cancel = true;
                break;
        }
    }

    msg = getFromDataset(event.target, topicTarget, `on${ event.type }Message`);
    if(msg) {
        msg = JSON.parse(msg);
    } else {
        msg = getAttributes(event.target, topicTarget);
    }

    let options = {
        cancel: cancel
    };

    const responseTopic = getFromDataset(event.target, topicTarget, `on${ event.type }ResponseTopic`);
    if (responseTopic) {
        options.response_topic = responseTopic;
    }

    on(topic, msg, event, options);

    if(event.type === "submit" && "onsubmitReset" in topicTarget.dataset) {
        topicTarget.reset();
    }
}

function getFromDataset(startElt, endElt, name) {
    let elt = startElt;

    do {
        if(name in elt.dataset) {
            return elt.dataset[name];
        }

        if(elt === endElt) 
            break;

        elt = elt.parentElement;
    } while(elt);
}

function getAttributes(startElt, endElt) {
    let elt = startElt;
    let attrs = {};

    do {
        let attributes = elt.attributes;
        for(let i = attributes.length - 1; i >= 0; i--) {
            let name = attributes[i].name;

            if(!attrs[name]) {
                attrs[name] = attributes[i].value;
            }
        }

        if(elt === endElt)
            break;

        elt = elt.parentElement;
    } while(elt);

    return attrs;
}

    // Bind the ui composer to the 'model/ui/#' topics

subscribe("model/ui/render",
    function(msg) {
        maybeRespond(render(), msg.properties);
    },
    {wid: "model.ui"}
);

subscribe("model/ui/render/+key",
    function(msg, bindings) {
        maybeRespond(render(bindings.key), msg.properties);
    },
    {wid: "model.ui"}
);

subscribe("model/ui/get/+key",
    function(msg, bindings) {
        if(msg.properties.response_topic) {
            publish(msg.properties.response_topic, get(bindings.key));
        }
    },
    {wid: "model.ui"}
);

subscribe("model/ui/insert/+key",
    function(msg, bindings) {
        const p = msg.payload || {};
        if (typeof p === "object" && p.status === "ok" && typeof p.result === "string") {
            maybeRespond(insert(bindings.key, true, p.result, undefined), msg.properties);
        } else {
            maybeRespond(insert(bindings.key, p.inner, p.initialData, p.priority), msg.properties);
        }
    },
    {wid: "model.ui"}
);

subscribe("model/ui/update/+key",
    function(msg, bindings) {
        const p = msg.payload || "";
        let html;
        if (typeof p === "object" && p.status === "ok" && typeof p.result === "string") {
            html = p.result;
        } else {
            html = p;
        }
        maybeRespond(update(bindings.key, html), msg.properties);
    },
    {wid: "model.ui"}
);

subscribe("model/ui/render-template/+key",
    function(msg, bindings) {
        const topic = msg.payload.topic;
        const data = msg.payload.data || {};
        const key = bindings.key;
        const dedup = msg.payload.dedup || false;
        const newHash = hashCode( JSON.stringify([topic,data]) );

        if (!dedup || !render_cache[key] || render_cache[key].hash != newHash) {
            const serial = render_serial++;

            render_cache[key] = {
                serial: serial,
                dedup: dedup,
                hash: newHash,
                topic: topic,
                data: data
            };

            call(topic, data, { qos: dedup ? 1 : 0 })
                .then(function(rendermsg) {
                    if (serial === render_cache[key].serial) {
                        const p = rendermsg.payload || "";
                        let html;
                        if (typeof p === "object" && p.status === "ok" && typeof p.result === "string") {
                            html = p.result;
                        } else {
                            html = p;
                        }
                        maybeRespond(cotonic.ui.update(key, html), msg.properties);
                    } else {
                        maybeRespond({ is_changed: false }, msg.properties);
                    }
                });
        } else {
            maybeRespond({ is_changed: false }, msg.properties);
        }
    },
    {wid: "model.ui"}
);

subscribe("model/ui/delete/+key",
    function(msg, bindings) {
        maybeRespond(remove(bindings.key), msg.properties);
    }
);

// Bind to the model ui-status events and update the cotonic.ui

subscribe("model/+model/event/ui-status",
    function(msg, bindings) {
        if ("status" in msg.payload) {
            updateStateData(bindings.model, msg.payload.status);
        }
        if ("classes" in msg.payload) {
            updateStateClass(bindings.model, msg.payload.classes);
        }
    },
    {wid: "model.ui"}
);

// Init the topic event listener when new shadow roots are added.
subscribe("model/ui/event/new-shadow-root/+",
    function(msg) {
        initTopicEvents(msg.payload.shadow_root);
    },
    {wid: "model.ui"}
);

init();
