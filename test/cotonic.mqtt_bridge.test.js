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
    cotonic.broker.publish("$bridge/mock/status", undefined, {retained: true});

    let mockSession;

    {
        let theBridge;

        mockSession = {

            newSession: function(remote, obj) {
                theBridge = obj;
                return;
            },

            connack: function() {
                theBridge.sessionConnack("mock-client-id", {});
            }
            
        };
    }


    let bridge = mqtt_bridge.newBridge("mock", mockSession);

    assert.equal(!!bridge, true, "Check if bridge is created");

    let s = cotonic.broker.subscribe("$bridge/mock/status", function(m) {
        // After the connack below, the test is done.
        if(m && m.session_present) {
            done();
            cotonic.broker.unsubscribe(s);
        }
    })

    // connack the session
    mockSession.connack()
    
})
