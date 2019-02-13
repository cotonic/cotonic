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

    var is_activity_event = false;

    function maybeRespond(result, properties) {
        if(properties.response_topic) {
            cotonic.broker.publish(msg.properties.response_topic, result);
        }
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

        // Hook into topic-connected event handlers (submit, click, etc.)
        document.addEventListener("submit", topic_event);
        document.addEventListener("click", topic_event);
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

    function topic_event( event ) {
        let topic = event.target.getAttribute( "data-on"+event.type+"-topic" );

        if (typeof topic === "string") {
            let msg = event.target.getAttribute( "data-on"+event.type+"-message" );
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
            if (typeof msg === "string") {
                msg = JSON.parse(msg);
            }
            cotonic.ui.on(topic, msg, event, { cancel: cancel });
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
            const p = msg.payload;
            maybeRespond(cotonic.ui.insert(bindings.key, p.inner, p.initialData, p.priority), msg.properties);
            cotonic.broker.publish("model/ui/event/" + bindings.key, p.initialData);
        }
    );

    cotonic.broker.subscribe("model/ui/update/+key",
        function(msg, bindings) {
            maybeRespond(cotonic.ui.update(bindings.key, msg.payload), msg.properties);
            cotonic.broker.publish("model/ui/event/" + bindings.key, msg.payload);
        }
    );

    cotonic.broker.subscribe("model/ui/delete/+key",
        function(msg, bindings) {
            maybeRespond(cotonic.ui.remove(bindings.key), msg.properties);
            cotonic.broker.publish("model/ui/event/" + bindings.key, undefined);
        }
    );

    // Bind to the authentication change events

    cotonic.broker.subscribe("model/auth/event/auth-changing",
        function(msg, bindings) {
            // Authentication is changing, possible actions:
            // - Reload page
            // - Redirect to other page (from the 'p' query argument, passed via 'onauth')
            // - Do nothing (the ui will adapt itself)
            let onauth = msg.payload.onauth || document.body.parentNode.getAttribute("data-onauth");

            if (onauth === null || onauth === '#reload') {
                window.location.reload(true);
            } else if (onauth.charAt(0) == '/') {
                window.location.href = onauth;
            } else if (onauth.charAt(0) == '#') {
                window.location.hash = onauth;
            }
        }
    );

    init();

}(cotonic));
