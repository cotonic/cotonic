//
// LocalStorage model tests
//

"use strict";

const broker = cotonic.broker;

QUnit.test("test.model.localStorage - post, and post remove", function(assert) {
    broker.publish("model/localStorage/post/foo", "bar");
    assert.equal(window.localStorage.getItem("foo"), "bar");

    broker.publish("model/localStorage/post/foo", undefined);
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
        }
    );

    try {
        broker.publish("model/localStorage/get/foo", undefined,
            {properties: {
                response_topic: response_topic
            }});
    } finally {
        broker.unsubscribe(response_topic, {});
    }

});

QUnit.test("test.model.localStorage - delete", function(assert) {
    window.localStorage.setItem("foo", "get - test");

    broker.publish("model/localStorage/post/foo", undefined);
    assert.equal(window.localStorage.getItem("foo"), null);

    broker.publish("model/localStorage/post/never-existed", undefined);
    assert.equal(window.localStorage.getItem("never-existed"), null);
});

QUnit.test("test.model.localStorage - events", function(assert, bindings) {
    let events = [];

    broker.subscribe("model/localStorage/event/+key",
        function(msg, bindings) {
            events.push({msg:msg, key: bindings.key});
        }
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
        broker.unsubscribe("model/localStorage/event/+key", {});
    }
});
