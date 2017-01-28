//
// HTML Idom Tests.
//

"use strict";

var idom = cotonic.idom;

QUnit.test("Idom patch", function(assert) {
    var element = document.getElementById("test");
    idom.patchInner(element, "<p>Hello World!</p>");

    var p = element .getElementsByTagName("p");
    assert.equal(p[0].innerHTML, "Hello World!");

    /* The p element we retrieved earlier should still be usable */
    idom.patchInner(element, "<p>How are you doing</p>");
    assert.equal(p[0].innerHTML, "How are you doing");

    /* Adding an element */
    idom.patchInner(element, "<p>Still fine?</p><p>Yes</p>");
    assert.equal(p[0].innerHTML, "Still fine?");

    var p2 = element .getElementsByTagName("p");
    assert.equal(p2[1].innerHTML, "Yes");
});