/**
 * Copyright 2020-2023 The Cotonic Authors. All Rights Reserved.
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

(function(cotonic) {
"use strict";

    cotonic = cotonic || {};

    function init() {
        cotonic.broker.publish("model/window/event/ping", "pong", { retain: true });
        cotonic.broker.publish("model/location/event/ui-status", {
            status: {
                is_opener: !!window.opener
            }
        }, { retain: true });
    }

    cotonic.broker.subscribe("model/window/post/close",
        function(msg) {
            let result;

            if (window.opener) {
                window.close();
                result = true;
            } else if (msg.payload && msg.payload.url) {
                cotonic.broker.publish("model/location/post/redirect", { url: msg.payload.url });
                result = true;
            } else if (msg.payload && msg.payload.message && msg.payload.message.href) {
                cotonic.broker.publish("model/location/post/redirect", { url: msg.payload.message.href });
                result = true;
            } else {
                result = false;
            }
            if(msg.properties.response_topic) {
                cotonic.broker.publish(msg.properties.response_topic, result);
            }
        });

    cotonic.broker.subscribe("model/window/post/open",
        function(msg) {
            let options = {
                full:0,             // set the height/width to the current window, show scrollbars etc.
                centerBrowser:1,    // center window over browser window? {1 (YES) or 0 (NO)}. overrides top and left
                centerScreen:0,     // center window over entire screen? {1 (YES) or 0 (NO)}. overrides top and left
                height:500,         // sets the height in pixels of the window.
                left:0,             // left position when the window appears.
                location:0,         // determines whether the address bar is displayed {1 (YES) or 0 (NO)}.
                menubar:0,          // determines whether the menu bar is displayed {1 (YES) or 0 (NO)}.
                resizable:0,        // whether the window can be resized {1 (YES) or 0 (NO)}. Can also be overloaded using resizable.
                scrollbars:0,       // determines whether scrollbars appear on the window {1 (YES) or 0 (NO)}.
                status:0,           // whether a status line appears at the bottom of the window {1 (YES) or 0 (NO)}.
                width:500,          // sets the width in pixels of the window.
                name:null,          // name of window
                top:0,              // top position when the window appears.
                toolbar:0           // determines whether a toolbar (includes the forward and back buttons) is displayed {1 (YES) or 0 (NO)}.
            };

            if (typeof msg.payload.message == "object") {
                let attrs = msg.payload.message;
                if (attrs.href) {
                    options.url = msg.payload.message.href;
                    if (msg.payload.message['data-window']) {
                        if (typeof msg.payload.message['data-window'] == "string") {
                            attrs = JSON.parse(msg.payload.message['data-window']);
                        }
                    } else {
                        attrs = {};
                    }
                }
                let keys = Object.keys(attrs);
                for (let k in keys) {
                    options[k] = attrs[k];
                }
                let features = 'height=' + options.height +
                               ',width=' + options.width +
                               ',toolbar=' + (options.toolbar?'yes':'no') +
                               ',scrollbars=' + (options.scrollbars?'yes':'no') +
                               ',status=' + (options.status?'yes':'no') +
                               ',resizable=' + (options.resizable?'yes':'no') +
                               ',location=' + (options.location?'yes':'no') +
                               ',menubar=' + (options.menubar?'yes':'no');

                let top, left;

                if (options.centerBrowser && !options.centerScreen) {
                    top = window.screenY + (((window.outerHeight/2) - (options.height/2)));
                    left = window.screenX + (((window.outerWidth/2) - (options.width/2)));
                } else if (options.centerScreen) {
                    top = (screen.height - options.height)/2;
                    left = (screen.width - options.width)/2;
                } else {
                    top = options.top;
                    left = options.left;
                }
                if (options.name) {
                    options.name = options.name.replace(/[^a-zA-Z0-9]/g,'_');
                }
                let w = window.open(options.url, options.name, features+',left='+Math.ceil(left)+',top='+Math.ceil(top));
                // setTimeout(
                //     function() {
                //         if (w.innerWidth != undefined && w.innerWidth > 0) {
                //             w.resizeBy(options.width - w.innerWidth, options.height - w.innerHeight);
                //         }
                //     }, 500);
                w.focus();
            }
        });

    init();

}(cotonic));

