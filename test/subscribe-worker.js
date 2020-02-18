/**
 * Test worker which connects, and subscribes, and does nothing else.
 */

"use strict";

importScripts("/src/polyfill_worker.js",
              "/src/cotonic.mqtt.js",
              "/src/cotonic.worker.js");

self.on_connect = function() {
    self.subscribe("test/a/b", function(msg, params) {
        console.log(msg, params);
    })
}

self.connect("subscribe-worker");
