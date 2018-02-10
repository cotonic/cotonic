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
});
