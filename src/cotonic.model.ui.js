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

    let is_activity_event = false;
    let render_serial = 1;
    const render_cache = {};

    function maybeRespond(result, properties) {
        if(properties.response_topic) {
            cotonic.broker.publish(properties.response_topic, result);
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
                cotonic.broker.publish("model/ui/event/node-created/" + n.id, {id: n.id});
            }
        }

        IncrementalDOM.notifications.nodesDeleted = function(nodes) {
            for(const n in nodes) {
                if(!n.id) continue;
                cotonic.broker.publish("model/ui/event/node-deleted/" + n.id, {id: n.id});
            }
        }

        if (cotonic.bufferedEvents) {
            for (const e in cotonic.bufferedEvents) {
                topic_event(cotonic.bufferedEvents[e], true);
            }
            cotonic.bufferedEvents = [];
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
        cotonic.broker.publish("model/ui/event/recent-activity", { is_active: is_activity_event });
        is_activity_event = false;
    }

    // Map form submit and element clicks to topics.

    function topic_event( event, isBuffered ) {
        const topic = event.target.getAttribute( "data-on"+event.type+"-topic" );
        let msg;

        if (typeof topic === "string") {
            let cancel = true;

            if (isBuffered) {
                // Buffered events are already canceled
                cancel = false;
            } else {
                let cancel = event.target.getAttribute( "data-on"+event.type+"-cancel" );

                if (cancel === null) {
                    cancel = true;
                } else {
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
            }

            if (event.target.hasAttribute( "data-on"+event.type+"-message" )) {
                msg = event.target.getAttribute( "data-on"+event.type+"-message" );
                if (typeof msg === "string") {
                    msg = JSON.parse(msg);
                }
            } else {
                let attrs = event.target.attributes;
                msg = {};
                for (let i = attrs.length - 1; i >= 0; i--) {
                    msg[attrs[i].name] = attrs[i].value;
                }
            }

            let options = {
                cancel: cancel
            }

            if (event.target.hasAttribute( "data-on"+event.type+"-response-topic" )) {
                options.response_topic = event.target.getAttribute( "data-on"+event.type+"-response-topic" )
            }

            cotonic.ui.on(topic, msg, event, options);

            if(event.type === "submit" && event.target.getAttribute("data-onsubmit-reset") !== null) {
                event.target.reset();
            }
        }
    }

    // Bind the ui composer to the 'model/ui/#' topics

    cotonic.broker.subscribe("model/ui/render",
        function(msg, bindings) {
            maybeRespond(cotonic.ui.render(), msg.properties);
        }
    );

    cotonic.broker.subscribe("model/ui/render/+key",
        function(msg, bindings) {
            maybeRespond(cotonic.ui.render(bindings.key), msg.properties);
        }
    );

    cotonic.broker.subscribe("model/ui/get/+key",
        function(msg, bindings) {
            if(msg.properties.response_topic) {
                cotonic.broker.publish(msg.properties.response_topic, ui.get(bindings.key));
            }
        }
    );

    cotonic.broker.subscribe("model/ui/insert/+key",
        function(msg, bindings) {
            const p = msg.payload || {};
            if (typeof p === "object" && p.status === "ok" && typeof p.result === "string") {
                maybeRespond(cotonic.ui.insert(bindings.key, true, p.result, undefined), msg.properties);
            } else {
                maybeRespond(cotonic.ui.insert(bindings.key, p.inner, p.initialData, p.priority), msg.properties);
            }
        }
    );

    cotonic.broker.subscribe("model/ui/update/+key",
        function(msg, bindings) {
            const p = msg.payload || "";
            let html;
            if (typeof p === "object" && p.status === "ok" && typeof p.result === "string") {
                html = p.result;
            } else {
                html = p;
            }
            maybeRespond(cotonic.ui.update(bindings.key, html), msg.properties);
        }
    );

    cotonic.broker.subscribe("model/ui/render-template/+key",
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

                cotonic.broker.call(topic, data, { qos: dedup ? 1 : 0 })
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
        }
    );

    cotonic.broker.subscribe("model/ui/delete/+key",
        function(msg, bindings) {
            maybeRespond(cotonic.ui.remove(bindings.key), msg.properties);
        }
    );

    // Bind to the model ui-status events and update the cotonic.ui

    cotonic.broker.subscribe("model/+model/event/ui-status",
        function(msg, bindings) {
            if ("status" in msg.payload) {
                cotonic.ui.updateStateData(bindings.model, msg.payload.status);
            }
            if ("classes" in msg.payload) {
                cotonic.ui.updateStateClass(bindings.model, msg.payload.classes);
            }
        }
    );

    // Init the topic event listener when new shadow roots are added.
    cotonic.broker.subscribe("model/ui/event/new-shadow-root/+",
        function(msg, bindings) {
            initTopicEvents(msg.payload.shadow_root);
        }
    );

    init();

}(cotonic));
