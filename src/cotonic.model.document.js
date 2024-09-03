/**
 * Copyright 2018-2024 The Cotonic Authors. All Rights Reserved.
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
subscribe("model/document/get/cookie/+key",
    (msg, bindings) => {
        if(msg.properties.response_topic) {
            publish(msg.properties.response_topic, getCookie(bindings.key));
        }
    },
    {wid: "model.document"}
);

subscribe("model/document/post/cookie/+key",
    (msg, bindings) => {
        setCookie(bindings.key, msg.payload.value, msg.payload.exdays, msg.payload.samesite);
        if(msg.properties.response_topic) {
            publish(msg.properties.response_topic, getCookie(bindings.key));
        }
    },
    {wid: "model.document"}
);

function getCookie(cname) {
    const name = cname + "=";
    const ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

function setCookie(cname, cvalue, exdays, csamesite) {
    let expires = "";
    if (typeof exdays == "number") {
        if (exdays == 0) {
            expires = "; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        } else {
            const exmsec = (exdays ?? 0)  * 24 * 60 * 60 * 1000;
            const d = new Date();
            d.setTime(d.getTime() + exmsec);
            expires = "; expires="+d.toUTCString();
        }
    }
    const value = cleanCookieValue(cvalue ?? "");
    const name = cleanCookieValue(cname);

    let samesite = csamesite ?? "None";
    switch (samesite.toLowerCase()) {
        case "strict":
            samesite = "Strict";
            break;
        case "lax":
            samesite = "Lax";
            break;
        case "none":
        default:
            samesite = "None";
            break;
    }

    let secure = "Secure; ";
    if (document.location.protocol == 'http:') {
        secure = "";
    }
    document.cookie = name + "=" + value + expires + "; path=/; " + secure + "SameSite=" + samesite;
}

function cleanCookieValue(v) {
    v = v.replace(";", "")
         .replace(",", "")
         .replace("=", "")
         .replace("\n", "")
         .replace("\t", "")
         .replace("\r", "")
         .replace("\x0b", "")
         .replace("\x0c", "");
    return v;
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
    const prefixes = ' -webkit- -moz- -o- -ms- '.split(' ');
    const mq = function(query) {
        return window.matchMedia(query).matches;
    };
    if (('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch) {
        return true;
    }
    const query = ['(', prefixes.join('touch-enabled),('), 'heartz', ')'].join('');
    return mq(query);
}

