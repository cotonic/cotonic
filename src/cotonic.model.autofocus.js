/**
 * Copyright 2021 The Cotonic Authors. All Rights Reserved.
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


var cotonic = cotonic || {};

(function(cotonic) {
"use strict";

    function isInputElementActive() {
        if (!document.activeElement) {
            return false;
        }
        switch (document.activeElement.tagName) {
            case "INPUT":
            case "TEXTAREA":
            case "SELECT":
                return true;
            default:
                return false;
        }
    }

    cotonic.broker.subscribe("model/ui/event/dom-updated/+key",
        function(msg, bindings) {
            if (!isInputElementActive()) {
                // Check if inside the element with id 'key' is a
                // visible element with the 'autofocus' attribute
                let selector = "#" + bindings.key + " [autofocus]";
                let element = document.querySelector(selector);

                if (element && window.getComputedStyle(element).display !== "none") {
                    element.focus();
                    cotonic.broker.publish(
                        cotonic.mqtt.fill("model/autofocus/event/focus/+key", bindings)
                    );
                }
            }
        }
    );

}(cotonic));
