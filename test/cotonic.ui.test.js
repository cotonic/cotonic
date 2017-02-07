//
// HTML Idom Tests.
//

"use strict";

var ui = cotonic.ui;

QUnit.test("Basic render test", function(assert) {
    var i = 0;
    var counting = "Couting: ";

    ui.insert("ui-test-1",  true, "<p>Hello World!</p>", 10);
    ui.renderId("ui-test-1");

    setInterval(function() {
        ui.update("ui-test-1", "<p>" + counting + (i++) + "</p>")

        ui.render();
    }, 1000);

    assert.equal(true, true);
});