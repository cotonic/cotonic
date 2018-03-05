/**
 * Copyright 2018 The Cotonic Authors. All Rights Reserved.
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

"use strict";
var cotonic = cotonic || {};

(function (cotonic) {

    /**
     * Unique message type identifiers, with associated
     * associated integer values.
     * @private
     */
    var MESSAGE_TYPE = {
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

    var PROPERTY = {
        payload_format_indicator:   [ 0x01, "bool" ],
        message_expiry_interval:    [ 0x02, "uint32" ],
        content_type:               [ 0x03, "utf8" ],
        response_topic:             [ 0x08, "topic" ],
        correlation_data:           [ 0x09, "bin" ],
        subscription_identifier:    [ 0x0B, "varint" ],
        session_expiry_interval:    [ 0x11, "uint32" ],
        assigned_client_identifier: [ 0x12, "utf8" ],
        server_keep_alive:          [ 0x13, "uint16" ],
        authentication_method:      [ 0x15, "utf8" ],
        authentication_data:        [ 0x16, "bin" ],
        request_problem_information:[ 0x17, "bool" ],
        will_delay_interval:        [ 0x18, "uint32" ],
        request_response_information:[0x19, "bool" ],
        response_information:       [ 0x1A, "bin" ],
        server_reference:           [ 0x1C, "utf8" ],
        reason_string:              [ 0x1F, "utf8" ],
        receive_maximum:            [ 0x21, "uint16" ],
        topic_alias_maximum:        [ 0x22, "uint16" ],
        topic_alias:                [ 0x23, "uint16" ],
        maximum_qos:                [ 0x24, "uint8" ],
        retain_available:           [ 0x25, "bool" ],
        __user:                     [ 0x26, "user" ],
        maximum_packet_size:        [ 0x27, "uint32" ],
        wildcard_subscription_available:   [ 0x28, "bool" ],
        subscription_identifier_available: [ 0x29, "bool" ],
        shared_subscription_available:     [ 0x2A, "bool" ]
    };

    //MQTT proto/version for v5          4    M    Q    T    T    5
    var MqttProtoIdentifierv5 = [0x00,0x04,0x4d,0x51,0x54,0x54,0x05];

    /******************************************************************/
    /*********************** Encoder functions ************************/
    /******************************************************************/

    /**
     * Encode a message into a binary packet
     * @public
     */
    var encoder = function(msg) {
        switch (msg.type) {
            case "connect":
                return encode_connect(msg);
            case "connack":
                return encode_connack(msg);
            case "publish":
                return encode_publish(msg);
            case "puback":
            case "pubrec":
            case "pubrel":
            case "pubcomp":
                return encode_puback_et_al(msg);
            case "subscribe":
                return encode_subscribe(msg);
            case "suback":
                return encode_suback(msg);
            case "unsubscribe":
                return encode_unsubscribe(msg);
            case "unsuback":
                return encode_unsuback(msg);
            case "pingreq":
                return encode_pingreq(msg);
            case "pingresp":
                return encode_pingresp(msg);
            case "disconnect":
                return encode_disconnect(msg);
            case "auth":
                return encode_auth(msg);
            default:
                throw "Unknown type for encode: " + msg;
        }
    };

    function encode_connect( msg ) {
        var first = MESSAGE_TYPE.CONNECT << 4;
        var willFlag = msg.will_flag || false;
        var willRetain = msg.will_retain || false;
        var willQoS = msg.will_qos || 0;
        var cleanStart = msg.clean_start || false;
        var v = new binary();
        v.append(MqttProtoIdentifierv5);

        var flags = 0;
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

    function encode_connack( msg ) {
        var first = MESSAGE_TYPE.CONNACK << 4;
        var v = new binary();
        if (msg.session_present) {
            first |= 1;
        }
        v.append1( msg.reason_code || 0 );
        v.appendProperties(msg.properties || {});
        return packet(first, v);
    }

    function encode_publish( msg ) {
        var first = MESSAGE_TYPE.PUBLISH << 4;
        var v = new binary();
        var qos = msg.qos || 0;
        var dup = msg.dup || false;
        var retain = msg.retain || false;
        first |= (dup ? 1 : 0) << 3;
        first |= (qos & 0x03) << 1
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

    function encode_puback_et_al( msg ) {
        var first;
        var v = new binary();
        switch (msg.type) {
            case 'puback':
                first |= MESSAGE_TYPE.PUBACK << 4;
                break;
            case 'pubrec':
                first |= MESSAGE_TYPE.PUBREC << 4;
                break;
            case 'pubrel':
                first |= MESSAGE_TYPE.PUBREL << 4;
                break;
            case 'pubcomp':
                first |= MESSAGE_TYPE.PUBCOMP << 4;
                break;
        }
        v.appendUint16(msg.packet_id);
        v.appendProperties(msg.properties || {});
        return packet(first, v);
    }

    function encode_subscribe( msg ) {
        var first = MESSAGE_TYPE.SUBSCRIBE << 4;
        var v = new binary();
        first |= 1 << 1;
        v.appendUint16(msg.packet_id);
        v.appendProperties(msg.properties || {});
        serializeSubscribeTopics(v, msg.topics);
        return packet(first, v);
    }

    function encode_suback( msg ) {
        var first = MESSAGE_TYPE.SUBACK << 4;
        var v = new binary();
        v.appendUint16(msg.packet_id);
        v.appendProperties(msg.properties || {});
        serializeSubscribeAcks(v, msg.acks);
        return packet(first, v);
    }

    function encode_unsubscribe( msg ) {
        var first = MESSAGE_TYPE.UNSUBSCRIBE << 4;
        var v = new binary();
        v.appendUint16(msg.packet_id);
        v.appendProperties(msg.properties || {});
        serializeUnsubscribeTopics(v, msg.topics);
        return packet(first, v);
    }

    function encode_unsuback( msg ) {
        var first = MESSAGE_TYPE.UNSUBACK << 4;
        var v = new binary();
        v.appendUint16(msg.packet_id);
        v.appendProperties(msg.properties || {});
        serializeUnsubscribeAcks(v, msg.acks);
        return packet(first, v);
    }

    function encode_pingreq( msg ) {
        var first = MESSAGE_TYPE.PINGREQ << 4;
        var v = new binary();
        return packet(first, v);
    }

    function encode_pingresp( msg ) {
        var first = MESSAGE_TYPE.PINGRESP << 4;
        var v = new binary();
        return packet(first, v);
    }

    function encode_disconnect( msg ) {
        var first = MESSAGE_TYPE.DISCONNECT << 4;
        var v = new binary();
        var reason_code = msg.reason_code || 0;
        var properties = msg.properties || {};

        if (reason_code != 0 || !isEmptyProperties(properties)) {
            v.append1(reason_code);
            v.appendProperties(properties);
        }
        return packet(first, v);
    }

    function encode_auth( msg ) {
        var first = MESSAGE_TYPE.AUTH << 4;
        var v = new binary();
        v.append1(msg.reason_code || 0);
        v.appendProperties(msg.properties || {});
        return packet(first, v);
    }

    /******************************************************************/
    /*********************** Decoder functions ************************/
    /******************************************************************/

    /**
     * Decode a binary packet into a message
     * @public
     */
    var decoder = function(binary) {
    };


    /******************************************************************/
    /*********************** Helper functions *************************/
    /******************************************************************/

    /**
     * Serialize the topics for a subscribe.
     * @private
     */
    function serializeSubscribeTopics( v, topics ) {
        for (var i = 0; i < topics.length; i++) {
            var qos = topics[i].qos || 0;
            var noLocal = topics[i].no_local || false;
            var retainAsPublished = topics[i].retain_as_published || false;
            var retainHandling = topics[i].retain_handling || 0;
            var flags = 0;
            flags |= retainHandling << 4;
            flags |= (retainAsPublished ? 1 : 0) << 3;
            flags |= (noLocal ? 1 : 0) << 2;
            flags |= qos;
            v.appendUTF8(topics[i].topic);
            v.append1(flags);
        }
    }

    /**
     * Serialize the ack returns for a subscribe.
     * @private
     */
    function serializeSubscribeAcks( v, acks ) {
        for (var i = 0; i < acks.length; i++) {
            var ack = acks[i];
            if (ack >= 0 && ack <= 2) {
                // ok result with QoS
                v.append1(ack);
            } else if (ack >= 0x80 && ack <= 0xff) {
                // error code
                v.append(ack);
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
        for (var i = 0; i < topics.length; i++) {
            v.appendUTF8(topics[i]);
        }
    }

    /**
     * Serialize the ack returns for a unsubscribe.
     * @private
     */
    function serializeUnsubscribeAcks( v, acks ) {
        for (var i = 0; i < acks.length; i++) {
            var ack = acks[i];
            if (ack == 0 || ack == 17) {
                // found or not-found
                v.append1(ack);
            } else if (ack >= 0x80 && ack <= 0xff) {
                // error code
                v.append(ack);
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
        var mbi = encodeMBI(binary.length());
        var pack = new Uint8Array( 1 + mbi.length + binary.length());

        pack[0] = first;
        for (var i = 0; i < mbi.length; i++) {
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
        var self = this;

        this.length = function() {
            return this.len;
        }

        this.copyInto = function( buf, offset ) {
            for (var i = self.len-1; i >= 0; i--) {
                buf[i+offset] = self.buf[i];
            }
        }

        this.val = function() {
            return self.buf.slice( 0, self.len );
        }

        this.append = function( bytes ) {
            self.reserve( bytes.length );
            for (var i = 0; i < bytes.length; i++) {
                self.buf[ self.len++ ] = bytes[i];
            }
        };

        this.append1 = function( byte ) {
            self.reserve(1);
            self.buf[ self.len++ ] = byte;
        };

        this.appendUint32 = function( input ) {
            self.reserve(4);
            if (input < 0) {
                throw "Value uint32 below 0";
            }
            self.buf[ self.len++ ] = (input >> 24) & 255;
            self.buf[ self.len++ ] = (input >> 16) & 255;
            self.buf[ self.len++ ] = (input >> 8) & 255;
            self.buf[ self.len++ ] = input & 255;
        };

        this.appendUint16 = function( input ) {
            self.reserve(2);
            if (input < 0 || input >= 65536) {
                throw "Value too large for uint16";
            }
            self.buf[ self.len++ ] = input >> 8;
            self.buf[ self.len++ ] = input & 255;
        };

        this.appendVarint = function( number ) {
            if (number < 0) {
                throw "Negative varint";
            }
            var numBytes = 0;
            do {
                self.reserve(1);
                var digit = number % 128;
                number = number >> 7;
                if (number > 0) {
                    digit |= 0x80;
                }
                self.buf[ self.len++ ] = digit;
            } while ( (number > 0) && ( ++numBytes < 4) );
        };

        this.appendUTF8 = function ( s ) {
            var len = UTF8Length(s);
            self.appendUint16(len);
            self.reserve(len);
            self.len = stringToUTF8(s, self.buf, self.len);
        };

        this.appendBin = function ( b, addlen ) {
            switch (typeof b) {
                case "undefined":
                    // Append empty data
                    if (addlen) {
                        this.appendUint16(0);
                    }
                    break;
                case "string":
                    var len = UTF8Length(b);
                    if (addlen) {
                        self.appendUint16(len);
                    }
                    self.reserve(len);
                    self.len = stringToUTF8(b, self.buf, self.len);
                    break;
                case "object":
                    if (b instanceof binary) {
                        self.reserve(b.length());
                        b.copyInto(self.buf, self.len);
                        self.len += b.length();
                    } else if (typeof b.BYTES_PER_ELEMENT == "number") {
                        // Assume a TypedArray
                        var v;
                        if (b.BYTES_PER_ELEMENT == 1) {
                            v = b;
                        } else {
                            v = new Uint8Array( b.buffer );
                        }
                        self.reserve(v.length + 2);
                        if (addlen) {
                            self.appendUint16(v.length);
                        }
                        for (var i = 0; i < v.length; i++) {
                            self.buf[self.len++] = v[i];
                        }
                    } else {
                        throw "Can't serialize unknown object";
                    }
                    break;
                default:
                    throw "Can't serialize unsupported type: "+(typeof b);
            }
        }

        this.appendProperties = function ( props ) {
            var b = serializeProperties(props);

            self.appendVarint(b.length());
            self.appendBin(b);
        }

        this.reserve = function( count ) {
            if (self.len < self.size + count ) {
                var newsize = self.size * 2;
                while (newsize < self.size + count) {
                    newsize = newsize * 2;
                }
                var newbuf = new Uint8Array(newsize);

                for (var i = self.len-1; i >= 0; i--) {
                    newbuf[i] = self.buf[i];
                }
                self.size = newsize;
                self.buf = newbuf;
            }
        };
    }


    /**
     * Check if the properties object is empty
     * @private
     */
    function isEmptyProperties( props ) {
        for (var k in props) {
            if (!props.hasOwnProperty(k)) {
                continue;
            }
            return false;
        }
        return true;
    }


    /**
     * Takes a String and calculates its length in bytes when encoded in UTF8.
     * @private
     */
    function UTF8Length( input ) {
        var output = 0;
        for (var i = 0; i<input.length; i++) {
            var charCode = input.charCodeAt(i);
            if (charCode > 0x7FF) {
                // Surrogate pair means its a 4 byte character
                if (0xD800 <= charCode && charCode <= 0xDBFF) {
                    i++;
                    output++;
                }
                output +=3;
            } else if (charCode > 0x7F) {
                output +=2;
            } else {
                output++;
            }
        }
        return output;
    }

    /**
     * Serialize the properties.
     * Return a new 'binary' with the serialized properties.
     * @private
     */
    function serializeProperties( props ) {
        var b = new binary();
        for (var k in props) {
            if (!props.hasOwnProperty(k)) {
                continue;
            }
            var p = (PROPERTY[k] || PROPERTY.__user);
            b.append1(p[0]);
            switch (p[1]) {
                case "bool":
                    b.append1(props[k] ? 1 : 0);
                    break;
                case "uint32":
                    b.appendUint32(props[k]);
                    break;
                case "uint16":
                    b.appendUint16(props[k]);
                    break;
                case "uint8":
                    b.append1(props[k]);
                    break;
                case "utf8":
                    b.appendUTF8(props[k]);
                    break;
                case "bin":
                    b.appendBin(props[k]);
                    break;
                case "varint":
                    b.appendVarint(props[k]);
                    break;
                case "user":
                default:
                    // User property
                    b.appendUTF8(k);
                    b.appendUTF8(props[k]);
                    break;
            }
        }
        return b;
    }

    /**
     * Takes a String and writes it into an array as UTF8 encoded bytes.
     * @private
     */
    function stringToUTF8(input, output, pos) {
        for (var i = 0; i<input.length; i++) {
            var charCode = input.charCodeAt(i);

            // Check for a surrogate pair.
            if (0xD800 <= charCode && charCode <= 0xDBFF) {
                var lowCharCode = input.charCodeAt(++i);
                if (isNaN(lowCharCode)) {
                    // throw new Error(format(ERROR.MALFORMED_UNICODE, [charCode, lowCharCode]));
                    throw "Invalid UTF8 character";
                }
                charCode = ((charCode - 0xD800)<<10) + (lowCharCode - 0xDC00) + 0x10000;
            }

            if (charCode <= 0x7F) {
                output[pos++] = charCode;
            } else if (charCode <= 0x7FF) {
                output[pos++] = charCode>>6  & 0x1F | 0xC0;
                output[pos++] = charCode     & 0x3F | 0x80;
            } else if (charCode <= 0xFFFF) {
                output[pos++] = charCode>>12 & 0x0F | 0xE0;
                output[pos++] = charCode>>6  & 0x3F | 0x80;
                output[pos++] = charCode     & 0x3F | 0x80;
            } else {
                output[pos++] = charCode>>18 & 0x07 | 0xF0;
                output[pos++] = charCode>>12 & 0x3F | 0x80;
                output[pos++] = charCode>>6  & 0x3F | 0x80;
                output[pos++] = charCode     & 0x3F | 0x80;
            }
        }
        return pos;
    }

    /**
     * Encodes an MQTT Multi-Byte Integer
     * @private
     */
    function encodeMBI(number) {
        var output = new Array(1);
        var numBytes = 0;

        do {
            var digit = number % 128;
            number = number >> 7;
            if (number > 0) {
                digit |= 0x80;
            }
            output[numBytes++] = digit;
        } while ( (number > 0) && (numBytes<4) );

        return output;
    }


    // Publish the packet functions.
    cotonic.mqtt_packet = cotonic.mqtt_packet || {};
    cotonic.mqtt_packet.encode = encoder;
    cotonic.mqtt_packet.decode = decoder;

}(cotonic));
