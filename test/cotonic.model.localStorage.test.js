//
// LocalStorage model tests
//

import * as broker from "/src/cotonic.broker.js";
import "/src/default_broker_init.js";
import * as localStorage from "/src/cotonic.model.localStorage.js";


QUnit.test("test.model.localStorage - post, and post remove", function(assert) {
    broker.publish("model/localStorage/post/foo", "bar");
    assert.equal(window.localStorage.getItem("foo"), JSON.stringify("bar"));

    broker.publish("model/localStorage/post/foo", null);
    assert.equal(window.localStorage.getItem("foo"), JSON.stringify(null));

    broker.publish("model/localStorage/delete/foo", {});
    assert.equal(window.localStorage.getItem("foo"), null);
});

QUnit.test("test.model.localStorage - get", function(assert) {
    let done = assert.async();

    window.localStorage.setItem("foo", "get - test");

    const response_topic = "test/localstorage/1";

    broker.subscribe(response_topic,
        function(msg) {
            assert.equal(msg.payload, "get - test");
            done();
        },
        { wid: "qunit" }
    );

    try {
        broker.publish("model/localStorage/get/foo", undefined,
            {properties: {
                response_topic: response_topic
            }});
    } finally {
        broker.unsubscribe(response_topic, { wid: "qunit" });
    }

});

QUnit.test("test.model.localStorage - delete", function(assert) {
    broker.initialize({
        delete_all_retained: true,
        flush: false
    });

    window.localStorage.setItem("foo", "get - test");

    broker.publish("model/localStorage/delete/foo", undefined);
    assert.equal(window.localStorage.getItem("foo"), null);

    broker.publish("model/localStorage/delete/never-existed", undefined);
    assert.equal(window.localStorage.getItem("never-existed"), null);
});

QUnit.test("test.model.localStorage - subkeys", function(assert) {
    broker.initialize({
        delete_all_retained: true,
        flush: false
    });

    window.localStorage.removeItem("foo");

    broker.publish("model/localStorage/post/foo/bar", "baz");
    assert.deepEqual(JSON.parse(window.localStorage.getItem("foo")), { bar: "baz" });

    broker.publish("model/localStorage/post/foo/bar2", "baz2");
    assert.deepEqual(JSON.parse(window.localStorage.getItem("foo")), { bar: "baz", bar2: "baz2" });

    broker.publish("model/localStorage/delete/foo/bar");
    assert.deepEqual(JSON.parse(window.localStorage.getItem("foo")), { bar2: "baz2" });

    window.localStorage.removeItem("foo");
});

QUnit.test("test.model.localStorage - events", function(assert, bindings) {
    let events = [];

    broker.initialize({
        delete_all_retained: true,
        flush: false
    });

    broker.subscribe("model/localStorage/event/+key",
        function(msg, bindings) {
            if (bindings.key != 'ping') {
                events.push({msg:msg, key: bindings.key});
            }
        },
        { wid: "qunit" }
    );

    try {
        broker.publish("model/localStorage/post/foo", "bar");
        broker.publish("model/localStorage/post/foo1", "bar1");
        broker.publish("model/localStorage/post/foo2", "bar2");
        broker.publish("model/localStorage/post/foo", "bar2");
        broker.publish("model/localStorage/post/foo1", "bar2");

        assert.equal(events[0].key, "foo"); 
        assert.equal(events[1].key, "foo1"); 
        assert.equal(events[2].key, "foo2"); 
        assert.equal(events[3].key, "foo"); 
        assert.equal(events[4].key, "foo1"); 
    } finally {
        broker.unsubscribe("model/localStorage/event/+key", { wid: "qunit" });
    }
});
