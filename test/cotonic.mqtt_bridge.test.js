//
// Bridge Tests.
//

"use strict";

QUnit.test("cotonic.mqtt_bridge is defined", function(assert) {
    assert.equal(cotonic.hasOwnProperty('mqtt_bridge'), true, "Check if mqtt_bridge is defined.");
});

QUnit.test("Create default mqtt_bridge", function(assert) {
    // This test sets up a websocket connection to localhost which is not used.
    const mqtt_bridge = cotonic.mqtt_bridge;

    let bridge = mqtt_bridge.newBridge();
    assert.equal(!!bridge, true, "Check if bridge is created");

    let found = mqtt_bridge.findBridge();
    assert.equal(!!found, true, "Check if bridge is found");

    // Cleanup after the test
    mqtt_bridge.deleteBridge();
    assert.equal(mqtt_bridge.findBridge(), undefined, "Check if the bridge is deleted");
});
