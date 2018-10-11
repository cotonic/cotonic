"use strict";

QUnit.test("cotonic.keyserver is defined", function(assert) {
    assert.equal(cotonic.hasOwnProperty('keyserver'), true, "Check if keyserver is defined.");
});

QUnit.test("Generate random nonces", function(assert) {
    let nonce1 = cotonic.keyserver.randomNonce();
    let nonce2 = cotonic.keyserver.randomNonce();

    assert.notEqual(nonce1, nonce2, "The generated random nonces are equal, are they random?");
});

QUnit.test("Generate key", function(assert) {
    let done = assert.async();

    cotonic.keyserver.generateKey().then(function(key) {
        assert.ok(true, "A key was generated");
        done();
    }).catch(function(err) {
        assert.ok(false, "Could not generate key.");
        done();
    })
});

QUnit.test("Get the public encryption key of the server.", function(assert) {
    let done = assert.async();
    
    cotonic.keyserver.publicEncKey().then(function(key) {
        assert.ok(true, "Got the key... \o/");
        done();
    }).catch(function(err) {
        assert.ok(false, "Could not encrypt connect message.");
    })
}); 

QUnit.test("Encrypt connect message", function(assert) {
    let done = assert.async();
    let nonce = cotonic.keyserver.randomNonce();

    let enckey;

    cotonic.keyserver.publicEncKey()
        .then(function(keydata) {
            enckey = keydata;
            return cotonic.keyserver.generateKey();
        })
        .then(function(key) {
            return cotonic.keyserver.encryptConnectMessage("test", key, nonce, enckey); 
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

    let nonce = cotonic.keyserver.randomNonce();
    let iv = cotonic.keyserver.randomIV();
    
    cotonic.keyserver.generateKey()
        .then(function(key) {
            return cotonic.keyserver.encryptRequest("test",
                                                    nonce,
                                                    {type: cotonic.keyserver.PUBLISH,
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

    let nonce = cotonic.keyserver.randomNonce();
    let iv = cotonic.keyserver.randomIV();

    let keyId = new Uint8Array(4);
    crypto.getRandomValues(keyId);
    
    cotonic.keyserver.generateKey()
        .then(function(key) {
            return cotonic.keyserver.encryptRequest("test",
                                                    nonce,
                                                    {type: cotonic.keyserver.SUBSCRIBE,
                                                     key_id: keyId,
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

    let nonce = cotonic.keyserver.randomNonce();
    let iv = cotonic.keyserver.randomIV();

    let keyId = new Uint8Array(4);
    crypto.getRandomValues(keyId);
    
    cotonic.keyserver.generateKey()
        .then(function(key) {
            return cotonic.keyserver.encryptRequest("test",
                                                    nonce,
                                                    {type: cotonic.keyserver.DIRECT,
                                                     otherId: "another-identifier"},
                                                    key, iv)
        })
        .then(function(cipherText) {
            assert.ok(cipherText, "got ciphertext");
            done();
        })
        .catch(function(err) {
            assert.ok(false, "Could not encrypt subscribe request.", err);
            done();
        })
});

