/**
 * Connect worker.
 */

import * as worker from "/src/cotonic.worker.js";

let initArgs;

self.on_init = function(args) {
    initArgs = args;
}

// Call connect with a little bit of timeout.
setTimeout(function() {
    self.connect({
        name: "echo-init-args",
        will_payload: initArgs
    });
}, 500);
