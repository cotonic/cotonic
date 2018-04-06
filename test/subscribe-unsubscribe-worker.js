/**
 * Test worker which connects, and subscribes, and does nothing else.
 */

"use strict";

importScripts("../src/cotonic.mqtt.js", "../src/cotonic.worker.js");

self.on_connect = function() {
    var pubct = -100;

    function onpubcheck(msg, params) {
        self.postMessage(pubct);
    }

    function unsuback(msg, params) {
        pubct = 0;
    }

    function onpub(msg, params) {
        if (pubct == -100) {
            self.unsubscribe("test/a/b", unsuback);
            pubct = 1;
        } else {
            pubct++;
        }
    }

    self.subscribe("test/a/b", onpub);
    self.subscribe("test/check", onpubcheck);
}

self.connect("subscribe-worker");
