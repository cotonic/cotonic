//
// HTML Idom Tests.
//

"use strict";

var ui = cotonic.ui;

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

    assert.equal(true, true);
});
