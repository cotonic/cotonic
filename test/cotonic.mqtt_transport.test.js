//
// Transport Tests.
//

import * as mqtt_transport_ws from "cotonic.mqtt_transport.ws"

QUnit.test("cotonic.mqtt_transport_ws is defined", function(assert) {
    assert.equal(!!mqtt_transport_ws.newTransport, true);
});
