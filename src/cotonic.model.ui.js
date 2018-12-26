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

    function maybeRespond(result, properties) {
        if(properties.response_topic) {
            cotonic.broker.publish(msg.properties.response_topic, result);
        }
    }

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

}(cotonic));
