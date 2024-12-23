/**
 * Copyright 2018-2023 The Cotonic Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @doc Encoder/decoder for MQTT v5, see also http://docs.oasis-open.org/mqtt/mqtt/v5.0/cs01/mqtt-v5.0-cs01.html
 */

/**
 * Unique message type identifiers, with associated
 * associated integer values.
 * @private
 */
const MESSAGE_TYPE = {
    CONNECT: 1,
    CONNACK: 2,
    PUBLISH: 3,
    PUBACK: 4,
    PUBREC: 5,
    PUBREL: 6,
    PUBCOMP: 7,
    SUBSCRIBE: 8,
    SUBACK: 9,
    UNSUBSCRIBE: 10,
    UNSUBACK: 11,
    PINGREQ: 12,
    PINGRESP: 13,
    DISCONNECT: 14,
    AUTH : 15
};

const PROPERTY = {
    payload_format_indicator:   [ 0x01, "bool", false ],
    message_expiry_interval:    [ 0x02, "uint32", false ],
    content_type:               [ 0x03, "utf8", false ],
    response_topic:             [ 0x08, "utf8", false ],
    correlation_data:           [ 0x09, "bin", false ],
    subscription_identifier:    [ 0x0B, "varint", true ],
    session_expiry_interval:    [ 0x11, "uint32", false ],
    assigned_client_identifier: [ 0x12, "utf8", false ],
    server_keep_alive:          [ 0x13, "uint16", false ],
    authentication_method:      [ 0x15, "utf8", false ],
    authentication_data:        [ 0x16, "bin", false ],
    request_problem_information:[ 0x17, "bool", false ],
    will_delay_interval:        [ 0x18, "uint32", false ],
    request_response_information:[0x19, "bool", false ],
    response_information:       [ 0x1A, "bin", false ],
    server_reference:           [ 0x1C, "utf8", false ],
    reason_string:              [ 0x1F, "utf8", false ],
    receive_maximum:            [ 0x21, "uint16", false ],
    topic_alias_maximum:        [ 0x22, "uint16", false ],
    topic_alias:                [ 0x23, "uint16", false ],
    maximum_qos:                [ 0x24, "uint8", false ],
    retain_available:           [ 0x25, "bool", false ],
    __user:                     [ 0x26, "user", false ],
    maximum_packet_size:        [ 0x27, "uint32", false ],
    wildcard_subscription_available:   [ 0x28, "bool", false ],
    subscription_identifier_available: [ 0x29, "bool", false ],
    shared_subscription_available:     [ 0x2A, "bool", false ]
};

// Filled in from PROPERTY by the init code
const PROPERTY_DECODE = [];

//MQTT proto/version for v5          4    M    Q    T    T    5
const MqttProtoIdentifierv5 = [0x00,0x04,0x4d,0x51,0x54,0x54,0x05];


/******************************************************************/
/*********************** Encoder functions ************************/
/******************************************************************/

/**
 * Encode a message into a binary packet
 * @public
 */
const encoder = function(msg) {
    switch (msg.type) {
        case "connect":
            return encodeConnect(msg);
        case "connack":
            return encodeConnack(msg);
        case "publish":
            return encodePublish(msg);
        case "puback":
        case "pubrec":
        case "pubrel":
        case "pubcomp":
            return encodePubackEtAl(msg);
        case "subscribe":
            return encodeSubscribe(msg);
        case "suback":
            return encodeSuback(msg);
        case "unsubscribe":
            return encodeUnsubscribe(msg);
        case "unsuback":
            return encodeUnsuback(msg);
        case "pingreq":
            return encodePingReq(msg);
        case "pingresp":
            return encodePingResp(msg);
        case "disconnect":
            return encodeDisconnect(msg);
        case "auth":
            return encodeAuth(msg);
        default:
            throw "Unknown type for encode: " + msg;
    }
};

function encodeConnect( msg ) {
    const first = MESSAGE_TYPE.CONNECT << 4;
    const willFlag = msg.will_flag || false;
    const willRetain = msg.will_retain || false;
    const willQoS = msg.will_qos || 0;
    const cleanStart = msg.clean_start || false;
    const v = new binary();
    v.append(MqttProtoIdentifierv5);

    let flags = 0;
    if (typeof msg.username == "string") {
        flags |= 1 << 7;
    }
    if (typeof msg.password == "string") {
        flags |= 1 << 6;
    }
    flags |= (willRetain ? 1 : 0) << 5;
    flags |= (willQoS & 3) << 3;
    flags |= (willFlag ? 1 : 0) << 2;
    flags |= (cleanStart ? 1 : 0) << 1;
    v.append1(flags);
    v.appendUint16(msg.keep_alive || 0);
    v.appendProperties(msg.properties || {});
    v.appendUTF8(msg.client_id || "");

    if (willFlag) {
        v.appendProperties(msg.will_properties || {});
        v.appendUTF8(msg.will_topic);
        v.appendBin(msg.will_payload, true);
    }
    if (typeof msg.username == "string") {
        v.appendUTF8(msg.username);
    }
    if (typeof msg.password == "string") {
        v.appendUTF8(msg.password);
    }
    return packet(first, v);
}

function encodeConnack( msg ) {
    const first = MESSAGE_TYPE.CONNACK << 4;
    let flags = 0;
    const v = new binary();
    if (msg.session_present) {
        flags |= 1;
    }
    v.append1( flags );
    v.append1( msg.reason_code || 0 );
    v.appendProperties(msg.properties || {});
    return packet(first, v);
}

function encodePublish( msg ) {
    let first = MESSAGE_TYPE.PUBLISH << 4;
    const v = new binary();
    const qos = msg.qos || 0;
    const dup = msg.dup || false;
    const retain = msg.retain || false;
    first |= (dup ? 1 : 0) << 3;
    first |= (qos & 0x03) << 1;
    first |= (retain ? 1 : 0);
    v.appendUTF8( msg.topic );
    if (qos != 0) {
        v.appendUint16(msg.packet_id);
    }
    v.appendProperties(msg.properties || {});
    if (typeof msg.payload !== 'undefined') {
        v.appendBin(msg.payload);
    }
    return packet(first, v);
}

function encodePubackEtAl( msg ) {
    let first;
    const v = new binary();
    const rc = msg.reason_code || 0;
    const ps = msg.properties || {};
    switch (msg.type) {
        case 'puback':
            first |= MESSAGE_TYPE.PUBACK << 4;
            break;
        case 'pubrec':
            first |= MESSAGE_TYPE.PUBREC << 4;
            break;
        case 'pubrel':
            first |= MESSAGE_TYPE.PUBREL << 4 | 2;
            break;
        case 'pubcomp':
            first |= MESSAGE_TYPE.PUBCOMP << 4;
            break;
    }
    v.appendUint16(msg.packet_id);
    if (rc != 0 || Object.keys(ps).length != 0) {
        v.append1(rc);
        v.appendProperties(ps);
    }
    return packet(first, v);
}

function encodeSubscribe( msg ) {
    let first = MESSAGE_TYPE.SUBSCRIBE << 4;
    const v = new binary();
    first |= 1 << 1;
    v.appendUint16(msg.packet_id);
    v.appendProperties(msg.properties || {});
    serializeSubscribeTopics(v, msg.topics);
    return packet(first, v);
}

function encodeSuback( msg ) {
    const first = MESSAGE_TYPE.SUBACK << 4;
    const v = new binary();
    v.appendUint16(msg.packet_id);
    v.appendProperties(msg.properties || {});
    serializeSubscribeAcks(v, msg.acks);
    return packet(first, v);
}

function encodeUnsubscribe( msg ) {
    const first = (MESSAGE_TYPE.UNSUBSCRIBE << 4) | 0x2;
    const v = new binary();
    v.appendUint16(msg.packet_id);
    v.appendProperties(msg.properties || {});
    serializeUnsubscribeTopics(v, msg.topics);
    return packet(first, v);
}

function encodeUnsuback( msg ) {
    const first = MESSAGE_TYPE.UNSUBACK << 4;
    const v = new binary();
    v.appendUint16(msg.packet_id);
    v.appendProperties(msg.properties || {});
    serializeUnsubscribeAcks(v, msg.acks);
    return packet(first, v);
}

function encodePingReq( ) {
    const first = MESSAGE_TYPE.PINGREQ << 4;
    const v = new binary();
    return packet(first, v);
}

function encodePingResp( ) {
    const first = MESSAGE_TYPE.PINGRESP << 4;
    const v = new binary();
    return packet(first, v);
}

function encodeDisconnect( msg ) {
    const first = MESSAGE_TYPE.DISCONNECT << 4;
    const v = new binary();
    const reason_code = msg.reason_code || 0;
    const properties = msg.properties || {};

    if (reason_code != 0 || !isEmptyProperties(properties)) {
        v.append1(reason_code);
        v.appendProperties(properties);
    }
    return packet(first, v);
}

function encodeAuth( msg ) {
    const first = MESSAGE_TYPE.AUTH << 4;
    const v = new binary();
    const reason_code = msg.reason_code || 0;
    const properties = msg.properties || {};

    if (reason_code != 0 || !isEmptyProperties(properties)) {
        v.append1(reason_code);
        v.appendProperties(properties);
    }
    return packet(first, v);
}

/******************************************************************/
/*********************** Decoder functions ************************/
/******************************************************************/

/**
 * Decode a binary packet into a message
 * @public
 */
const decoder = function( binary ) {
    // At least a byte and 0 length varint.
    if (binary.length < 2) {
        throw "incomplete_packet";
    }
    // The following might throw 'incomplete_packet'
    const b = new decodeStream(binary);
    const first = b.decode1();
    const len = b.decodeVarint();
    const variable = b.decodeBin(len);
    let m;

    try {
        // Decode the complete packet
        const vb = new decodeStream(variable);
        switch (first >> 4) {
            case MESSAGE_TYPE.CONNECT:
                m = decodeConnect(first, vb);
                break;
            case MESSAGE_TYPE.CONNACK:
                m = decodeConnack(first, vb);
                break;
            case MESSAGE_TYPE.PUBLISH:
                m = decodePublish(first, vb);
                break;
            case MESSAGE_TYPE.PUBACK:
            case MESSAGE_TYPE.PUBREC:
            case MESSAGE_TYPE.PUBCOMP:
                m = decodePubackEtAl(first, vb);
                break;
            case MESSAGE_TYPE.PUBREL:
                if ((first & 15) !== 2) {
                    throw "invalid_packet";
                }
                m = decodePubackEtAl(first, vb);
                break;
            case MESSAGE_TYPE.SUBSCRIBE:
                m = decodeSubscribe(first, vb);
                break;
            case MESSAGE_TYPE.SUBACK:
                m = decodeSuback(first, vb);
                break;
            case MESSAGE_TYPE.UNSUBSCRIBE:
                m = decodeUnsubscribe(first, vb);
                break;
            case MESSAGE_TYPE.UNSUBACK:
                m = decodeUnsuback(first, vb);
                break;
            case MESSAGE_TYPE.PINGREQ:
                m = decodePingReq(first, vb);
                break;
            case MESSAGE_TYPE.PINGRESP:
                m = decodePingResp(first, vb);
                break;
            case MESSAGE_TYPE.DISCONNECT:
                m = decodeDisconnect(first, vb);
                break;
            case MESSAGE_TYPE.AUTH:
                m = decodeAuth(first, vb);
                break;
            default:
                throw "invalid_packet";
        }
    }
    catch (E) {
        let err = E;
        // incomplete data within a complete packet
        if (err === 'incomplete_packet') {
            err = 'invalid_packet';
        }
        throw err; 
    }
    return [ m, b.remainingData() ];
};

function decodeConnect( _first, vb ) {
    const protocolName = vb.decodeUtf8();
    const protocolLevel = vb.decode1();

    if (protocolName == "MQTT" && protocolLevel == 5) {
        const flags = vb.decode1();

        const usernameFlag = !!(flags & 0x80);
        const passwordFlag = !!(flags & 0x40);
        const willRetain   = !!(flags & 0x20);
        const willQos      = (flags >> 3) & 0x3;
        const willFlag     = !!(flags & 0x04);
        const cleanStart   = !!(flags & 0x02);

        const keepAlive = vb.decodeUint16();
        const props = vb.decodeProperties();
        const clientId = vb.decodeUtf8();
        let willProps = {};
        let willTopic;
        let willPayload;

        if (willFlag) {
            willProps = vb.decodeProperties();
            willTopic = vb.decodeUtf8();
            const willPayloadLen = vb.decodeUint16();
            willPayload = vb.decodeBin(willPayloadLen);
        }

        let username;
        let password;
        if (usernameFlag) {
            username = vb.decodeUtf8();
        }
        if (passwordFlag) {
            password = vb.decodeUtf8();
        }

        return {
            type: 'connect',
            protocol_name: protocolName,
            protocol_version: protocolLevel,
            client_id: clientId,
            clean_start: cleanStart,
            keep_alive: keepAlive,
            properties: props,
            username: username,
            password: password,
            will_flag: willFlag,
            will_retain: willRetain,
            will_qos: willQos,
            will_properties: willProps,
            will_topic: willTopic,
            will_payload: willPayload
        };
    } else {
        throw "unknown_protocol";
    }
}

function decodeConnack( _first, vb ) {
    const flags = vb.decode1();
    const sessionPresent = !!(flags & 1);
    const connectReason = vb.decode1();
    const props = vb.decodeProperties();
    return {
        type: 'connack',
        session_present: sessionPresent,
        reason_code: connectReason,
        properties: props
    };
}

function decodePublish( first, vb ) {
    const dup    = !!(first & 0x08);
    const qos    = (first >> 1) & 0x03;
    const retain = !!(first & 0x01);
    const topic = vb.decodeUtf8();
    let packetId = null;

    if (qos > 0) {
        packetId = vb.decodeUint16();
    }
    const props = vb.decodeProperties();
    const payload = vb.remainingData();
    return {
        type: 'publish',
        dup: dup,
        qos: qos,
        retain: retain,
        topic: topic,
        packet_id: packetId,
        properties: props,
        payload: payload
    };
}

function decodePubackEtAl( first, vb ) {
    const packetId = vb.decodeUint16();
    let reasonCode = 0;
    let props = {};
    let type;

    if (vb.remainingLength() > 0) {
        reasonCode = vb.decode1();
        props = vb.decodeProperties();
    }
    switch (first >> 4) {
        case MESSAGE_TYPE.PUBACK:
            type = 'puback';
            break;
        case MESSAGE_TYPE.PUBREC:
            type = 'pubrec';
            break;
        case MESSAGE_TYPE.PUBREL:
            type = 'pubrel';
            break;
        case MESSAGE_TYPE.PUBCOMP:
            type = 'pubcomp';
            break;
    }
    return {
        type: type,
        packet_id: packetId,
        reason_code: reasonCode,
        properties: props
    };
}

function decodeSubscribe( _first, vb ) {
    const packetId = vb.decodeUint16();
    const props = vb.decodeProperties();
    const topics = [];
    while (vb.remainingLength() > 0) {
        const name = vb.decodeUtf8();
        const flags = vb.decode1();
        topics.push({
            topic: name,
            retain_handling: (flags >> 4) % 0x03,
            retain_as_published: !!(flags & 0x08),
            no_local: !!(flags & 0x04),
            qos: flags & 0x03
        });
    }
    return {
        type: 'subscribe',
        packet_id: packetId,
        topics: topics,
        properties: props
    };
}

function decodeSuback( _first, vb ) {
    const packetId = vb.decodeUint16();
    const props = vb.decodeProperties();
    const acks = [];
    while (vb.remainingLength() > 0) {
        //  0..2 is Qos, 0x80+ is error code
        const ack = vb.decode1();
        if (ack > 2 && ack < 0x80) {
            throw "Illegal suback";
        }
        acks.push(ack);
    }
    return {
        type: 'suback',
        packet_id: packetId,
        properties: props,
        acks: acks
    };
}

function decodeUnsubscribe( _first, vb ) {
    const packetId = vb.decodeUint16();
    const props = vb.decodeProperties();
    const topics = [];
    while (vb.remainingLength() > 0) {
        const topic = vb.decodeUtf8();
        topics.push(topic);
    }
    return {
        type: 'unsubscribe',
        packet_id: packetId,
        properties: props,
        topics: topics
    };
}

function decodeUnsuback( _first, vb ) {
    const packetId = vb.decodeUint16();
    const props = vb.decodeProperties();
    const acks = [];
    while (vb.remainingLength() > 0) {
        //  0..2 is Qos, 0x80+ is error code
        const ack = vb.decode1();
        if (ack != 0 && ack != 17 && ack < 0x80) {
            throw "Illegal unsuback";
        }
        acks.push(ack);
    }
    return {
        type: 'unsuback',
        packet_id: packetId,
        properties: props,
        acks: acks
    };
}

function decodePingReq( _first, vb ) {
    if (vb.remainingLength() > 0) {
        throw "pingreq with variable part";
    }
    return {
        type: 'pingreq'
    };
}

function decodePingResp( _first, vb ) {
    if (vb.remainingLength() > 0) {
        throw "pingresp with variable part";
    }
    return {
        type: 'pingresp'
    };
}

function decodeDisconnect( _first, vb ) {
    let reasonCode;
    let props;
    if (vb.remainingLength() == 0) {
        reasonCode = 0;
        props = {};
    } else {
        reasonCode = vb.decode1();
        props = vb.decodeProperties();
    }
    return {
        type: 'disconnect',
        reason_code: reasonCode,
        properties: props
    };
}

function decodeAuth( _first, vb ) {
    let reasonCode;
    let props;
    if (vb.remainingLength() == 0) {
        reasonCode = 0;
        props = {};
    } else {
        reasonCode = vb.decode1();
        props = vb.decodeProperties();
    }
    return {
        type: 'auth',
        reason_code: reasonCode,
        properties: props
    };
}

/******************************************************************/
/************************ Decode Helpers **************************/
/******************************************************************/


/**
 * Simple binary buffer with helper functions for decoding
 * @private
 */
function decodeStream ( binary ) {
    this.offset = 0;
    this.buf = binary;

    this.remainingLength = () => {
        return this.buf.length - this.offset;
    };

    this.remainingData = () => {
        if (this.buf.length == this.offset) {
            return new Uint8Array(0);
        } else {
            return this.buf.slice(this.offset, this.buf.length);
        }
    };

    this.ensure = ( n ) => {
        if (this.offset + n > this.buf.length) {
            throw "incomplete_packet";
        }
    };

    this.decodeVarint = () => {
        let multiplier = 1;
        let n = 0;
        let digits = 0;
        let digit;
        do {
            this.ensure(1);
            if (++digits > 4) {
                throw "malformed";
            }
            digit = this.buf[this.offset++];
            n += ((digit & 0x7F) * multiplier);
            multiplier *= 128;
        } while ((digit & 0x80) !== 0);
        return n;
    };

    this.decode1 = () => {
        this.ensure(1);
        return this.buf[this.offset++];
    };

    this.decodeUint16 = () => {
        this.ensure(2);
        const msb = this.buf[this.offset++];
        const lsb = this.buf[this.offset++];
        return (msb << 8) + lsb;
    };

    this.decodeUint32 = () => {
        this.ensure(4);
        const b1 = this.buf[this.offset++];
        const b2 = this.buf[this.offset++];
        const b3 = this.buf[this.offset++];
        const b4 = this.buf[this.offset++];
        return (b1 << 24) + (b2 << 16) + (b3 << 8) + b4;
    };

    this.decodeBin = ( length ) => {
        if (length == 0) {
            return new Uint8Array(0);
        } else {
            this.ensure(length);
            const offs = this.offset;
            this.offset += length;
            return this.buf.slice(offs, this.offset);
        }
    };

    this.decodeUtf8 = () => {
        const length = this.decodeUint16();
        return UTF8ToString( this.decodeBin(length) );
    };

    this.decodeProperties = () => {
        if (this.remainingLength() == 0) {
            return {};
        }
        const len = this.decodeVarint();
        const end = this.offset + len;
        const props = {};
        while (this.offset < end) {
            const c = this.decode1();
            const p = PROPERTY_DECODE[c];
            if (p) {
                let v;
                let k = p[0];
                switch (p[1]) {
                    case "bool":
                        v = !!(this.decode1());
                        break;
                    case "uint32":
                        v = this.decodeUint32();
                        break;
                    case "uint16":
                        v = this.decodeUint16();
                        break;
                    case "uint8":
                        v = this.decode1();
                        break;
                    case "utf8":
                        v = this.decodeUtf8();
                        break;
                    case "bin":
                        v = this.decodeBin( this.decodeUint16() /* count */ );
                        break;
                    case "varint":
                        v = this.decodeVarint();
                        break;
                    case "user":
                    default:
                        // User property
                        k = this.decodeUtf8();
                        v = this.decodeUtf8();
                        break;
                }
                if (p[2]) {
                    switch (typeof props[k]) {
                        case 'undefined':
                            props[k] = v;
                            break;
                        case 'object':
                            // assume array
                            props[k].push(v);
                            break;
                        default:
                            props[k] = [props[k], v];
                            break;
                    }
                } else {
                    props[k] = v;
                }
            } else {
                throw "Illegal property";
            }
        }
        return props;
    };
}

/******************************************************************/
/************************ Encode Helpers **************************/
/******************************************************************/


/**
 * Serialize the topics for a subscribe.
 * @private
 */
function serializeSubscribeTopics( v, topics ) {
    for (let i = 0; i < topics.length; i++) {
        let topic = topics[i];
        if (typeof topic == "string") {
            topic = { topic: topic };
        }
        const qos = topic.qos || 0;
        const noLocal = topic.no_local || false;
        const retainAsPublished = topic.retain_as_published || false;
        const retainHandling = topic.retain_handling || 0;
        let flags = 0;
        flags |= retainHandling << 4;
        flags |= (retainAsPublished ? 1 : 0) << 3;
        flags |= (noLocal ? 1 : 0) << 2;
        flags |= qos;
        v.appendUTF8(topic.topic);
        v.append1(flags);
    }
}

/**
 * Serialize the ack returns for a subscribe.
 * @private
 */
function serializeSubscribeAcks( v, acks ) {
    for (let i = 0; i < acks.length; i++) {
        const ack = acks[i];
        if (ack >= 0 && ack <= 2) {
            // ok result with QoS
            v.append1(ack);
        } else if (ack >= 0x80 && ack <= 0xff) {
            // error code
            v.append1(ack);
        } else {
            throw "Subscribe ack outside 0..2 and 0x80..0xff";
        }
    }
}

/**
 * Serialize the topics for a unsubscribe.
 * @private
 */
function serializeUnsubscribeTopics( v, topics ) {
    for (let i = 0; i < topics.length; i++) {
        v.appendUTF8(topics[i]);
    }
}

/**
 * Serialize the ack returns for a unsubscribe.
 * @private
 */
function serializeUnsubscribeAcks( v, acks ) {
    for (let i = 0; i < acks.length; i++) {
        const ack = acks[i];
        if (ack == 0 || ack == 17) {
            // found or not-found
            v.append1(ack);
        } else if (ack >= 0x80 && ack <= 0xff) {
            // error code
            v.append1(ack);
        } else {
            throw "Unsubscribe ack outside 0..2 and 0x80..0xff";
        }
    }
}


/**
 * Append the first byte and the variable part
 * Return the Uint8Array with the concatenated result
 * @private
 */
function packet( first, binary ) {
    const mbi = encodeMBI(binary.length());
    const pack = new Uint8Array( 1 + mbi.length + binary.length());

    pack[0] = first;
    for (let i = 0; i < mbi.length; i++) {
        pack[ 1 + i ] = mbi[i];
    }
    binary.copyInto(pack, 1 + mbi.length);
    return pack;
}

/**
 * Binaries, implemented as Uint8Array
 * Simple append and val functions.
 * The internal buffer is expanded when needed.
 * @private
 */
function binary() {
    this.size = 64;
    this.buf = new Uint8Array( this.size );
    this.len = 0;
    // const self = this;

    this.length = () => {
        return this.len;
    };

    this.copyInto = ( buf, offset ) => {
        for (let i = this.len-1; i >= 0; i--) {
            buf[i+offset] = this.buf[i];
        }
    };

    this.val = () => {
        return this.buf.slice( 0, this.len );
    };

    this.append = ( bytes ) => {
        this.reserve( bytes.length );
        for (let i = 0; i < bytes.length; i++) {
            this.buf[ this.len++ ] = bytes[i];
        }
    };

    this.append1 = ( byte ) => {
        this.reserve(1);
        this.buf[ this.len++ ] = byte;
    };

    this.appendUint32 = ( input ) => {
        this.reserve(4);
        if (input < 0) {
            throw "Value uint32 below 0";
        }
        this.buf[ this.len++ ] = (input >> 24) & 255;
        this.buf[ this.len++ ] = (input >> 16) & 255;
        this.buf[ this.len++ ] = (input >> 8) & 255;
        this.buf[ this.len++ ] = input & 255;
    };

    this.appendUint16 = ( input ) => {
        this.reserve(2);
        if (input < 0 || input >= 65536) {
            throw "Value too large for uint16";
        }
        this.buf[ this.len++ ] = input >> 8;
        this.buf[ this.len++ ] = input & 255;
    };

    this.appendVarint = ( number ) => {
        if (number < 0) {
            throw "Negative varint";
        }
        let numBytes = 0;
        do {
            this.reserve(1);
            let digit = number % 128;
            number = number >> 7;
            if (number > 0) {
                digit |= 0x80;
            }
            this.buf[ this.len++ ] = digit;
        } while ( (number > 0) && ( ++numBytes < 4) );
    };

    this.appendUTF8 = ( s ) => {
        const b = stringToUTF8(s);
        this.appendUint16(b.length);
        this.reserve(b.length);
        for (let i = 0; i < b.length; i++) {
            this.buf[ this.len++ ] = b[i];
        }
    };

    this.appendBin = ( b, addlen ) => {
        switch (typeof b) {
            case "undefined":
                // Append empty data
                if (addlen) {
                    this.appendUint16(0);
                }
                break;
            case "string":
                b = stringToUTF8(b);
                if (addlen) {
                    this.appendUint16(b.length);
                }
                this.reserve(b.length);
                for (let i = 0; i < b.length; i++) {
                    this.buf[ this.len++ ] = b[i];
                }
                break;
            case "object":
                if (b instanceof binary) {
                    if (addlen) {
                        this.appendUint16(b.length());
                    }
                    this.reserve(b.length());
                    b.copyInto(this.buf, this.len);
                    this.len += b.length();
                } else if (typeof b.BYTES_PER_ELEMENT == "number") {
                    // Assume a TypedArray
                    let v;
                    if (b.BYTES_PER_ELEMENT == 1) {
                        v = b;
                    } else {
                        v = new Uint8Array( b.buffer );
                    }
                    this.reserve(v.length + 2);
                    if (addlen) {
                        this.appendUint16(v.length);
                    }
                    for (let i = 0; i < v.length; i++) {
                        this.buf[this.len++] = v[i];
                    }
                } else {
                    throw "Can't serialize unknown object";
                }
                break;
            default:
                throw "Can't serialize unsupported type: "+(typeof b);
        }
    };

    this.appendProperties = ( props ) => {
        const b = serializeProperties(props);

        this.appendVarint(b.length());
        this.appendBin(b);
    };

    this.reserve = ( count ) => {
        if (this.size < this.len + count ) {
            let newsize = this.size * 2;
            while (newsize < this.size + count) {
                newsize = newsize * 2;
            }
            const newbuf = new Uint8Array(newsize);

            for (let i = this.len-1; i >= 0; i--) {
                newbuf[i] = this.buf[i];
            }
            this.size = newsize;
            this.buf = newbuf;
        }
    };
}


/**
 * Check if the properties object is empty
 * @private
 */
function isEmptyProperties( props ) {
    for (const k in props) {
        if (!Object.prototype.hasOwnProperty.call(props, k)) {
            continue;
        }
        return false;
    }
    return true;
}

/**
 * Serialize the properties.
 * Return a new 'binary' with the serialized properties.
 * @private
 */
function serializeProperties( props ) {
    const b = new binary();
    for (const k in props) {
        if (!Object.prototype.hasOwnProperty.call(props, k)) {
            continue;
        }
        const p = (PROPERTY[k] || PROPERTY.__user);
        if (p[2] && props[k].constructor === Array) {
            for (let i = 0; i < props[k].length; i++) {
                b.append1(p[0]);
                serializeProperty(p[1], k, props[k][i], b);
            }
        } else {
            b.append1(p[0]);
            serializeProperty(p[1], k, props[k], b);
        }
    }
    return b;
}

function serializeProperty( type, k, v, b ) {
    switch (type) {
        case "bool":
            b.append1(v ? 1 : 0);
            break;
        case "uint32":
            b.appendUint32(v);
            break;
        case "uint16":
            b.appendUint16(v);
            break;
        case "uint8":
            b.append1(v);
            break;
        case "utf8":
            b.appendUTF8(v);
            break;
        case "bin":
            b.appendBin(v, true);
            break;
        case "varint":
            b.appendVarint(v);
                break;
        case "user":
        default:
            // User property
            b.appendUTF8(k);
            b.appendUTF8(v);
            break;
    }
}


/**
 * Takes an Uint8Array with UTF8 encoded bytes and writes it into a String.
 * @public
 */
function UTF8ToString ( input ) {
    return new TextDecoder("utf-8").decode(input);
}

/**
 * Takes a string, returns an Uint8Array with UTF8
 * @public
 */
function stringToUTF8 ( input ) {
    return new TextEncoder("utf-8").encode(input);
}

/**
 * Encodes an MQTT Multi-Byte Integer
 * @private
 */
function encodeMBI(number) {
    const output = new Array(1);
    let numBytes = 0;

    do {
        let digit = number % 128;
        number = number >> 7;
        if (number > 0) {
            digit |= 0x80;
        }
        output[numBytes++] = digit;
    } while ( (number > 0) && (numBytes<4) );

    return output;
}

/**
 * Initialize some lookup arrays etc
 */
function init() {
    for (const k in PROPERTY) {
        const p = PROPERTY[k];
        PROPERTY_DECODE[p[0]] = [ k, p[1], p[2] ];
    }
}

init();

export { encoder as encode , decoder as decode, stringToUTF8, UTF8ToString };
