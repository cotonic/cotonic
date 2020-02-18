/**
 * Test worker.
 */

"use strict";

console.log("test worker here");

importScripts("/src/cotonic.worker.js");

self.on_connect = function() {
    console.log("connected");
}

self.connect("test-worker");
