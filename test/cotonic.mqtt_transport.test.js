//
// Transport Tests.
//

import * as mqtt_transport_ws from "/src/cotonic.mqtt_transport.ws.js"
import * as broker from "/src/cotonic.broker.js"
import { encode, decode } from "/src/cotonic.mqtt_packet.js"

function testWebSocketClass(sockets) {
    return class {
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
    };
}

const waitForTransport = () => new Promise(resolve => setTimeout(resolve, 20));
const lifecycleTopic = "model/lifecycle/event/state";

// Exercise asynchronous CLOSING -> CLOSED events and clean up periodic timers.
async function withAsyncSockets(run) {
    const nativeWebSocket = globalThis.WebSocket;
    const nativeSetInterval = globalThis.setInterval;
    const timers = [];
    const sockets = [];
    broker.initialize();
    globalThis.setInterval = (...args) => {
        const timer = nativeSetInterval(...args);
        timers.push(timer);
        return timer;
    };
    globalThis.WebSocket = class extends testWebSocketClass(sockets) {
        constructor(url) {
            super(url);
            this.sent = [];
        }
        send(data) {
            this.sent.push(decode(new Uint8Array(data))[0]);
        }
        open() {
            this.readyState = 1;
            this.onopen();
        }
        close() {
            if (this.readyState >= 2) return;
            this.closeCount++;
            this.readyState = 2;
            setTimeout(() => {
                this.readyState = 3;
                if (this.onclose) this.onclose();
            }, 0);
        }
    };
    try {
        await run(sockets);
    } finally {
        timers.forEach(timer => clearInterval(timer));
        sockets.forEach(socket => socket.close());
        await waitForTransport();
        globalThis.WebSocket = nativeWebSocket;
        globalThis.setInterval = nativeSetInterval;
        broker.publish(lifecycleTopic, undefined, {retain: true});
    }
}

function lifecycleTransport() {
    return mqtt_transport_ws.newTransport("example.test", {
        connected() {}, disconnected() {}, receiveMessage() {}
    }, {protocol: "ws", connect_delay: 1, periodic_delay: 5});
}

for (const resumedState of ["active", "passive", "hidden"]) {
    QUnit.test("frozen websocket resumes into " + resumedState, async function(assert) {
        await withAsyncSockets(async sockets => {
            const transport = lifecycleTransport();
            try {
                await waitForTransport();
                sockets[0].open();
                broker.publish(lifecycleTopic, "frozen", {retain: true});
                await waitForTransport();
                transport.openConnection();
                transport.closeReconnect(true);
                transport.closeReconnect();
                await waitForTransport();
                assert.equal(sockets.length, 1, "reconnect requests cannot override freezing");
                broker.publish(lifecycleTopic, resumedState, {retain: true});
                await waitForTransport();
                assert.equal(sockets.length, 2, "resuming reconnects without requiring focus");
                broker.publish(lifecycleTopic, "frozen", {retain: true});
                transport.closeConnection();
                broker.publish(lifecycleTopic, resumedState, {retain: true});
                await waitForTransport();
                assert.equal(sockets.length, 2, "an explicitly closed transport stays closed");
            } finally {
                transport.closeConnection();
            }
        });
    });
}

QUnit.test("intermediate lifecycle states cannot reopen a terminated page", async function(assert) {
    await withAsyncSockets(async sockets => {
        const transport = lifecycleTransport();
        try {
            await waitForTransport();
            sockets[0].open();
            broker.publish(lifecycleTopic, "frozen", {retain: true});
            await waitForTransport();
            // The lifecycle model emits both states in one synchronous transition.
            broker.publish(lifecycleTopic, "hidden", {retain: true});
            broker.publish(lifecycleTopic, "terminated", {retain: true});
            await waitForTransport();
            assert.equal(sockets.length, 1, "the intermediate hidden state never opens a socket");
            transport.openConnection();
            transport.closeReconnect(true);
            await waitForTransport();
            assert.equal(sockets.length, 1, "termination also blocks explicit reconnect requests");
        } finally {
            transport.closeConnection();
        }
    });
});

QUnit.test("retained frozen state blocks initial and explicit connections", async function(assert) {
    await withAsyncSockets(async sockets => {
        broker.publish(lifecycleTopic, "frozen", {retain: true});
        const transport = lifecycleTransport();
        try {
            await waitForTransport();
            transport.openConnection();
            await waitForTransport();
            assert.equal(sockets.length, 0, "initial freezing prevents socket creation");
            transport.closeConnection();
            transport.openConnection();
            await waitForTransport();
            assert.equal(sockets.length, 0, "resubscribing preserves retained freezing");
            broker.publish(lifecycleTopic, "passive", {retain: true});
            await waitForTransport();
            assert.equal(sockets.length, 1, "resumption releases the retained suspension");
        } finally {
            transport.closeConnection();
        }
    });
});

QUnit.test("keepalive timeout reconnects and sends a fresh MQTT CONNECT", async function(assert) {
    await withAsyncSockets(async sockets => {
        const mqtt_session = await import("/src/cotonic.mqtt_session.js");
        const remote = "keepalive.example.test";
        broker.subscribe("model/sessionId/get", msg => {
            broker.publish(msg.properties.response_topic, "test-session-id");
        });
        const session = mqtt_session.newSession(remote, {
            session_in: "test/session/in", session_out: "test/session/out",
            session_control: "test/session/control", session_status: "test/session/status",
            session_event: "test/session/event"
        }, {protocol: "ws", connect_delay: 1, periodic_delay: 5});
        try {
            await waitForTransport();
            sockets[0].open();
            await waitForTransport();
            assert.equal(sockets[0].sent[0].type, "connect", "the initial socket sends CONNECT");
            const connack = encode({type: "connack", reason_code: 0, properties: {}}).buffer;
            sockets[0].onmessage({data: connack});
            await waitForTransport();
            assert.equal(session.isConnected(), true, "the initial MQTT session is connected");
            const transport = session.connections.ws;
            session.keepAlive();
            const sent = sockets[0].sent;
            assert.equal(sent[sent.length - 1].type, "pingreq", "keepalive sends PINGREQ");
            session.keepAlive();
            await waitForTransport();
            assert.equal(session.connections.ws, transport, "timeout preserves the transport");
            assert.equal(sockets[0].closeCount, 1, "timeout closes the unresponsive socket");
            assert.equal(sockets.length, 2, "periodic retry creates a new socket");
            sockets[1].open();
            await waitForTransport();
            assert.equal(sockets[1].sent[0].type, "connect", "retry starts a fresh MQTT handshake");
            sockets[1].onmessage({data: connack});
            await waitForTransport();
            assert.equal(session.isConnected(), true, "MQTT connectivity is restored");
            // A server DISCONNECT still follows the explicit teardown path.
            sockets[1].onmessage({data: encode({type: "disconnect"}).buffer});
            await waitForTransport();
            assert.equal(session.connections.ws, undefined, "server DISCONNECT removes the transport");
            assert.equal(sockets.length, 2, "server DISCONNECT does not trigger a retry");
        } finally {
            session.disconnect();
            mqtt_session.deleteSession(remote);
        }
    });
});

QUnit.test("cotonic.mqtt_transport_ws is defined", function(assert) {
    assert.equal(!!mqtt_transport_ws.newTransport, true);
});

QUnit.test("websocket follows page lifecycle", function(assert) {
    const done = assert.async();
    const nativeWebSocket = globalThis.WebSocket;
    const sockets = [];
    let disconnectCount = 0;

    globalThis.WebSocket = testWebSocketClass(sockets);
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
        sockets[0].readyState = 1;
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

QUnit.test("websocket closes on invalid MQTT data", function(assert) {
    const done = assert.async();
    const nativeWebSocket = globalThis.WebSocket;
    const sockets = [];
    let disconnectReason;

    globalThis.WebSocket = testWebSocketClass(sockets);
    broker.initialize();

    const transport = mqtt_transport_ws.newTransport("example.test", {
        connected: function() {},
        disconnected: function(_transport, reason) { disconnectReason = reason; },
        receiveMessage: function() {}
    }, {
        protocol: "ws",
        connect_delay: 1,
        periodic_delay: 1000000
    });

    setTimeout(function() {
        sockets[0].readyState = 1;
        sockets[0].onopen();
        sockets[0].onmessage({data: new Uint8Array([0, 0]).buffer});

        assert.equal(sockets[0].closeCount, 1, "invalid MQTT data closes the websocket");
        assert.equal(disconnectReason, "invalid_packet", "the MQTT session receives the decode error");

        transport.closeConnection();
        globalThis.WebSocket = nativeWebSocket;
        done();
    }, 10);
});

QUnit.test("reopened websocket follows page lifecycle", function(assert) {
    const done = assert.async();
    const nativeWebSocket = globalThis.WebSocket;
    const sockets = [];

    globalThis.WebSocket = testWebSocketClass(sockets);
    broker.initialize();

    const transport = mqtt_transport_ws.newTransport("example.test", {
        connected: function() {},
        disconnected: function() {},
        receiveMessage: function() {}
    }, {
        protocol: "ws",
        connect_delay: 1,
        periodic_delay: 1000000
    });

    setTimeout(function() {
        sockets[0].readyState = 1;
        sockets[0].onopen();
        transport.closeConnection();
        transport.openConnection();
        sockets[0].onclose();

        setTimeout(function() {
            assert.equal(sockets.length, 2, "the websocket was reopened");

            broker.publish("model/lifecycle/event/state", "frozen");
            assert.equal(sockets[1].closeCount, 1, "the reopened websocket receives lifecycle events");

            transport.closeConnection();
            globalThis.WebSocket = nativeWebSocket;
            done();
        }, 10);
    }, 10);
});
