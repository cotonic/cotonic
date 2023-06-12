//
// HTML Worker Tests.
//
"use strict"; QUnit.test("Receive connect from worker", function(assert) { assert.timeout(1000);
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

QUnit.test("Connect and subscribe worker", function(assert) {
    assert.timeout(1000);
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


QUnit.test("Subscribe and unsubscribe worker",
    function(assert) {
        assert.timeout(10000);
        var done = assert.async();

        function handler(msg, bindings) {
            let subs; 

            if(bindings.what === "sub") {
                subs = cotonic.broker.find_subscriptions_below("test/a/b")
                assert.equal(subs.length, 1, "The worker should be subscribed.");
            } 

            if(bindings.what === "unsub") {
                subs = cotonic.broker.find_subscriptions_below("test/a/b")
                assert.equal(subs.length, 0, "The worker should be unsubscribed.");
            }

            if(bindings.what === "done") {
                done();
            }
        }

        cotonic.broker.subscribe("subscribe-unsubscribe-worker/+what", handler);
        cotonic.spawn("/test/subscribe-unsubscribe-worker.js");
    }
);

QUnit.test("Connect resolves",
    function(assert) {
        assert.timeout(10000);
        var done = assert.async();

        function handler(msg, bindings) {
            if(bindings.what === "done") {
                assert.equal(msg.payload, true, "Received unexpected message.");
                done();
            }
        }

        cotonic.broker.subscribe("connect-resolve/+what", handler);
        cotonic.spawn("/test/workers/connect-resolve.js");
    }
);

QUnit.test("Connect deps provided with no dependencies.",
    function(assert) {
        assert.timeout(10000);
        var done = assert.async();

        const called = [];

        function handler(msg, bindings) {
            if(bindings.what === "init") {
                called.push("init");
            }

            if(bindings.what === "done") {
                assert.equal(called[0], "init", "Init not called.");
                done();
            }
        }

        cotonic.broker.subscribe("connect-deps/+what", handler);
        cotonic.spawn("/test/workers/connect-deps.js");
    }
);

QUnit.test("Connect deps provided with model/foo and model/bar deps.",
    function(assert) {
        assert.timeout(10000);
        var done = assert.async();

        function handler(msg, bindings) {
            if(bindings.what === "init") {
                cotonic.broker.publish("model/foo/event/ping", "pong", { retain: true });
                cotonic.broker.publish("model/bar/event/ping", "pong", { retain: true });
            }

            if(bindings.what === "done") {
                assert.equal(msg.payload, "deps-are-resolved", "The deps are resolved.");
                done();
            }
        }

        cotonic.broker.subscribe("connect-deps-foo-bar/+what", handler);
        cotonic.spawn("/test/workers/connect-deps-foo-bar.js");
    }
);

QUnit.test("Connect provides before connect.",
    function(assert) {
        assert.timeout(10000);
        var done = assert.async();

        function handler(msg, bindings) {
            if(bindings.what === "done") {
                cotonic.broker.subscribe("model/provides-before-connect/event/ping",
                    function(m, a) {
                        assert.equal(m.payload, "pong", "We should have a pong");
                        done();
                    }
                )
            }
        }

        cotonic.broker.subscribe("provides-before-connect/+what", handler);
        cotonic.spawn("/test/workers/provides-before-connect.js");
    }
);

QUnit.test("Connect provides after connect.",
    function(assert) {
        assert.timeout(10000);
        var done = assert.async();

        function handler(msg, bindings) {
            if(bindings.what === "done") {
                cotonic.broker.subscribe("model/provides-after-connect/event/ping",
                    function(m, a) {
                        assert.equal(m.payload, "pong", "We should have a pong");
                        done();
                    }
                )
            }
        }

        cotonic.broker.subscribe("provides-after-connect/+what", handler);
        cotonic.spawn("/test/workers/provides-after-connect.js");
    }
);


QUnit.test("Connect with provides and deps.",
    function(assert) {
        assert.timeout(10000);
        var done = assert.async();

        function handler(msg, bindings) {
            if(bindings.what === "done") {

                cotonic.broker.subscribe("model/connect-wait-deps/event/ping",
                    function(m, a) {
                        assert.equal(m.payload, "pong", "Check if we got a provides pong.");
                        done();
                    }
                )
            }
        }

        cotonic.broker.publish("model/a/event/ping", "pong", { retain: true });
        cotonic.broker.publish("model/b/event/ping", "pong", { retain: true });

        cotonic.broker.subscribe("connect-wait-deps/+what", handler);
        cotonic.spawn("/test/workers/connect-wait-deps.js");
    }
);

QUnit.test("on_init is called before connect.",
    function(assert) {
        assert.timeout(10000);
        var done = assert.async();

        function handler(msg, bindings) {
            if(bindings.what === "done") {
                assert.equal(msg.payload[0], "on_init", "On init is called first");
                assert.equal(msg.payload[1], "connect-resolved", "And connect resolved later");
                done();
            }
        }

        cotonic.broker.subscribe("on-init-before-connect/+what", handler);
        cotonic.spawn("/test/workers/on-init-before-connect.js");
    }
);

