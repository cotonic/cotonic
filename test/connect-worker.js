/**
 * Test worker.
 */

"use strict";

importScripts("/src/polyfill_worker.js",
              "/src/cotonic.mqtt.js",
              "/src/cotonic.worker.js");

self.connect("test-worker");
