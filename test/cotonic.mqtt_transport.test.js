//
// Transport Tests.
//

import * as mqtt_transport_ws from "/src/cotonic.mqtt_transport.ws.js"
import * as broker from "/src/cotonic.broker.js"

QUnit.test("cotonic.mqtt_transport_ws is defined", function(assert) {
    assert.equal(!!mqtt_transport_ws.newTransport, true);
});

QUnit.test("websocket follows page lifecycle", function(assert) {
    const done = assert.async();
    const nativeWebSocket = globalThis.WebSocket;
    const sockets = [];
    let disconnectCount = 0;

    class TestWebSocket {
        constructor(url) {
            this.url = url;
            this.protocol = "mqtt";
            this.readyState = 0;
            this.closeCount = 0;
            sockets.push(this);
        }

        close() {
            this.closeCount++;
            this.readyState = 3;
        }
    }

    globalThis.WebSocket = TestWebSocket;
    broker.initialize();

    const session = {
        connected: function() {},
        disconnected: function() { disconnectCount++; },
        receiveMessage: function() {}
    };
    const transport = mqtt_transport_ws.newTransport("example.test", session, {
        protocol: "ws",
        connect_delay: 1,
        periodic_delay: 1000000
    });

    setTimeout(function() {
        assert.equal(sockets.length, 1, "the initial websocket was created");
        sockets[0].onopen();

        broker.publish("model/lifecycle/event/state", "frozen");
        assert.equal(sockets[0].closeCount, 1, "freezing closes the websocket");

        broker.publish("model/lifecycle/event/state", "active");
        assert.equal(sockets.length, 1, "activation waits for the close handler");

        sockets[0].onclose();
        setTimeout(function() {
            assert.equal(sockets.length, 2, "activation opens a new websocket after close");
            assert.equal(disconnectCount, 1, "the closed socket resets the MQTT session");

            sockets[0].onerror();
            assert.equal(sockets[1].closeCount, 0, "a stale callback does not close the new socket");
            assert.equal(disconnectCount, 1, "a stale callback does not reset the MQTT session");

            broker.publish("model/lifecycle/event/state", "terminated");
            assert.equal(sockets[1].closeCount, 1, "termination closes the websocket");

            broker.publish("model/lifecycle/event/state", "active");
            assert.equal(sockets.length, 2, "a terminated transport stays closed");

            transport.closeConnection();
            globalThis.WebSocket = nativeWebSocket;
            done();
        }, 10);
    }, 10);
});
