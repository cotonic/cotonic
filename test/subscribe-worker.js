/**
 * Test worker which connects, and subscribes, and does nothing else.
 */

import * as worker from "/src/cotonic.worker.js";

self.connect({name: "subscribe-worker"}).then(
    function() {
        self.subscribe("test/a/b",
            function(msg, params) {
                console.log(msg, params);
            }
        )
    }
)
