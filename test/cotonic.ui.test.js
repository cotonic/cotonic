//
// HTML Idom Tests.
//

import * as ui from "/src/cotonic.ui.js";

QUnit.test("Basic render test", function(assert) {
    var i = 0, j = 0, k = 0;
    var counting = "Counting:: ";

    ui.insert("ui-test-1",  true, "<p>Hello World!</p>", 10);
    ui.renderId("ui-test-1");

    ui.insert("ui-test-2", "shadow", "<p>Hello World!</p>", 10);
    ui.renderId("ui-test-2");

    ui.insert("ui-test-3", "shadow-closed", "<p>Hello World!</p>", 10);
    ui.renderId("ui-test-3");

    setInterval(function() {
        ui.update("ui-test-1", "<p>" + counting + (i++) + "</p>")
        ui.update("ui-test-2", "<style>p { background: yellow; }</style><p>" + counting + (j++) + "</p>")
        ui.update("ui-test-3", "<style>p { background: orange; }</style><p>" + counting + (k++) + "</p>")

        ui.render();
    }, 1000);

    assert.ok(true);
});

QUnit.test("State data management test", function(assert) {
    const html = document.body.parentElement;

    ui.updateStateData("testing", {yes: "yes", no: "no"});
    assert.equal(html.dataset.uiStateTestingYes, "yes")
    assert.equal(html.dataset.uiStateTestingNo, "no")

    ui.updateStateData("testing", {yes: "yes", no: "no", onetwothree: 123});
    assert.equal(html.dataset.uiStateTestingYes, "yes");
    assert.equal(html.dataset.uiStateTestingNo, "no");
    assert.equal(html.dataset.uiStateTestingOnetwothree, "123");

    ui.updateStateData("testing", {yes: "yes"});
    assert.equal(html.dataset.uiStateTestingYes, "yes");
    assert.equal(html.dataset.uiStateTestingNo, undefined);
    assert.equal(html.dataset.uiStateTestingOnetwothree, undefined);

    ui.updateStateData("testing", {});
    assert.equal(html.dataset.uiStateTestingYes, undefined);
});

QUnit.test("State class test", function(assert) {
    const html = document.body.parentElement;

    ui.updateStateClass("testing", ["xyz", "abc"] );
    assert.ok(html.classList.contains("ui-state-testing-xyz"));
    assert.ok(html.classList.contains("ui-state-testing-abc"));

    ui.updateStateClass("testing", ["xyz"] );
    assert.ok(html.classList.contains("ui-state-testing-xyz"));
    assert.notOk(html.classList.contains("ui-state-testing-abc"));

    ui.updateStateClass("testing", [] );
    assert.notOk(html.classList.contains("ui-state-testing-xyz"));
    assert.notOk(html.classList.contains("ui-state-testing-abc"));

    assert.ok(true);
});
