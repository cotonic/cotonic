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



    
