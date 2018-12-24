/**
 * Test worker.
 */

"use strict";

importScripts("../src/cotonic.mqtt.js");
importScripts("../src/cotonic.worker.js");

self.on_connect = function() {
    self.postMessage("Hello world!");
}

self.connect("test-worker");
