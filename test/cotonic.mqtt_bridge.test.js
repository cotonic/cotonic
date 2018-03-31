//
// Bridge Tests.
//

"use strict";

QUnit.test("cotonic.mqtt_bridge is defined", function(assert) {
    assert.equal(cotonic.hasOwnProperty('mqtt_bridge'), true, "Check if mqtt_bridge is defined.");
});

QUnit.test("Create mqtt_bridge", function(assert) {
    let bridge = cotonic.mqtt_bridge.newBridge("");

    assert.equal(!!bridge, true, "Check if bridge is created");
});
