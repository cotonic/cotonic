/**
 * Test worker which connects, subscribes, and unsubscribes.
 */

"use strict";

importScripts("/src/cotonic.mqtt.js");

console.log("subscribe-unsubscribe-worker start")


self.on_connect = function() {
    console.log("subscribe-unsubscribe-worker connect")
     
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
