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
    const KEY_BYTES = 32;   // 256 bits
    const IV_BYTES = 16;    // 128 bits
    const KEY_ID_BYTES = 4; // 32 bits
    const NONCE_BYTES = 8;  // 64 bits

    const AES_GCM_TAG_SIZE = 16; // 128 bits

    const V1 = 49;
    const PUBLISH = 80; 
    const SUBSCRIBE = 83; 
    const DIRECT = 68; 

    let textEncoder = new TextEncoder("utf-8");

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
        let msg = new Uint8Array(1 + KEY_ID_BYES + topic.length);

        msg[0] = SUBSCRIBE;
        msg.set(request.key_id, 1);
        msg.set(topic, 1 + KEY_ID_BYTES);

        return msg;
    }

    function encodeDirect(request) {
        let msg = new Uint8Array(1 + request.other_id.length)

        msg[0] = DIRECT;
        msg.set(request.other_id, 1);

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

        console.log("msg", msg);
        console.log("encId", encId);
        console.log("key", key);
        console.log("iv", iv);

        return crypto.subtle.encrypt({name: "AES-GCM",
                                      iv: iv, 
                                      additionalData: encId,
                                      tagLength: AES_GCM_TAG_SIZE * 8},
                                     key,
                                     msg);
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

}(cotonic));
