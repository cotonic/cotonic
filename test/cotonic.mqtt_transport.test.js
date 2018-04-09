//
// Transport Tests.
//

"use strict";

QUnit.test("cotonic.mqtt_transport is defined", function(assert) {
    assert.equal(cotonic.hasOwnProperty('mqtt_transport'), true, "mqtt_transport not defined in cotonic");
});
