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

QUnit.test("On connect before on_depends_provided",
    function(assert) {
        assert.timeout(10000);
        var done = assert.async();

        const called = [];

        function handler(msg, bindings) {
            console.log(msg, bindings);

            if(bindings.what === "called") {
                called.push(msg.payload.callback);
            }

            if(bindings.what === "done") {
                console.log(called);
                
                assert.equal(called[0], "init", "Init should have been called before on_depends_provided");
                assert.equal(called[1], "on_depends_provided", "on_depends_provided should have been called");
                assert.equal(called.length, 2, "Too many callbacks triggered");

                done();
            }
            
        }

        cotonic.broker.subscribe("on_connect_on_depends_order/+what", handler);
        cotonic.spawn("/test/on_connect_on_depends_order_worker.js");
    }
);
