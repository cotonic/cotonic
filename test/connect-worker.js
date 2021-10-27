/**
 * Connect worker.
 */

"use strict";

importScripts("/src/cotonic.mqtt.js",
              "/src/cotonic.worker.js");

self.connect({name: "connect-worker"});
