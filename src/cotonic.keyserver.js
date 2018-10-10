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

    function randomNonce() {
        let nonce = new Uint8Array(8);
        crypto.getRandomValues(nonce);

        return nonce;
    }

    function generateKey() {
        return crypto.subtle.generateKey(
            {name: "AES-GCM", length: 256}, true, ["encrypt", "decrypt"]);
    }

    function publicEncKey() {
        return crypto.subtle.importKey(
            "jwk",
            keyserver_public_encrypt_key,
            {name: "RSA-OAEP", hash: {name: "SHA-256"} },
            false, ["encrypt"]
        ); 
    }
    
    function encryptConnectMessage(id, key, nonce, pubServerEncKey) {
        crypto.subtle.exportKey("raw", key).then(function(keydata) {
            const data = keydata; // TODO: construct the hello message. 
            let promise = crypto.subtle.encrypt({name: "RSA-OAEP"}, pubServerEncKey, data)
            promise.then(function(encrypted) {
                console.log("message", new Uint8Array(encrypted));
                
            })
        }).catch(function(err) {
            console.error("error", err);
        });

        return false;
    }

    cotonic.keyserver = cotonic.keyserver || {};

    cotonic.keyserver.randomNonce = randomNonce;
    cotonic.keyserver.generateKey = generateKey;
    cotonic.keyserver.publicEncKey = publicEncKey;
    cotonic.keyserver.encryptConnectMessage = encryptConnectMessage;
    
}(cotonic));
