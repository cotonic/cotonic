/**
 * Test worker.
 */

"use strict";

console.log("test worker here");

importScripts("/src/cotonic.worker.js");

self.connect({name: "test-worker"}).then(function() {
    console.log("connected");
})

