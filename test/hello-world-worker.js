/**
 * Test worker.
 */

self.connect("test-worker").then(function() {
    self.postMessage("Hello world!");
})

