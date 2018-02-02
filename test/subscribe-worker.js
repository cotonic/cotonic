/**
 * Test worker which connects, and subscribes, and does nothing else.
 */

"use strict";

importScripts("../src/cotonic.worker.js");

self.on_connect = function() {
    self.subscribe("test/a/b", function(topic, msg) {
        console.log(topic, msg);
    })
}

self.connect("subscribe-worker");
