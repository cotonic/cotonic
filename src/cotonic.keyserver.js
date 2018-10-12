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
    const PUBLISH = 80; 
    const SUBSCRIBE = 83; 
    const DIRECT = 68; 
    const TICKETS = 84;
    const SESSION_KEY = 75;

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
        const hello = new Uint8Array([104, 101, 108, 108, 111]);
        const eKey = new Uint8Array(encodedKey);
        let msg = new Uint8Array(5 + KEY_BYTES + NONCE_BYTES);

        msg.set(hello);
        msg.set(encodedKey, hello.length);
        msg.set(encodedNonce, hello.length + KEY_BYTES);

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
        msg.set(request.key_id, 1);
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
                console.log(new Uint8Array(plain));
                return decodeResponse(plain);
            })
    }

    function decodeResponse(data) {
        const d = new Uint8Array(data); 
        
        if(d[0] != V1)
            throw new Error("Unexpected message");

        const nonce = d.slice(1, NONCE_BYTES+1);
        const PAYLOAD = NONCE_BYTES+1;
        let result = {nonce: nonce};

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
                              key_id: payload.slice(PAYLOAD+1, PAYLOAD+KEY_ID_BYTES+1),
                              topic: textDecoder.decode(payload.slice(PAYLOAD+KEY_ID_BYTES+1))};
            break;
        case TICKETS:
            result.payload = {type: TICKETS};
             

            break;
        case SESSION_KEY:
            const key_id = payload.slice(PAYLOAD+1, PAYLOAD+KEY_ID_BYTES+1);
            const key_data = payload.slice(PAYLOAD+KEY_ID_BYTES+1,
                                           PAYLOAD+KEY_ID_BYTES+KEY_BYTES+1);
            const timestamp = toBigUnsignedInt64(
                payload.slice(PAYLOAD+KEY_ID_BYTES+KEY_BYTES+1,
                              PAYLOAD+KEY_ID_BYTES+KEY_BYTES+1+8));
            const lifetime = toBigUnsignedInt16(
                payload.slice(PAYLOAD+KEY_ID_BYTES+KEY_BYTES+1+8,
                              PAYLOAD+KEY_ID_BYTES+KEY_BYTES+1+8+2));  

            result.payload = {type: SESSION_KEY};
            break;
        default:
            throw new Error("Unknown payload type");
        }

        return result;
    }

    function toBigUnsignedInt16(buf) {
        return buf[0] << 8 + buf[1];
    }

    function toBigUnsignedInt64(buf) {
        return buf[0] << 56 + buf[1] << 48 + buf[2] << 40 + buf[3] << 32
            + buf[4] << 24 + buf[5] << 16 + buf[6] << 8 + buf[7];
    }

    cotonic.keyserver = cotonic.keyserver || {};

    cotonic.keyserver.PUBLISH = PUBLISH;
    cotonic.keyserver.DIRECT = DIRECT;
    cotonic.keyserver.SUBSCRIBE = SUBSCRIBE;
    
    cotonic.keyserver.publicEncKey = publicEncKey;

    cotonic.keyserver.randomNonce = randomNonce;
    cotonic.keyserver.randomIV = randomIV;

    cotonic.keyserver.generateKey = generateKey;

    cotonic.keyserver.encryptConnectMessage = encryptConnectMessage;
    cotonic.keyserver.encryptRequest = encryptRequest;

    cotonic.keyserver.decryptResponse = decryptResponse;

}(cotonic));
