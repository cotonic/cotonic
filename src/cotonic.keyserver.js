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
    // Sizes of keys, iv's and such.
    const KEY_BYTES = 32;        // 256 bits
    const IV_BYTES = 16;         // 128 bits
    const KEY_ID_BYTES = 4;      // 32 bits
    const NONCE_BYTES = 8;       // 64 bits
    const AES_GCM_TAG_SIZE = 16; // 128 bits

    // Codes used in messages
    const V1 = 49;

    const HELLO = 72;
    const PUBLISH = 80; 
    const SUBSCRIBE = 83; 
    const DIRECT = 68; 
    const TICKETS = 84;
    const SESSION_KEY = 75;
    const SECURE_PUBLISH = 69;

    let textEncoder = new TextEncoder("utf-8");
    let textDecoder = new TextDecoder("utf-8");

    function randomNonce() {
        let nonce = new Uint8Array(NONCE_BYTES);
        crypto.getRandomValues(nonce);

        return nonce;
    }

    function randomIV() {
        let iv = new Uint8Array(IV_BYTES);
        crypto.getRandomValues(iv);

        return iv;
    }

    function generateKey() {
        return crypto.subtle.generateKey(
            {name: "AES-GCM", length: KEY_BYTES * 8}, true, ["encrypt", "decrypt"]);
    }

    function publicEncKey() {
        return crypto.subtle.importKey(
            "jwk",
            keyserver_public_encrypt_key,
            {name: "RSA-OAEP", hash: {name: "SHA-256"} },
            false, ["encrypt"]
        ); 
    }

    function exportKey(key) {
        return crypto.subtle.exportKey("raw", key);
    }

    function encodeHelloMessage(id, encodedKey, encodedNonce) {
        const encodedId = textEncoder.encode(id);
        const eKey = new Uint8Array(encodedKey);
        
        let msg = new Uint8Array(2 + KEY_BYTES + NONCE_BYTES + encodedId.length);

        msg[0] = V1;
        msg[1] = HELLO;
        msg.set(encodedKey, 2);
        msg.set(encodedNonce, 2 + KEY_BYTES);
        msg.set(encodedId, 2 + KEY_BYTES + NONCE_BYTES);

        return msg;
    }
    
    function encryptConnectMessage(id, key, nonce, pubServerEncKey) {
        return exportKey(key)
            .then(function(encodedKey) {
                const msg = encodeHelloMessage(id, encodedKey, nonce);
                return crypto.subtle.encrypt({name: "RSA-OAEP"}, pubServerEncKey, msg);
            });
    }

    function encodePublish(request) {
        const topic = textEncoder.encode(request.topic);
        let msg = new Uint8Array(1 + topic.length);
        
        msg[0] = PUBLISH;
        msg.set(topic, 1);

        return msg;
    }

    function encodeSubscribe(request) {
        const topic = textEncoder.encode(request.topic);
        let msg = new Uint8Array(1 + KEY_ID_BYTES + topic.length);

        msg[0] = SUBSCRIBE;
        msg.set(request.keyId, 1);
        msg.set(topic, 1 + KEY_ID_BYTES);

        return msg;
    }

    function encodeDirect(request) {
        const otherId = textEncoder.encode(request.otherId);
        let msg = new Uint8Array(1 + otherId.length)

        msg[0] = DIRECT;
        msg.set(otherId, 1);

        return msg;
    }

    function encodeRequest(request) {
        switch(request.type) {
        case PUBLISH:
            return encodePublish(request);
        case SUBSCRIBE:
            return encodeSubscribe(request);
        case DIRECT:
            return encodeDirect(request);
        default:
            throw new Error("Unkown request")
        }
    }

    function encryptRequest(id, nonce, request, key, iv) {
        const encId = textEncoder.encode(id);
        let req = encodeRequest(request);
        let msg = new Uint8Array(1 + NONCE_BYTES + req.length);

        msg[0] = V1;
        msg.set(nonce, 1);
        msg.set(req, 1 + NONCE_BYTES);

        // In js subtle crypto the tag is appended to the ciphertext.
        return crypto.subtle.encrypt({name: "AES-GCM",
                                      iv: iv, 
                                      additionalData: encId,
                                      tagLength: AES_GCM_TAG_SIZE * 8},
                                     key,
                                     msg);
    }

    function decryptResponse(id, nonce, response, key, iv) {
        const encId = textEncoder.encode(id);
        
        return crypto.subtle.decrypt({name: "AES-GCM",
                               iv: iv, 
                               additionalData: encId,
                               tagLength: AES_GCM_TAG_SIZE * 8},
                              key,
                              response)
            .then(function(plain) {
                return decodeResponse(plain);
            })
    }

    function decodeResponse(data) {
        const d = new Uint8Array(data); 
        
        if(d[0] != V1) throw new Error("Unexpected message");

        const nonce = d.slice(1, NONCE_BYTES+1);
        let result = {nonce: nonce};

        const PAYLOAD = NONCE_BYTES+1;

        switch(d[PAYLOAD]) {
        case PUBLISH:
            result.payload = {type: PUBLISH,
                              topic: textDecoder.decode(d.slice(PAYLOAD+1))};
            break;
        case DIRECT:
            result.payload = {type: DIRECT,
                              otherId: textDecoder.decode(d.slice(PAYLOAD+1))};
            break;
        case SUBSCRIBE:
            result.payload = {type: SUBSCRIBE,
                              keyId: d.slice(PAYLOAD+1, PAYLOAD+KEY_ID_BYTES+1),
                              topic: textDecoder.decode(d.slice(PAYLOAD+KEY_ID_BYTES+1))};
            break;
        case TICKETS:
            const ticketASize = payload[PAYLOAD+1]; 
            const ticketBSize = payload[ticketASize+PAYLOAD+2];

            const ticketA = payload.slice(PAYLOAD+2, ticketASize+PAYLOAD+2); 
            const ticketB = payload.slice(ticketASize+PAYLOAD+3, ticketASize+PAYLOAD+3+ticketBSize); 

            result.payload = {type: TICKETS, ticketA: ticketA, ticketB: ticketB};
            break;
        case SESSION_KEY:
            const key_id = payload.slice(PAYLOAD+1, PAYLOAD+KEY_ID_BYTES+1);
            const key_data = payload.slice(PAYLOAD+KEY_ID_BYTES+1,
                                           PAYLOAD+KEY_ID_BYTES+KEY_BYTES+1);
            const timestamp = toBigUnsignedInt(64,
                payload.slice(PAYLOAD+KEY_ID_BYTES+KEY_BYTES+1,
                              PAYLOAD+KEY_ID_BYTES+KEY_BYTES+1+8));
            const lifetime = toBigUnsignedInt(16,
                payload.slice(PAYLOAD+KEY_ID_BYTES+KEY_BYTES+1+8,
                              PAYLOAD+KEY_ID_BYTES+KEY_BYTES+1+8+2));  

            result.payload = {type: SESSION_KEY, keyId: key_id, timestamp: toDate(timestamp), lifetime: lifetime};
            break;
        default:
            throw new Error("Unknown payload type");
        }

        return result;
    }

    function encryptSecurePublish(message, keyId, key) {
        const iv = randomIV();
        const alg = {name: "AES-GCM",
                     iv: iv, 
                     additionalData: keyId,
                     tagLength: AES_GCM_TAG_SIZE * 8};

        return crypto.subtle.encrypt(alg, key, message)
            .then(function(cipherText) {
                return encodeSecurePublish(iv, new Uint8Array(cipherText));
            })
    }

    function encodeSecurePublish(iv, cipherText) {
        let msg = new Uint8Array(2 + iv.length + cipherText.length);

        msg[0] = V1;
        msg[1] = SECURE_PUBLISH;
        msg.set(iv, 2);
        msg.set(cipherText, 2+iv.length);

        return msg;
    }

    function decodeSecurePublish(data) {
        if(data[0] != V1) throw new Error("Unknown message");
        if(data[1] != SECURE_PUBLISH) throw new Error("Wrong message type");

        let iv = data.slice(2, IV_BYTES+2);
        let message = data.slice(IV_BYTES+2);

        return {type: SECURE_PUBLISH, iv: iv, message: message};
    }

    function decryptSecurePublish(message, keyId, key) {
        const d = decodeSecurePublish(message);
        const alg = {name: "AES-GCM",
                     iv: d.iv, 
                     additionalData: keyId,
                     tagLength: AES_GCM_TAG_SIZE * 8};

        return crypto.subtle.decrypt(alg, key, d.message);
    }

    function toDate(t) {
        let d = new Date();
        d.setTime(t);

        return d;
    }

    function toBigUnsignedInt(bits, buf) {
        if(bits % 8 != 0)
            throw new Error("Bits must be a multiple of 8");

        const nrBytes = bits / 8;
        let lshift = bits - 8;
        let r = 0;

        if(buf.length < nrBytes)
            throw new Error("Buffer too small to convert.");

        for(let i=0; i < nrBytes; i++) {
            r += (buf[i] * Math.pow(2, lshift));
            lshift -= 8;
        }

        return r;
    }

    cotonic.keyserver = cotonic.keyserver || {};

    // Payload types
    cotonic.keyserver.PUBLISH = PUBLISH;
    cotonic.keyserver.DIRECT = DIRECT;
    cotonic.keyserver.SUBSCRIBE = SUBSCRIBE;
    cotonic.keyserver.TICKETS = TICKETS;
    cotonic.keyserver.SESSION_KEY = SESSION_KEY;

    cotonic.keyserver.encryptSecurePublish = encryptSecurePublish;
    cotonic.keyserver.decryptSecurePublish = decryptSecurePublish;

    cotonic.keyserver.publicEncKey = publicEncKey;

    cotonic.keyserver.randomNonce = randomNonce;
    cotonic.keyserver.randomIV = randomIV;

    cotonic.keyserver.generateKey = generateKey;

    cotonic.keyserver.encryptConnectMessage = encryptConnectMessage;
    cotonic.keyserver.encryptRequest = encryptRequest;

    cotonic.keyserver.decryptResponse = decryptResponse;

    cotonic.keyserver.encryptSecurePublish = encryptSecurePublish;
    cotonic.keyserver.decryptSecurePublish = decryptSecurePublish;

    cotonic.keyserver.toBigUnsignedInt = toBigUnsignedInt;

}(cotonic));
