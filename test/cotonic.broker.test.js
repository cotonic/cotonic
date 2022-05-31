//
// Broker Tests.
//

"use strict";

QUnit.test("Subscribe and publish, no wildcards", function(assert) {
    let publishes = [];

    cotonic.broker.publish("a/b/c", "Hello nobody!");

    cotonic.broker.subscribe("a/b/c", function(message, prop) {
        publishes.push(message.payload);
    });

    cotonic.broker.publish("a/b/c", "Hello world!");

    assert.deepEqual(["Hello world!"], publishes, "Publish hello world");

    cotonic.broker._flush();
});

QUnit.test("Subscribe and publish, with wildcards", function(assert) {
    let publishes = [];

    cotonic.broker.publish("foo/bar", "Hello nobody!");

    cotonic.broker.subscribe("foo/#", function(message, prop) {
        publishes.push({payload: message.payload, prop: prop});
    });

    cotonic.broker.subscribe("bar/+", function(message, prop) {
        publishes.push({payload: message.payload, prop: prop});
    });

    cotonic.broker.publish("foo/bar", "One");
    cotonic.broker.publish("foo/bar/baz", "Two");
    cotonic.broker.publish("bar/this", "Three");

    assert.deepEqual([{payload: "One", prop: {}},
                      {payload: "Two", prop: {}},
                      {payload: "Three", prop: {}}], publishes, "Three matches");

    cotonic.broker._flush();
});

QUnit.test("Subscribe and publish, with named wildcards", function(assert) {
    let publishes = [];

    cotonic.broker.publish("foo/bar", "Hello nobody!");

    cotonic.broker.subscribe("foo/#a", function(message, prop) {
        publishes.push({payload: message.payload, prop: prop});
    });

    cotonic.broker.subscribe("bar/+a", function(message, prop) {
        publishes.push({payload: message.payload, prop: prop});
    });

    cotonic.broker.publish("foo/bar", "One");
    cotonic.broker.publish("foo/bar/baz", "Two");
    cotonic.broker.publish("bar/this", "Three");

    assert.deepEqual([{payload: "One", prop: {a: ["bar"]}},
                      {payload: "Two", prop: {a: ["bar", "baz"]}},
                      {payload: "Three", prop: {a: "this"}}], publishes, "Three matches");

    cotonic.broker._flush();
});

QUnit.test("Subscribe and publish, retained messages", function(assert) {
    let publishes = [];

    cotonic.broker._delete_all_retained();

    cotonic.broker.publish("retained/bar",
        "Hello I'm retained!",
        {retain: true}
    );

    cotonic.broker.subscribe("retained/#a", function(message, prop) {
        publishes.push({payload: message.payload, prop: prop});
    });

    assert.equal(publishes.length, 1, "There is one message");

    cotonic.broker.subscribe("retained/bar", function(message, prop) {
        publishes.push({payload: message.payload, prop: prop});
    });

    assert.equal(publishes.length, 2, "There are two messages");

    cotonic.broker.subscribe("retained/+bar", function(message, prop) {
        publishes.push({payload: message.payload, prop: prop});
    });

    assert.equal(publishes.length, 3, "There are three messages");
     
    cotonic.broker._delete_all_retained();
});

QUnit.test("Subscribe, publish, unsubscribe, publish", function(assert) {
    let publishes = [];

    cotonic.broker._delete_all_retained();

    cotonic.broker.subscribe("plop", function(message, prop) {
        publishes.push({payload: message.payload, prop: prop});
    }, {wid: "x"});

    cotonic.broker.publish("plop", "First");
    cotonic.broker.unsubscribe("plop", {wid: "x"});
    cotonic.broker.publish("plop", "Second");

    assert.equal(publishes.length, 1, "There is one message");

    assert.deepEqual([
            {payload: "First", prop: {}}
        ], publishes, "Single match");

    cotonic.broker._flush();
});


QUnit.test("Delete retained messages", function(assert) {
    let publishes = [];

    cotonic.broker._delete_all_retained();
    cotonic.broker.publish("retained/bar", "Hello I'm retained!", {retain: true});
    cotonic.broker.publish("retained/bar", "", {retain: true});

    cotonic.broker.subscribe("retained/#a", function(message, prop) {
        publishes.push({payload: message.payload, prop: prop});
    });

    assert.equal(0, publishes.length, "There are no messages");

});


QUnit.test("Look for subscribers with match", function(assert) {
    const test_topics = ["a/a", "a/+", "a/#", "b/b"];
    cotonic.broker.subscribe(test_topics, function() { }, { wid: "qunit" } );
    try {
        let a_a_match = cotonic.broker.match("a/a");
        let c_c_match = cotonic.broker.match("c/c");
        let a_a_a_match = cotonic.broker.match("a/a/a");

        assert.equal(a_a_match.length, 3, "a/a match");
        assert.equal(c_c_match.length, 0, "c/c match");
        assert.equal(a_a_a_match.length, 1, "a/a/a match");

        assert.throws(function() {
            cotonic.broker.match("a/+")
        }, Error, "It should not be possible to match on single level wildcards");

        assert.throws(function() {
            cotonic.broker.match("#")
        }, Error, "It should not be possible to match on wildcards");
    } finally {
        cotonic.broker.unsubscribe(test_topics, { wid: "qunit" }); 
    }

});
