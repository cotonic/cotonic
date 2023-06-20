//
// Bridge Tests.
//

import * as mqtt_bridge from "/src/cotonic.mqtt_bridge.js";
import * as broker from "/src/cotonic.broker.js";

QUnit.test("Create default mqtt_bridge", function(assert) {
    let bridge = mqtt_bridge.newBridge();
    assert.equal(!!bridge, true, "Check if bridge is created");

    let found = mqtt_bridge.findBridge();
    assert.equal(!!found, true, "Check if bridge is found");

    // Cleanup after the test
    mqtt_bridge.deleteBridge();
    assert.equal(mqtt_bridge.findBridge(), undefined, "Check if the bridge is deleted");
});

QUnit.test("Connect with mock mqtt_bridge", function(assert) {
    let done = assert.async();

    // Clear retained bridge status messages 
    broker.publish("$bridge/mock/status", undefined, {retain: true, wid: "qunit"});

    let mockSession;

    {
        let bridgeTopics;

        mockSession = {
            newSession: function(remote, topics) {
                bridgeTopics = topics;
                return;
            },

            connack: function() {
                broker.publish(bridgeTopics.session_in, {
                    type: "connack",
                    session_id: "mock-client-id",
                    is_connected: true,
                    connack: {
                        session_present: true
                    }
                });
            }
        };
    }

    let bridge = mqtt_bridge.newBridge("mock", {mqtt_session: mockSession});
    assert.equal(!!bridge, true, "Check if bridge is created");

    broker.subscribe("$bridge/mock/status", function(m) {
        // After the connack below, the test is done.
        if(m.payload && m.payload.session_present) {
            done();
            broker.unsubscribe("$bridge/mock/status", {wid: "qunit"});
        }
    })

    // connack the session
    mockSession.connack()
    
})
