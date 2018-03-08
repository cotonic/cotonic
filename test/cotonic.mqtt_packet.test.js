//
// MQTT Packet Tests.
//

"use strict";

var mqtt_packet = cotonic.mqtt_packet;


function string2bin( s ) {
    return new TextEncoder("utf-8").encode(s);
}


QUnit.test("Partial packet", function(assert) {
    var m, r, _;

    try { _ = mqtt_packet.decode(new Uint8Array([ 240, 2, 0 ])); }
    catch (E) { m = E; }
    assert.equal(m, "incomplete_packet", "Incomplete packet");

    try { _ = mqtt_packet.decode(new Uint8Array([ 255, 225, 255, 255, 255, 255, 255, 255 ])); }
    catch (E) { m = E; }
    assert.equal(m, "malformed", "Malformed packet");

    [ m, r ] = mqtt_packet.decode(new Uint8Array([ 240, 2, 0, 0, 1, 2, 3 ]));
    assert.deepEqual(r, new Uint8Array([ 1, 2, 3 ]), "Extra data");
});


QUnit.test("connect", function(assert) {
    var b = mqtt_packet.encode({ type: "connect" });
    var m = mqtt_packet.decode(b);
    assert.deepEqual(
        m,
        [
            {
                clean_start: false,
                client_id: "",
                keep_alive: 0,
                password: undefined,
                properties: {},
                protocol_name: "MQTT",
                protocol_version: 5,
                type: "connect",
                username: undefined,
                will_flag: false,
                will_payload: undefined,
                will_properties: {},
                will_qos: 0,
                will_retain: false,
                will_topic: undefined
            },
            new Uint8Array([])
        ],
        "connect");
});

QUnit.test("connect full", function(assert) {
    var b = mqtt_packet.encode({
        type: "connect",
        client_id: "foobar",
        clean_start: true,
        keep_alive: 123,
        password: "secret",
        username: "someone",
        properties: {
            payload_format_indicator: true,
            message_expiry_interval: 1,
            content_type: "text/plain",
            response_topic: "response/topic",
            correlation_data: "corrdata",
            subscription_identifier: 2,
            session_expiry_interval: 3,
            assigned_client_identifier: "assclientid",
            server_keep_alive: 4,
            authentication_method: "authmethod",
            authentication_data: "authdata",
            request_problem_information: true,
            will_delay_interval: 5,
            request_response_information: false,
            response_information: "respinfo",
            server_reference: "servref",
            reason_string: "reason",
            receive_maximum: 12345,
            topic_alias_maximum: 6,
            topic_alias: 7,
            maximum_qos: 2,
            retain_available: true,
            foo: "bar",
            maximum_packet_size: 1234567,
            wildcard_subscription_available: true,
            subscription_identifier_available: false,
            shared_subscription_available: true
        },
        will_flag: true,
        will_topic: "good/bye"
    });
    var m = mqtt_packet.decode(b);
    assert.deepEqual(
        m,
        [
            {
                clean_start: true,
                client_id: "foobar",
                keep_alive: 123,
                password: "secret",
                properties: {
                    payload_format_indicator: true,
                    message_expiry_interval: 1,
                    content_type: "text/plain",
                    response_topic: "response/topic",
                    correlation_data: string2bin("corrdata"),
                    subscription_identifier: 2,
                    session_expiry_interval: 3,
                    assigned_client_identifier: "assclientid",
                    server_keep_alive: 4,
                    authentication_method: "authmethod",
                    authentication_data: string2bin("authdata"),
                    request_problem_information: true,
                    will_delay_interval: 5,
                    request_response_information: false,
                    response_information: string2bin("respinfo"),
                    server_reference: "servref",
                    reason_string: "reason",
                    receive_maximum: 12345,
                    topic_alias_maximum: 6,
                    topic_alias: 7,
                    maximum_qos: 2,
                    retain_available: true,
                    foo: "bar",
                    maximum_packet_size: 1234567,
                    wildcard_subscription_available: true,
                    subscription_identifier_available: false,
                    shared_subscription_available: true
                },
                protocol_name: "MQTT",
                protocol_version: 5,
                type: "connect",
                username: "someone",
                will_flag: true,
                will_payload: new Uint8Array(0),
                will_properties: {},
                will_qos: 0,
                will_retain: false,
                will_topic: "good/bye"
            },
            new Uint8Array([])
        ],
        "connect full");
});

QUnit.test("connack", function(assert) {
    var b = mqtt_packet.encode({ type: "connack" });
    var m = mqtt_packet.decode(b);
    assert.deepEqual(
        m,
        [
            {
                type: "connack",
                reason_code: 0,
                session_present: false,
                properties: {}
            },
            new Uint8Array([])
        ],
        "connack1");

    b = mqtt_packet.encode({
        type: "connack",
        reason_code: 0x80,
        session_present: true,
        properties: {
            foo: "bar"
        }
    });
    m = mqtt_packet.decode(b);
    assert.deepEqual(
        m,
        [
            {
                type: "connack",
                reason_code: 0x80,
                session_present: true,
                properties: {
                    foo: "bar"
                }
            },
            new Uint8Array([])
        ],
        "connack2");
});


QUnit.test("publish", function(assert) {
    var b = mqtt_packet.encode({
        type: "publish",
        topic: "foo/bar/la"
    });
    var m = mqtt_packet.decode(b);
    assert.deepEqual(
        m,
        [
            {
                type: "publish",
                topic: "foo/bar/la",
                qos: 0,
                dup: false,
                retain: false,
                packet_id: undefined,
                payload: new Uint8Array(0),
                properties: {}
            },
            new Uint8Array([])
        ],
        "publish1");

    var b = mqtt_packet.encode({
        type: "publish",
        topic: "foo/bar/la",
        qos: 2,
        dup: true,
        retain: true,
        packet_id: 1234,
        payload: "aloha",
        properties: {
            foo: "bar"
        }
    });
    var m = mqtt_packet.decode(b);
    assert.deepEqual(
        m,
        [
            {
                type: "publish",
                topic: "foo/bar/la",
                qos: 2,
                dup: true,
                retain: true,
                packet_id: 1234,
                payload: string2bin("aloha"),
                properties: {
                    "foo": "bar"
                }
            },
            new Uint8Array([])
        ],
        "publish2");
    // Packet-id is undefined when qos is 0
    var b = mqtt_packet.encode({
        type: "publish",
        topic: "foo/bar/la",
        qos: 0,
        packet_id: 1234,
        payload: "aloha"
    });
    var m = mqtt_packet.decode(b);
    assert.deepEqual(
        m,
        [
            {
                type: "publish",
                topic: "foo/bar/la",
                qos: 0,
                dup: false,
                retain: false,
                packet_id: undefined,
                payload: string2bin("aloha"),
                properties: {}
            },
            new Uint8Array([])
        ],
        "publish2");
});


QUnit.test("puback_et_al", function(assert) {
    var vs = ['puback', 'pubrec', 'pubrel', 'pubcomp'];
    for (var i = 0; i < vs.length; i++) {
        var v = vs[i];
        var b = mqtt_packet.encode({
            type: v
        });
        var m = mqtt_packet.decode(b);
        assert.deepEqual(
            m,
            [
                {
                    type: v,
                    packet_id: 0,
                    reason_code: 0,
                    properties: {}
                },
                new Uint8Array([])
            ],
            v);

        var b = mqtt_packet.encode({
            type: v,
            reason_code: 0x81,
            packet_id: 4321,
            properties: {
                "bar": "fooooo"
            }
        });
        var m = mqtt_packet.decode(b);
        assert.deepEqual(
            m,
            [
                {
                    type: v,
                    reason_code: 0x81,
                    packet_id: 4321,
                    properties: {
                        "bar": "fooooo"
                    }
                },
                new Uint8Array([])
            ],
            v);
    }
});


QUnit.test("subscribe", function(assert) {
    var b = mqtt_packet.encode({
        type: "subscribe",
        topics: [
            { topic: "foo1/bar" },
            { topic: "foo2/bar" },
        ]
    });
    var m = mqtt_packet.decode(b);
    assert.deepEqual(
        m,
        [
            {
                type: "subscribe",
                packet_id: 0,
                topics: [
                    {
                        topic: "foo1/bar",
                        no_local: false,
                        qos: 0,
                        retain_as_published: false,
                        retain_handling: 0
                    },
                    {
                        topic: "foo2/bar",
                        no_local: false,
                        qos: 0,
                        retain_as_published: false,
                        retain_handling: 0
                    }
                ],
                properties: {}
            },
            new Uint8Array([])
        ],
        "subscribe1");


    var b = mqtt_packet.encode({
        type: "subscribe",
        topics: [
            {
                topic: "foo1/bar",
                no_local: true,
                qos: 2,
                retain_as_published: true,
                retain_handling: 2
            },
            {
                topic: "foo2/bar"
            }
        ],
        properties: {
            foo: "bar"
        }
    });
    var m = mqtt_packet.decode(b);
    assert.deepEqual(
        m,
        [
            {
                type: "subscribe",
                packet_id: 0,
                topics: [
                    {
                        topic: "foo1/bar",
                        no_local: true,
                        qos: 2,
                        retain_as_published: true,
                        retain_handling: 2
                    },
                    {
                        topic: "foo2/bar",
                        no_local: false,
                        qos: 0,
                        retain_as_published: false,
                        retain_handling: 0
                    }
                ],
                properties: {
                    foo: "bar"
                }
            },
            new Uint8Array([])
        ],
        "subscribe2");
});



QUnit.test("suback", function(assert) {
    var b = mqtt_packet.encode({
        type: "suback",
        acks: []
    });
    var m = mqtt_packet.decode(b);
    assert.deepEqual(
        m,
        [
            {
                type: "suback",
                packet_id: 0,
                acks: [],
                properties: {}
            },
            new Uint8Array([])
        ],
        "suback1");

    var b = mqtt_packet.encode({
        type: "suback",
        packet_id: 12345,
        acks: [
            2, 0, 1, 0x80
        ],
        properties: {
            foo: "bar"
        }
    });
    var m = mqtt_packet.decode(b);
    assert.deepEqual(
        m,
        [
            {
                type: "suback",
                packet_id: 12345,
                acks: [
                    2, 0, 1, 0x80
                ],
                properties: {
                    foo: "bar"
                }
            },
            new Uint8Array([])
        ],
        "suback2");
});


QUnit.test("unsubscribe", function(assert) {
    var b = mqtt_packet.encode({
        type: "unsubscribe",
        topics: [
            "foo1/bar",
            "foo2/bar"
        ]
    });
    var m = mqtt_packet.decode(b);
    assert.deepEqual(
        m,
        [
            {
                type: "unsubscribe",
                packet_id: 0,
                topics: [
                    "foo1/bar",
                    "foo2/bar"
                ],
                properties: {}
            },
            new Uint8Array([])
        ],
        "unsubscribe1");

    var b = mqtt_packet.encode({
        type: "unsubscribe",
        packet_id: 42,
        topics: [
            "foo1/bar",
            "foo2/bar"
        ],
        properties: {
            foo: "bar"
        }
    });
    var m = mqtt_packet.decode(b);
    assert.deepEqual(
        m,
        [
            {
                type: "unsubscribe",
                packet_id: 42,
                topics: [
                    "foo1/bar",
                    "foo2/bar"
                ],
                properties: {
                    foo: "bar"
                }
            },
            new Uint8Array([])
        ],
        "unsubscribe2");
});


QUnit.test("unsuback", function(assert) {
    var b = mqtt_packet.encode({
        type: "unsuback",
        acks: []
    });
    var m = mqtt_packet.decode(b);
    assert.deepEqual(
        m,
        [
            {
                type: "unsuback",
                packet_id: 0,
                acks: [],
                properties: {}
            },
            new Uint8Array([])
        ],
        "unsuback1");

    var b = mqtt_packet.encode({
        type: "unsuback",
        packet_id: 12345,
        acks: [
            0, 17, 0x80
        ],
        properties: {
            foo: "bar"
        }
    });
    var m = mqtt_packet.decode(b);
    assert.deepEqual(
        m,
        [
            {
                type: "unsuback",
                packet_id: 12345,
                acks: [
                    0, 17, 0x80
                ],
                properties: {
                    foo: "bar"
                }
            },
            new Uint8Array([])
        ],
        "unsuback2");
});


QUnit.test("pingreq", function(assert) {
    var b = mqtt_packet.encode({
        type: "pingreq"
    });
    var m = mqtt_packet.decode(b);
    assert.deepEqual(
        m,
        [
            {
                type: "pingreq"
            },
            new Uint8Array([])
        ],
        "pingreq");
});


QUnit.test("pingresp", function(assert) {
    var b = mqtt_packet.encode({
        type: "pingresp"
    });
    var m = mqtt_packet.decode(b);
    assert.deepEqual(
        m,
        [
            {
                type: "pingresp"
            },
            new Uint8Array([])
        ],
        "pingresp");
});

QUnit.test("disconnect", function(assert) {
    var b = mqtt_packet.encode({
        type: "disconnect"
    });
    assert.deepEqual( b, new Uint8Array([224,0]), "disconnect");

    var m = mqtt_packet.decode(b);
    assert.deepEqual(
        m,
        [
            {
                type: "disconnect",
                reason_code: 0,
                properties: {}
            },
            new Uint8Array([])
        ],
        "disconnect2");

    var b = mqtt_packet.encode({
        type: "disconnect",
        reason_code: 0x81,
        properties: {
            foo: "bar"
        }
    });
    var m = mqtt_packet.decode(b);
    assert.deepEqual(
        m,
        [
            {
                type: "disconnect",
                reason_code: 0x81,
                properties: {
                    foo: "bar"
                }
            },
            new Uint8Array([])
        ],
        "disconnect3");
});


QUnit.test("auth", function(assert) {
    var b = mqtt_packet.encode({
        type: "auth"
    });
    var m = mqtt_packet.decode(b);
    assert.deepEqual(
        m,
        [
            {
                type: "auth",
                reason_code: 0,
                properties: {}
            },
            new Uint8Array([])
        ],
        "auth1");

    var b = mqtt_packet.encode({
        type: "auth",
        reason_code: 0x80,
        properties: {
            foo: "bar"
        }
    });
    var m = mqtt_packet.decode(b);
    assert.deepEqual(
        m,
        [
            {
                type: "auth",
                reason_code: 0x80,
                properties: {
                    foo: "bar"
                }
            },
            new Uint8Array([])
        ],
        "auth2");
});
