/**
 * Test worker which connects, subscribes, and unsubscribes.
 */

"use strict";

importScripts("/src/cotonic.mqtt.js");

function init() {
    function ab() {
        // console.log("ab called");
    }

    self.subscribe("test/a/b", ab);
    self.publish("subscribe-unsubscribe-worker/sub");

    self.unsubscribe("test/a/b", ab);
    self.publish("subscribe-unsubscribe-worker/unsub");

    // We are done
    self.publish("subscribe-unsubscribe-worker/done");
}

self.connect({name: "subscribe-unsubscribe-worker"}).then(init);
