//
// HTML Worker Tests.
//

"use strict";

QUnit.test("Receive connect from worker", function(assert) {
    assert.timeout(500);

    var done = assert.async();
    var worker = new Worker("test-worker.js");

    worker.onmessage = function(e) {
        var cmd = e.data.cmd;
        assert.equal(cmd, "connect");
        done();
    }
});
