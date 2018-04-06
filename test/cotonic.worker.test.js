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
        var type = e.data.type;
        assert.equal(type, "connect");
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
        if(!connected) {
            var type = e.data.type;
            assert.equal(type, "connect");
            connected = true;
            worker.postMessage({type: "connack"})
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
        var type = e.data.type;

        if(!connected) {
            assert.equal(type, "connect");
            connected = true;
            worker.postMessage({type: "connack"})
            return;
        }

        if(!subscribed) {
            assert.equal(type, "subscribe");
            subscribed = true;
            worker.postMessage({type: "suback", packet_id: e.data.packet_id, acks: [0]})
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
        var type = e.data.type;

        if(e.data == "Hello to you too") {
            worker.terminate();
            done();
        }

        if(!connected) {
            assert.equal(type, "connect");
            connected = true;
            worker.postMessage({type: "connack"})
            return;
        }

        if(!subscribed) {
            assert.equal(type, "subscribe");
            subscribed = true;

            worker.postMessage({type: "suback", packet_id: e.data.packet_id, acks: [0]});
            worker.postMessage({type: "publish", topic: "test/a/b", payload: "Hi"});

            return;
        }
    }
});
