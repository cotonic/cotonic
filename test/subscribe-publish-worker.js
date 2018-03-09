/**
 * Test worker which connects, and subscribes, and does nothing else.
 */

"use strict";

importScripts("../src/cotonic.mqtt.js", "../src/cotonic.worker.js");

self.on_connect = function() {
    self.subscribe("test/a/b", function(msg, params) {
	self.postMessage("Hello to you too");
    })
}

self.connect("subscribe-publish-worker");
