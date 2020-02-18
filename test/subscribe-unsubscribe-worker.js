/**
 * Test worker which connects, subscribes, and unsubscribes.
 */

"use strict";

importScripts("/src/polyfill_worker.js",
              "/src/cotonic.mqtt.js");

self.on_connect = function() {
    function ab() {
    }

    self.subscribe("test/a/b", ab);
    self.publish("subscribe-unsubscribe-worker/sub");

    self.unsubscribe("test/a/b", ab);
    self.publish("subscribe-unsubscribe-worker/unsub");

    // We are done
    self.publish("subscribe-unsubscribe-worker/done");
}

self.connect("subscribe-unsubscribe-worker");
