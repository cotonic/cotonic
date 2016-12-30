//
// HTML Tokenizer Tests.
//

"use strict";

QUnit.test("Worker", function(assert) {
    var worker = new Worker("test-worker.js");

    assert.deepEqual([], [], "Worker nothing");
});