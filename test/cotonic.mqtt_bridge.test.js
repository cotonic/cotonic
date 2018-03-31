//
// Bridge Tests.
//

"use strict";

QUnit.test("cotonic.mqtt_bridge is defined", function(assert) {
    assert.equal(cotonic.hasOwnProperty('mqtt_bridge'), true, "mqtt_bridge not defined.");
});
