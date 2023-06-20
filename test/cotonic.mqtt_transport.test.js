//
// Transport Tests.
//

import * as mqtt_transport_ws from "/src/cotonic.mqtt_transport.ws.js"

QUnit.test("cotonic.mqtt_transport_ws is defined", function(assert) {
    assert.equal(!!mqtt_transport_ws.newTransport, true);
});
