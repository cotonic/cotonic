//
// Dedup model tests
//

import * as broker from "/src/cotonic.broker.js";
import "/src/default_broker_init.js";
import * as dedup from "/src/cotonic.model.dedup.js";


QUnit.test("test.model.dedup - call dedup test", function(assert) {
    let done = assert.async();

    broker.subscribe(
        "test/dedup/1",
        function(msg) {
            broker.publish(msg.properties.response_topic, msg.payload + "-1");
        },
        { wid: "qunit" });

    const m = {
        topic: "test/dedup/1",
        payload: "test"
    };

    try {
        broker
            .call("model/dedup/post/message", m)
            .then((msg) => {
                    assert.equal(msg.payload, "test-1");
                    done();
                });
    } finally {
        broker.unsubscribe("test/dedup/1", { wid: "qunit" });
    }
});

QUnit.test("test.model.dedup - call dedup test", function(assert) {
    let done = assert.async();

    broker.subscribe(
        "test/dedup/1",
        (msg) => {
            broker.publish(msg.properties.response_topic, msg.payload + "-1");
        },
        { wid: "qunit" });

    const m = {
        topic: "test/dedup/1",
        payload: "test"
    };

    try {
        broker
            .call("model/dedup/post/message", m)
            .then((msg) => {
                    assert.equal(msg.payload, "test-1");
                    done();
                });
    } finally {
        broker.unsubscribe("test/dedup/1", { wid: "qunit" });
    }
});

