/**
 * Test worker.
 */

"use strict";

importScripts("../src/cotonic.worker.js");

self.on_connect = function() {
    console.log("connected");
}

self.connect("test-worker");
