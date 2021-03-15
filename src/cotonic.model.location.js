/**
 * Copyright 2019 The Cotonic Authors. All Rights Reserved.
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

    let location = {};
    let isNavigating = false;

    function init() {
        cotonic.broker.publish("model/location/event/ping", "pong", { retain: true });

        publishLocation( true );
        // Track navigation
        window.addEventListener("hashchange", publishLocation, false);
    }

    // Publish all info about our current location
    function publishLocation() {
        const oldhash = location.hash;
        const oldpathname = location.pathname;
        const oldsearch = location.search;
        const oldpathname_search = location.pathname_search;
        const pathname_search = cotonic.config.pathname_search || (document.body && document.body.getAttribute("data-cotonic-pathname-search")) || "";

        location.protocol = window.location.protocol;
        location.port = window.location.port;
        location.host = window.location.host;
        location.hostname = window.location.hostname;
        location.href = window.location.href;
        location.pathname = window.location.pathname;
        location.origin = window.location.origin;
        location.hash = window.location.hash;
        location.search = window.location.search;
        location.pathname_search = pathname_search;

        if (oldsearch !== location.search || oldpathname_search !== location.pathname_search) {
            // Merge query args from the dispatcher and the query string
            // The dispatcher's query args are derived from the pathname.
            let q = parseQs(window.location.search);
            const pathq = parseQs("?" + pathname_search);
            for (let k in pathq) {
                q[k] = pathq[k];
            }
            location.q = q;
        }

        cotonic.broker.publish(
            "model/location/event",
            location,
            { retain: true });

        if (oldpathname !== location.pathname) {
            cotonic.broker.publish(
                "model/location/event/pathname",
                location.pathname,
                { retain: true });
        }

        if (oldsearch !== location.search || oldpathname_search !== location.pathname_search) {
            cotonic.broker.publish(
                "model/location/event/q",
                location.q,
                { retain: true });
        }

        if (oldhash !== location.hash) {
            cotonic.broker.publish(
                "model/location/event/hash",
                location.hash === "" ? "#" : location.hash,
                { retain: true });
        }
    }

    // Parse the query string, keys with "[]" are appended as an array.
    function parseQs ( qs ) {
        let q = {};
        let ps = [];

        if (typeof(URLSearchParams) === 'function') {
            const searchParams = new URLSearchParams(qs);
            searchParams.forEach(function(value, key) {
                ps.push([ key, value ]);
            });
        } else {
            // For IE11...
            if (qs.length > 0) {
                if (qs[0] === '?') {
                    qs = qs.substr(1);
                }
                var args = qs.split('&');
                for (let i = 0; i < args.length; i++) {
                    if (args[i].length > 0) {
                        let kv = args[i].match(/^([^=]*)(=(.*))$/);
                        let v;

                        if (kv[1].length > 0) {
                            if (typeof(kv[3]) === "string") {
                                v = decodeURIComponent(kv[3]);
                            } else {
                                v = "";
                            }
                        }

                        ps.push([ decodeURIComponent(kv[1]), v ]);
                    }
                }
            }
        }
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

    // Bind to the authentication change events

    cotonic.broker.subscribe("model/auth/event/auth-changing",
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
        }
    );

    // Model functions

    cotonic.broker.subscribe("model/location/get/+what", function(msg, bindings) {
        var resp = location[bindings.what];
        maybeRespond(resp, msg);
    });

    cotonic.broker.subscribe("model/location/post/redirect", function(msg) {
        if (msg.payload.url) {
            window.location = msg.payload.url;
            isNavigating = true;
            setTimeout(function() { isNavigating = false; }, 1000);
        }
    });

    cotonic.broker.subscribe("model/location/post/redirect/back", function() {
        if ('referrer' in document) {
            window.location = document.referrer;
        } else {
            window.history.back();
        }
    });

    function maybeRespond(result, msg) {
        if(msg.properties.response_topic) {
            cotonic.broker.publish(msg.properties.response_topic, result);
        }
    }

    init();

}(cotonic));
