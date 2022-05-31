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

QUnit.test("Connect with mock mqtt_bridge", function(assert) {
    const mqtt_bridge = cotonic.mqtt_bridge;
    let done = assert.async();

    // Clear retained bridge status messages 
    cotonic.broker.publish("$bridge/mock/status", undefined, {retain: true, wid: "qunit"});

    let mockSession;

    {
        let bridgeTopics;

        mockSession = {
            newSession: function(remote, topics) {
                bridgeTopics = topics;
                return;
            },

            connack: function() {
                cotonic.broker.publish(bridgeTopics.session_in, {
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

    cotonic.broker.subscribe("$bridge/mock/status", function(m) {
        // After the connack below, the test is done.
        if(m.payload && m.payload.session_present) {
            done();
            cotonic.broker.unsubscribe("$bridge/mock/status", {wid: "qunit"});
        }
    })

    // connack the session
    mockSession.connack()
    
})
