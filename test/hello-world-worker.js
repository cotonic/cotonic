/**
 * Test worker.
 */

"use strict";

importScripts("/src/cotonic.mqtt.js");
importScripts("/src/cotonic.worker.js");


self.connect("test-worker").then(function() {
    self.postMessage("Hello world!");
})

