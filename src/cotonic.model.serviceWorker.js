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

/* Starts the service worker and adds message relay topics */

var cotonic = cotonic || {};

(function(cotonic) {
"use strict";
    const console = window.console;

    cotonic.load_config_defaults(
        {start_service_worker: true,
         service_worker_src: "/cotonic-service-worker.js"});

    if (cotonic.config.start_service_worker && navigator.serviceWorker) {
        navigator.serviceWorker
            .register(cotonic.config.service_worker_src)
            .then(
                function(registration) {
                    cotonic.broker.publish("model/serviceWorker/event/state", "registered", { retain: true });
                },
                function(error) {
                    cotonic.broker.publish("model/serviceWorker/event/state", "errored", { retain: true });
                    switch (error.name) {
                        case 'SecurityError':
                            console.warn("Could not start serviceWorker due to a SecurityError.");
                            console.warn("See https://cotonic.org/#model.serviceWorker for more information.");
                            break;
                        default:
                            console.warn("Could not start serviceWorker: ", error.message);
                            break;
                    }
                }
            );

        navigator.serviceWorker.addEventListener('message', function(event) {
            switch (event.data.type) {
                case "broadcast":
                    let message = event.data.message;
                    message.topic = "model/serviceWorker/event/broadcast/" + event.data.channel;
                    cotonic.broker.publish_mqtt_message(message);
                    break;
                default:
                    console.log("Unknown event from service worker", event);
                    break;
            }
        });
    } else {
        cotonic.broker.publish("model/serviceWorker/event/state", "unregistered", { retain: true });
    }

    cotonic.broker.subscribe("model/serviceWorker/post/broadcast/+channel", function(msg, bindings) {
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            let data = {
                type: "broadcast",
                message: msg,
                channel: bindings.channel
            };
            navigator.serviceWorker.controller.postMessage(data);
        } else {
            msg.topic = "model/serviceWorker/event/broadcast/" + bindings.channel;
            cotonic.broker.publish_mqtt_message(msg);
        }
    });

    cotonic.broker.publish("model/serviceWorker/event/ping", "pong", { retain: true });

}(cotonic));
