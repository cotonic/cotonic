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

import { subscribe, publish } from "cotonic.broker";

subscribe("model/document/get/+key",
    (msg, bindings) => {
        let value = {};
        switch (bindings.key) {
            case "all":
                value = {
                    screen_width: window.screen.width,
                    screen_height: window.screen.height,
                    inner_width: window.innerWidth,
                    inner_height: window.innerHeight,
                    is_touch: is_touch_device(),
                    timezone: timezone_info(),
                    language: language_info()
                };
                break;
            case "intl":
                value = {
                    timezone: timezone_info(),
                    language: language_info()
                };
                break;
            default:
                value = null;
                break;
        }
        if(msg.properties.response_topic) {
            publish(msg.properties.response_topic, value);
        }
    },
    {wid: "model.document"}
);

// Used to fetch z.tz and z.lang cookies
broker.subscribe("model/document/get/cookie/+key",
    (msg, bindings) => {
        if(msg.properties.response_topic) {
            publish(msg.properties.response_topic, getCookie(bindings.key));
        }
    },
    {wid: "model.document"}
);

subscribe("model/document/post/cookie/+key",
    (msg, bindings) => {
        setCookie(bindings.key, msg.payload.value, msg.payload.exdays);
        if(msg.properties.response_topic) {
            publish(msg.properties.response_topic, getCookie(bindings.key));
        }
    },
    {wid: "model.document"}
);

function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue + "; " + expires + "; path=/; Secure; SameSite=None";
}

// TODO: handle case of fixed/guessed timezone
function timezone_info() {
    return {
        cookie: getCookie("z.tz"),
        user_agent: timezone()
    };
}

function language_info() {
    return {
        cookie: getCookie("z.lang"),
        user_agent: navigator.language,
        document: document.body.parentElement.getAttribute("lang")
    };
}

// Return the timezone of the browser, return null if none could be determined
function timezone() {
    if (typeof Intl === "object" && typeof Intl.DateTimeFormat === "function") {
        let options = Intl.DateTimeFormat().resolvedOptions();
        if (typeof options === "object" && options.timeZone) {
            return options.timeZone;
        }
    }
    if (typeof window.jstz === "object") {
        return window.jstz.determine().name();
    }
    if (typeof window.moment === "object" && typeof window.moment.tz === "function") {
        return window.moment.tz();
    }
    return null;
}

function is_touch_device() {
    var prefixes = ' -webkit- -moz- -o- -ms- '.split(' ');
    var mq = function(query) {
        return window.matchMedia(query).matches;
    };
    if (('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch) {
        return true;
    }
    var query = ['(', prefixes.join('touch-enabled),('), 'heartz', ')'].join('');
    return mq(query);
}

