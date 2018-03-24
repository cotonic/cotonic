//
// Broker Tests.
//

"use strict";

QUnit.test("Subscribe and publish, no wildcards", function(assert) {
    let publishes = [];

    cotonic.broker.publish("a/b/c", "Hello nobody!");
    
    cotonic.broker.subscribe("a/b/c", function(message, prop) {
	publishes.push(message);
    });

    cotonic.broker.publish("a/b/c", "Hello world!");

    assert.deepEqual(["Hello world!"], publishes, "Publish hello world");

    cotonic.broker._flush();
});

QUnit.test("Subscribe and publish, with wildcards", function(assert) {
    let publishes = [];

    cotonic.broker.publish("foo/bar", "Hello nobody!");

    cotonic.broker.subscribe("foo/#", function(message, prop) {
	publishes.push({msg: message, prop: prop});
    });
    
    cotonic.broker.subscribe("bar/+", function(message, prop) {
	publishes.push({msg: message, prop: prop});
    });

    cotonic.broker.publish("foo/bar", "One");
    cotonic.broker.publish("foo/bar/baz", "Two");
    cotonic.broker.publish("bar/this", "Three");

    assert.deepEqual([{msg: "One", prop: {}},
                      {msg: "Two", prop: {}},
                      {msg: "Three", prop: {}}], publishes, "Three matches");

    cotonic.broker._flush();
});

QUnit.test("Subscribe and publish, with named wildcards", function(assert) {
    let publishes = [];

    cotonic.broker.publish("foo/bar", "Hello nobody!");

    cotonic.broker.subscribe("foo/#a", function(message, prop) {
	publishes.push({msg: message, prop: prop});
    });
    
    cotonic.broker.subscribe("bar/+a", function(message, prop) {
	publishes.push({msg: message, prop: prop});
    });

    cotonic.broker.publish("foo/bar", "One");
    cotonic.broker.publish("foo/bar/baz", "Two");
    cotonic.broker.publish("bar/this", "Three");

    assert.deepEqual([{msg: "One", prop: {a: ["bar"]}},
                      {msg: "Two", prop: {a: ["bar", "baz"]}},
                      {msg: "Three", prop: {a: "this"}}], publishes, "Three matches");

    cotonic.broker._flush();
});

QUnit.test("Subscribe and publish, retained messages", function(assert) {
    let publishes = [];

    cotonic.broker._delete_all_retained();

    cotonic.broker.publish("retained/bar", "Hello I'm retained!", {retained: true});

    cotonic.broker.subscribe("retained/#a", function(message, prop) {
	publishes.push({msg: message, prop: prop});
    });

    assert.equal(1, publishes.length, "There is one message");

    cotonic.broker.subscribe("#a", function(message, prop) {
	publishes.push({msg: message, prop: prop});
    });

    assert.equal(2, publishes.length, "There are two messages");
    cotonic.broker._delete_all_retained();
});

QUnit.test("Delete retained messages", function(assert) {
    let publishes = [];

    cotonic.broker._delete_all_retained();
    cotonic.broker.publish("retained/bar", "Hello I'm retained!", {retained: true});
    cotonic.broker.publish("retained/bar", "", {retained: true});

    cotonic.broker.subscribe("retained/#a", function(message, prop) {
	publishes.push({msg: message, prop: prop});
    });
    
    assert.equal(0, publishes.length, "There are no messages");

})

    
