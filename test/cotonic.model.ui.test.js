
import * as broker from "/src/cotonic.broker.js";

QUnit.test("Basic render test", function(assert) {
    broker.publish("model/ui/insert/ui-test-1", {
        inner: true,
        initialData: "<p>Hello World!</p>",
        priority: 10});

    broker.publish("model/ui/render/ui-test-1");

    let t = document.getElementById("ui-test-1");
    assert.equal(t.innerHTML, "<p>Hello World!</p>");
});

QUnit.test("Basic update test", function(assert) {
    let done = assert.async();

    broker.publish("model/ui/insert/ui-test-2", {
        inner: true,
        initialData: "<p>Hello World!</p>",
        priority: 10});

    broker.publish("model/ui/render/ui-test-2");

    setTimeout(
        function() {
            broker.publish("model/ui/update/ui-test-2", "<p>Updated!</p>")
            broker.publish("model/ui/render");
            const t = document.getElementById("ui-test-2");
            assert.equal(t.innerHTML, "<p>Updated!</p>");
            done();
        },
        100);
});
