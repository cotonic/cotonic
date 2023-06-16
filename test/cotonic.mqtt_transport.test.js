//
// Transport Tests.
//

import * as mqtt_transport_ws from "cotonic.transport.ws"

QUnit.test("cotonic.mqtt_transport_ws is defined", function(assert) {
    assert.equal(mqtt_transport_ws.hasOwnProperty('newTransport'), true);
});
