/**
 * Connect worker.
 */

import * as worker from "/src/cotonic.worker.js";

self.connect({name: "connect-worker"});
