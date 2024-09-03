//
// Document model tests
//

import * as broker from "/src/cotonic.broker.js";
import "/src/default_broker_init.js";
import * as doc from "/src/cotonic.model.document.js";


QUnit.test("test.model.document - set cookie test", function(assert) {
    let done = assert.async();

    broker.publish("model/document/post/cookie/test1", { value: "test-1" });
    broker
        .call("model/document/get/cookie/test1")
        .then((msg) => {
                assert.equal(msg.payload, "test-1");
                done();
            });
});

QUnit.test("test.model.document - set cookie invalid value", function(assert) {
    let done = assert.async();

    broker.publish("model/document/post/cookie/test2", { value: "test;2" });
    broker
        .call("model/document/get/cookie/test2")
        .then((msg) => {
                assert.equal(msg.payload, "test2");
                done();
            });
});

QUnit.test("test.model.document - delete cookie", function(assert) {
    let done = assert.async();

    broker.publish("model/document/post/cookie/test3", { value: "test3" });
    broker
        .call("model/document/get/cookie/test3")
        .then((msg) => {
                assert.equal(msg.payload, "test3");

                broker.publish("model/document/post/cookie/test3", { value: "test3", exdays: 0 });
                broker
                    .call("model/document/get/cookie/test3")
                    .then((msg) => {
                            assert.equal(msg.payload, "");
                            done();
                        });
            });
});
