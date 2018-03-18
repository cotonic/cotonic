//
// mqtt topic match tests
//


"use strict";

var keystore = cotonic.keystore;


QUnit.test("Store entry", function(assert) {

    keystore.open({
        session: "test",

        mode: "readwrite", 

        onsuccess: function(ops) {
        //    ops.set("name", {entry: 1});
            ops.get("name");
        },

        onget: function(name, entry) {
            // entries are received here
            console.log("onget", name, entry);
        },

        onopenerror: function() {
            // Open errored
            console.log("onopenerror");
        },

        oncomplete: function() {
            // The transaction completed.
            console.log("oncomplete");
        },

        onerror: function() {
            // The transaction errored.
            console.log("onerror");
        }
    })
    
    assert.equal(true, true);
});
