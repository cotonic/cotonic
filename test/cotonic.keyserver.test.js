"use strict";

import * as keyserver from "/src/cotonic.keyserver.js";

QUnit.test("Generate random nonces", function(assert) {
    let nonce1 = keyserver.randomNonce();
    let nonce2 = keyserver.randomNonce();

    assert.notEqual(nonce1, nonce2, "The generated random nonces are equal, are they random?");
});

QUnit.test("Generate key", function(assert) {
    let done = assert.async();

    keyserver.generateKey().then(function(key) {
        assert.ok(true, "A key was generated");
        done();
    }).catch(function(err) {
        assert.ok(false, "Could not generate key.");
        done();
    })
});

QUnit.test("Get the public encryption key of the server.", function(assert) {
    let done = assert.async();
    
    keyserver.publicEncKey().then(function(key) {
        assert.ok(true, "Got the key... \o/");
        done();
    }).catch(function(err) {
        assert.ok(false, "Could not encrypt connect message.");
    })
}); 

QUnit.test("Encrypt connect message", function(assert) {
    let done = assert.async();
    let nonce = keyserver.randomNonce();

    let enckey;

    keyserver.publicEncKey()
        .then(function(keydata) {
            enckey = keydata;
            return keyserver.generateKey();
        })
        .then(function(key) {
            return keyserver.encryptConnectMessage("test", key, nonce, enckey); 
        })
        .then(function(msg) {
            assert.ok(msg, "Encrypted the connect message")
            done();
        })
        .catch(function(err) {
            assert.ok(false, "Could not encrypt message.");
            done();
        })
})

QUnit.test("Encrypt publish request", function(assert) {
    let done = assert.async();

    let nonce = keyserver.randomNonce();
    let iv = keyserver.randomIV();
    
    keyserver.generateKey()
        .then(function(key) {
            return keyserver.encryptRequest("test",
                nonce,
                {type: keyserver.PUBLISH,
                    topic: "test/test/123"},
                key, iv)
        })
        .then(function(cipherText) {
            assert.ok(cipherText, "got ciphertext");
            done();
        })
        .catch(function(err) {
            assert.ok(false, "Could not encrypt request.");
            done();
        })
});

QUnit.test("Encrypt subscribe request", function(assert) {
    let done = assert.async();

    let nonce = keyserver.randomNonce();
    let iv = keyserver.randomIV();

    let keyId = new Uint8Array(4);
    crypto.getRandomValues(keyId);
    
    keyserver.generateKey()
        .then(function(key) {
            return keyserver.encryptRequest("test",
                nonce,
                {type: keyserver.SUBSCRIBE,
                    keyId: keyId,
                    topic: "test/test/123"},
                key, iv)
        })
        .then(function(cipherText) {
            assert.ok(cipherText, "got ciphertext");
            done();
        })
        .catch(function(err) {
            assert.ok(false, "Could not encrypt subscribe request.");
            done();
        })
});

 
QUnit.test("Encrypt direct request", function(assert) {
    let done = assert.async();

    let nonce = keyserver.randomNonce();
    let iv = keyserver.randomIV();

    let keyId = new Uint8Array(4);
    crypto.getRandomValues(keyId);
    
    keyserver.generateKey()
        .then(function(key) {
            return keyserver.encryptRequest("test",
                nonce,
                {type: keyserver.DIRECT,
                    otherId: "another-identifier"},
                key, iv)
        })
        .then(function(cipherText) {
            assert.ok(cipherText, "Got the ciphertext");
            done();
        })
        .catch(function(err) {
            assert.ok(false, "Could not encrypt subscribe request.", err);
            done();
        })
});

QUnit.test("Decrypt direct request", function(assert) {
    let done = assert.async();

    let nonce = keyserver.randomNonce();
    let iv = keyserver.randomIV();

    let key;

    keyserver.generateKey()
        .then(function(k) {
            key = k;
            assert.ok(true, "Got the key");
            return keyserver.encryptRequest("test",
                nonce,
                {type: keyserver.DIRECT,
                    otherId: "another-identifier"},
                key, iv)
        })
        .then(function(cipherText) {
            assert.ok(cipherText, "Got ciphertext");
            return keyserver.decryptResponse("test", nonce, cipherText, key, iv);
        }).then(function(stuff) {
            assert.deepEqual(nonce, stuff.nonce, "The nonce is correct");
            assert.equal(keyserver.DIRECT, stuff.payload.type, "The type is correct");
            assert.equal("another-identifier", stuff.payload.otherId, "The identifier is correct");
            done();
        })
        .catch(function(err) {
            assert.ok(false, "Could not decrypt the response.", err);
            done();
        })
});

QUnit.test("Decrypt subscribe request", function(assert) {
    let done = assert.async();

    let nonce = keyserver.randomNonce();
    let iv = keyserver.randomIV();

    let keyId = new Uint8Array(4);
    crypto.getRandomValues(keyId);

    let key;
    
    keyserver.generateKey()
        .then(function(k) {
            key = k;
            assert.ok(true, "Got the key");
            return keyserver.encryptRequest("test",
                nonce,
                {type: keyserver.SUBSCRIBE,
                    keyId: keyId,
                    topic: "this/is/a/test/topic"},
                key, iv)
        })
        .then(function(cipherText) {
            assert.ok(cipherText, "Got ciphertext");
            return keyserver.decryptResponse("test", nonce, cipherText, key, iv);
        }).then(function(stuff) {
            assert.deepEqual(nonce, stuff.nonce, "The nonce is correct");
            assert.equal(keyserver.SUBSCRIBE, stuff.payload.type, "The type is correct.");
            assert.deepEqual(keyId, stuff.payload.keyId, "The key-id is correct.");
            assert.equal("this/is/a/test/topic", stuff.payload.topic, "The topic is correct.");
            done();
        })
        .catch(function(err) {
            assert.ok(false, "Could not decrypt the response.", err);
            done();
        })
});

QUnit.test("Decrypt publish request", function(assert) {
    let done = assert.async();

    let nonce = keyserver.randomNonce();
    let iv = keyserver.randomIV();

    let key;
    
    keyserver.generateKey()
        .then(function(k) {
            key = k;
            assert.ok(true, "Got the key");
            return keyserver.encryptRequest("test",
                nonce,
                {type: keyserver.PUBLISH,
                    topic: "this/is/a/test/topic"},
                key, iv)
        })
        .then(function(cipherText) {
            assert.ok(cipherText, "Got ciphertext");
            return keyserver.decryptResponse("test", nonce, cipherText, key, iv);
        }).then(function(stuff) {
            assert.deepEqual(nonce, stuff.nonce, "The nonce is correct.");
            assert.equal(keyserver.PUBLISH, stuff.payload.type, "The type is correct.");
            assert.equal("this/is/a/test/topic", stuff.payload.topic, "The topic is correct.");
            done();
        })
        .catch(function(err) {
            assert.ok(false, "Could not decrypt the response.", err);
            done();
        })
});

QUnit.test("Encrypt and decrypt a secure publish", function(assert) {
    let done = assert.async();
    let key;
    const keyId = new Uint8Array([10,20,30,40]);

    keyserver.generateKey()
        .then(function(k) {
            let msg = new Uint8Array([1,2,3,4,5,6,7,8,9,0]);
            key = k;
            assert.ok(true, "Got a key");
            return keyserver.encryptSecurePublish(msg, keyId, key);
        }).then(function(cipherText) {
            assert.ok(true, "Got the ciphertext");
            return keyserver.decryptSecurePublish(cipherText, keyId, key); 
        }).then(function(plainText) {
            assert.deepEqual(new Uint8Array(plainText), new Uint8Array([1,2,3,4,5,6,7,8,9,0]), "The plaintext is ok.");
            done();
        }).catch(function(err) {
            assert.ok(false, "Could not encrypt and decrypt.", err);
            done();
        })
})

QUnit.test("Unsigned int conversions", function(assert) {
    assert.equal(keyserver.toBigUnsignedInt(16, new Uint8Array([0, 44])), 44,
                "Converted 16 bit value.");

    assert.equal(keyserver.toBigUnsignedInt(16, new Uint8Array([1, 44])), 300,
                "Converted 16 bit value.");

    assert.equal(keyserver.toBigUnsignedInt(16, new Uint8Array([1, 44])), 300,
                "Converted 16 bit value.");

    assert.equal(keyserver.toBigUnsignedInt(32, new Uint8Array([0, 0, 1, 44])),
                 300,
                "Converted 32 bit value.");

    assert.equal(keyserver.toBigUnsignedInt(32, new Uint8Array([149,165,21,116])),
                 2510624116,
                 "Converted 32 bit value.");

    assert.equal(keyserver.toBigUnsignedInt(64, new Uint8Array([197,226,171,40,59,22,1,133])),
                 14259147559486751109,
                 "Converted a 64 bit value.");
})
