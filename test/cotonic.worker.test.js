//
// HTML Worker Tests.
//

"use strict";

QUnit.test("Receive connect from worker", function(assert) {
    assert.timeout(500);
    var done = assert.async();

    var worker = new Worker("connect-worker.js");
    worker.postMessage(["init", {}]);

    worker.onmessage = function(e) {
        var cmd = e.data.cmd;
        assert.equal(cmd, "connect");
	worker.terminate();
        done();
    }
});

QUnit.test("Connect and connack worker", function(assert) {
    assert.timeout(500);
    var done = assert.async();

    var worker = new Worker("hello-world-worker.js");
    worker.postMessage(["init", {}]);

    var connected = false;

    worker.onmessage = function(e) {
        console.log("XXXX", e.data);
        if(!connected) {
            var cmd = e.data.cmd;
            assert.equal(cmd, "connect");
            connected = true;
            worker.postMessage({cmd: "connack"})
        } else {
            // The hello world worker sends a normal postMessage
            assert.equal(e.data, "Hello world!")
	    worker.terminate();
            done();
        }
    }
});

QUnit.test("Connect and subscribe worker", function(assert) {
    assert.timeout(500);
    var done = assert.async();

    var connected = false;
    var subscribed = false;
    var worker = new Worker("subscribe-worker.js");
    worker.postMessage(["init", {}]);

    worker.onmessage = function(e) {
        var cmd = e.data.cmd;

        if(!connected) {
            assert.equal(cmd, "connect");
            connected = true;
            worker.postMessage({cmd: "connack"})
            return;
        }

        if(!subscribed) {
            assert.equal(cmd, "subscribe");
            subscribed = true;
            worker.postMessage({cmd: "suback", sub_id: e.data.id})
	    worker.terminate();
            done();
        }
    }
});

QUnit.test("Connect, subscribe and publish to worker", function(assert) {
    assert.timeout(500);
    var done = assert.async();

    var worker = new Worker("subscribe-publish-worker.js");
    worker.postMessage(["init", {}]);

    var connected = false;
    var subscribed = false;

    worker.onmessage = function(e) {
        var cmd = e.data.cmd;

	if(e.data == "Hello to you too") {
	    worker.terminate();
	    done();
	}

        if(!connected) {
            assert.equal(cmd, "connect");
            connected = true;
            worker.postMessage({cmd: "connack"})
            return;
        }

        if(!subscribed) {
            assert.equal(cmd, "subscribe");
            subscribed = true;

            worker.postMessage({cmd: "suback", sub_id: e.data.id});
	    worker.postMessage({cmd: "publish", topic: "test/a/b", payload: "Hi"});

	    return;
        }
    }
});
