/**
 * Test worker.
 */

"use strict";

importScripts("../src/cotonic.worker.js");


self.on_connect = function() {
    console.log("connected")

    var foo_id = self.subscribe("~pagesession/foo", function(topic, payload) {
        console.log("got foo: " + payload);
    })

    var bar_id = self.subscribe("~pagesession/bar", function(topic, payload) {
        console.log("got bar: " + payload);
    })
}

self.connect("test-worker");