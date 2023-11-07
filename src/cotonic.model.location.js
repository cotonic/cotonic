/**
 * Copyright 2019-2023 The Cotonic Authors. All Rights Reserved.
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

import { config } from "./cotonic.js";
import { subscribe, publish } from "./cotonic.broker.js";

let location = {};
let isNavigating = false;

function init() {
    publish("model/location/event/ping", "pong", { retain: true });

    publishLocation( true );
    // Track navigation
    window.addEventListener("hashchange", publishLocation, false);
}

// Publish all info about our current location
function publishLocation( isInit ) {
    const oldhash = location.hash;
    const oldpathname = location.pathname;
    const oldsearch = location.search;
    const oldpathname_search = location.pathname_search;

    location.protocol = window.location.protocol;
    location.port = window.location.port;
    location.host = window.location.host;
    location.hostname = window.location.hostname;
    location.href = window.location.href;
    location.pathname = window.location.pathname;
    location.origin = window.location.origin;
    location.hash = window.location.hash;
    location.search = window.location.search;

    if (isInit) {
        const pathname_search = config.pathname_search || (document.body && document.body.getAttribute("data-cotonic-pathname-search")) || "";
        location.pathname_search = pathname_search;
    }

    if (oldsearch !== location.search || oldpathname_search !== location.pathname_search) {
        // Merge query args from the dispatcher and the query string
        // The dispatcher's query args are derived from the pathname.
        let qlist = searchParamsList(window.location.search);
        const q = searchParamsIndexed(qlist);
        if (isInit && location.pathname_search) {
            const qps = searchParamsList(location.pathname_search);
            const pathq = searchParamsIndexed(qps);
            for (let k in pathq) {
                q[k] = pathq[k];
            }
            qlist = qlist.concat(qps);
        }
        location.q = q;
        location.qlist = qlist;
    }

    publish(
        "model/location/event",
        location,
        { retain: true });

    if (oldpathname !== location.pathname) {
        publish(
            "model/location/event/pathname",
            location.pathname,
            { retain: true });
    }

    if (oldsearch !== location.search || oldpathname_search !== location.pathname_search) {
        publish(
            "model/location/event/q",
            location.q,
            { retain: true });
        publish(
            "model/location/event/qlist",
            location.qlist,
            { retain: true });
    }

    if (oldhash !== location.hash) {
        publish(
            "model/location/event/hash",
            location.hash === "" ? "#" : location.hash,
            { retain: true });

        if (location.hash) {
            const hashTarget = document.getElementById(location.hash.substring(1));
            if (hashTarget) {
                hashTarget.scrollIntoView({ behavior: "smooth" });
            }
        }
    }
}

// Parse the query string, keys with "[]" are appended as an array.
function searchParamsIndexed ( ps ) {
    let q = {};

    for (let i = 0; i < ps.length; i++) {
        const name = ps[i][0];
        const indexed = name.match(/^(.*)\[([^\[]*)\]$/);
        if (indexed) {
            const iname = indexed[1] + '[]';
            if (typeof q[iname] === 'undefined') {
                q[iname] = [];
            }
            if (indexed[2].length > 0) {
                q[iname][indexed[2]] = ps[i][1];
            } else {
                q[iname].push(ps[i][1]);
            }
        } else {
            q[name] = ps[i][1];
        }
    }
    return q;
}

function searchParamsList( qs ) {
    let ps = [];

    const searchParams = new URLSearchParams(qs);
    searchParams.forEach((value, key) => {
        ps.push([key, value]);
    });
    return ps;
}

// Bind to the authentication change events

subscribe("model/auth/event/auth-changing",
    function(msg) {
        if (!isNavigating) {
            // Authentication is changing, possible actions:
            // - Reload page
            // - Redirect to other page (from the 'p' query argument, passed via 'onauth')
            // - Do nothing (the ui will adapt itself)
            let onauth = msg.payload.onauth || document.body.parentNode.getAttribute("data-onauth");

            if (onauth === null || onauth !== "#") {
                setTimeout(function() {
                    if (onauth === null || onauth === '#reload') {
                        window.location.reload(true);
                    } else if (onauth.charAt(0) == '/') {
                        window.location.href = onauth;
                    } else if (onauth.charAt(0) == '#') {
                        window.location.hash = onauth;
                    }
                }, 0);
            }
        }
    },
    {wid: "model.location"}
);

// Model functions
subscribe("model/location/get/+what", function(msg, bindings) {
    var resp = location[bindings.what];
    maybeRespond(resp, msg);
}, {wid: "model.location"});

function payload_url(msg) {
    let url;

    if (msg.payload?.url) {
        url = msg.payload.url;
    } else if (msg.payload?.message?.href) {
        url = msg.payload.message.href;
    } else if (typeof msg.payload == 'string' && msg.payload) {
        url = msg.payload;
    }
    return url;
}

subscribe("model/location/post/push", function(msg) {
    let url = payload_url(msg);
    if (url) {
        url = new URL(url, window.location);
        window.history.replaceState({}, '', url.pathname + url.search + url.hash);
        publishLocation();
    }
}, {wid: "model.location"});

subscribe("model/location/post/replace", function(msg) {
    let url = payload_url(msg);
    if (url) {
        url = new URL(url, window.location);
        window.history.replaceState({}, '', url.pathname + url.search + url.hash);
        publishLocation();
    }
}, {wid: "model.location"});

subscribe("model/location/post/push-silent", function(msg) {
    let url = payload_url(msg);
    if (url) {
        url = new URL(url, window.location);
        window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    }
}, {wid: "model.location"});

subscribe("model/location/post/replace-silent", function(msg) {
    let url = payload_url(msg);
    if (url) {
        url = new URL(url, window.location);
        window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    }
}, {wid: "model.location"});

subscribe("model/location/post/redirect", function(msg) {
    let url = payload_url(msg);
    if (url) {
        window.location = msg.payload.url;
        willNavigate();
    }
}, {wid: "model.location"});

subscribe("model/location/post/redirect-local", function(msg) {
    let url = payload_url(msg);
    if (url) {
        let url = new URL(msg.payload.url, window.location);
        window.location = url.pathname + url.search + url.hash;
        willNavigate();
    }
}, {wid: "model.location"});

subscribe("model/location/post/reload", function(msg) {
    window.location.reload(true);
    willNavigate();
}, {wid: "model.location"});

subscribe("model/location/post/redirect/back", function() {
    if ('referrer' in document) {
        window.location = document.referrer;
    } else {
        window.history.back();
    }
}, {wid: "model.location"});

subscribe("model/location/post/q", function(msg) {
    let args = msg.payload;

    if (typeof args == "object") {
        let s = new URLSearchParams();
        for (const p in args) {
            const v = args[p];

            if (Array.isArray(v)) {
                for (let k = 0; k < v.length; k++) {
                    s.append(p, "" + v[k]);
                }
            } else {
                s.append(p, ""+v);
            }
        }
        window.history.replaceState({}, '', "?" + s.toString());
    } else {
        window.history.replaceState({}, '', "?");
    }
    publishLocation();
}, {wid: "model.location"});

subscribe("model/location/post/qlist", function(msg) {
    const args = msg.payload;
    if (Array.isArray(args) && args.length > 0) {
        let s = new URLSearchParams();
        for (let i = 0; i < args.length; i++) {
            s.append(args[i][0], "" + args[i][1]);
        }
        window.history.replaceState({}, '', "?" + s.toString());
    } else {
        window.history.replaceState({}, '', "?");
    }
    publishLocation();
}, {wid: "model.location"});

subscribe("model/location/post/qlist/submit", function(msg) {
    const args = msg.payload?.valueList ?? [];
    if (Array.isArray(args) && args.length > 0) {
        let s = new URLSearchParams();
        for (let i = 0; i < args.length; i++) {
            s.append(args[i][0], "" + args[i][1]);
        }
        window.history.replaceState({}, '', "?" + s.toString());
    } else {
        window.history.replaceState({}, '', "?");
    }
    publishLocation();
}, {wid: "model.location"});

subscribe("model/location/post/hash", function(msg) {
    const hash = msg.payload;
    if (hash) {
        window.history.replaceState({}, '', "#" + hash);
    } else {
        window.history.replaceState({}, '', "#");
    }
    publishLocation();
}, {wid: "model.location"});


function maybeRespond(result, msg) {
    if(msg.properties.response_topic) {
        publish(msg.properties.response_topic, result);
    }
}

function willNavigate() {
    // Set the isNavigate flag to trigger we are currently
    // busy navigating. When an auth change message is received
    // this will not trigger extra reloads.
    isNavigating = true;
    setTimeout(function() { isNavigating = false; }, 1000);
}

init();
