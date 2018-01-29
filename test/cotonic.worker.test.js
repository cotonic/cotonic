//
// HTML Worker Tests.
//

"use strict";

QUnit.test("Receive connect from worker", function(assert) {
    assert.timeout(500);

    var done = assert.async();
    var worker = new Worker("connect-worker.js");

    worker.onmessage = function(e) {
        var cmd = e.data.cmd;
        assert.equal(cmd, "connect");
        done();
    }
});

QUnit.test("Connect and connack worker", function(assert) {
    assert.timeout(500);

    var done = assert.async();
    var worker = new Worker("hello-world-worker.js");

    var connected = false;

    worker.onmessage = function(e) {
        if(!connected) {
            var cmd = e.data.cmd;
            assert.equal(cmd, "connect");
            connected = true;
            worker.postMessage({cmd: "connack"})
        } else {
            // The hello world worker sends a normal postMessage
            assert.equal(e.data, "Hello world!")
            done();
        }
    }
});
