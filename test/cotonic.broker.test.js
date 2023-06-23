//
// Broker Tests.
//

import * as broker from "/src/cotonic.broker.js";


QUnit.test("Subscribe and publish, no wildcards", function(assert) {
    let publishes = [];

    broker.initialize();
    broker.publish("a/b/c", "Hello nobody!");

    broker.subscribe("a/b/c", function(message, prop) {
        publishes.push(message.payload);
    });

    broker.publish("a/b/c", "Hello world!");

    assert.deepEqual(["Hello world!"], publishes, "Publish hello world");
});

QUnit.test("Subscribe and publish, with wildcards", function(assert) {
    let publishes = [];

    broker.initialize();
    broker.publish("foo/bar", "Hello nobody!");

    broker.subscribe("foo/#", function(message, prop) {
        publishes.push({payload: message.payload, prop: prop});
    });

    broker.subscribe("bar/+", function(message, prop) {
        publishes.push({payload: message.payload, prop: prop});
    });

    broker.publish("foo/bar", "One");
    broker.publish("foo/bar/baz", "Two");
    broker.publish("bar/this", "Three");

    assert.deepEqual([{payload: "One", prop: {}},
                      {payload: "Two", prop: {}},
                      {payload: "Three", prop: {}}], publishes, "Three matches");
});

QUnit.test("Subscribe and publish, with named wildcards", function(assert) {
    let publishes = [];

    broker.initialize();
    broker.publish("foo/bar", "Hello nobody!");

    broker.subscribe("foo/#a", function(message, prop) {
        publishes.push({payload: message.payload, prop: prop});
    });

    broker.subscribe("bar/+a", function(message, prop) {
        publishes.push({payload: message.payload, prop: prop});
    });

    broker.publish("foo/bar", "One");
    broker.publish("foo/bar/baz", "Two");
    broker.publish("bar/this", "Three");

    assert.deepEqual([{payload: "One", prop: {a: ["bar"]}},
                      {payload: "Two", prop: {a: ["bar", "baz"]}},
                      {payload: "Three", prop: {a: "this"}}], publishes, "Three matches");
});

QUnit.test("Subscribe and publish, retained messages", function(assert) {
    let publishes = [];

    broker.initialize();
    broker.publish("retained/bar",
        "Hello I'm retained!",
        {retain: true}
    );

    broker.subscribe("retained/#a", function(message, prop) {
        publishes.push({payload: message.payload, prop: prop});
    });

    assert.equal(publishes.length, 1, "There is one message");

    broker.subscribe("retained/bar", function(message, prop) {
        publishes.push({payload: message.payload, prop: prop});
    });

    assert.equal(publishes.length, 2, "There are two messages");

    broker.subscribe("retained/+bar", function(message, prop) {
        publishes.push({payload: message.payload, prop: prop});
    });

    assert.equal(publishes.length, 3, "There are three messages");
});

QUnit.test("Subscribe, publish, unsubscribe, publish", function(assert) {
    let publishes = [];

    broker.initialize();
    broker.subscribe("plop", function(message, prop) {
        publishes.push({payload: message.payload, prop: prop});
    }, {wid: "x"});

    broker.publish("plop", "First");
    broker.unsubscribe("plop", {wid: "x"});
    broker.publish("plop", "Second");

    assert.equal(publishes.length, 1, "There is one message");

    assert.deepEqual([
            {payload: "First", prop: {}}
        ], publishes, "Single match");
});


QUnit.test("Delete retained messages", function(assert) {
    let publishes = [];

    broker.initialize();

    broker.publish("retained/bar", "Hello I'm retained!", {retain: true});
    broker.publish("retained/bar", "", {retain: true});

    broker.subscribe("retained/#a", function(message, prop) {
        publishes.push({payload: message.payload, prop: prop});
    });

    assert.equal(0, publishes.length, "There are no messages");
});


QUnit.test("Look for subscribers with match", function(assert) {
    const test_topics = ["a/a", "a/+", "a/#", "b/b"];

    broker.initialize();
    broker.subscribe(test_topics, function() { }, { wid: "qunit" } );
    try {
        let a_a_match = broker.match("a/a");
        let c_c_match = broker.match("c/c");
        let a_a_a_match = broker.match("a/a/a");

        assert.equal(a_a_match.length, 3, "a/a match");
        assert.equal(c_c_match.length, 0, "c/c match");
        assert.equal(a_a_a_match.length, 1, "a/a/a match");

        assert.throws(function() {
            broker.match("a/+")
        }, Error, "It should not be possible to match on single level wildcards");

        assert.throws(function() {
            broker.match("#")
        }, Error, "It should not be possible to match on wildcards");
    } finally {
        broker.unsubscribe(test_topics, { wid: "qunit" }); 
    }
});
