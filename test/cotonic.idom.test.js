//
// HTML Idom Tests.
//

"use strict";

var idom = cotonic.idom;

QUnit.test("Idom patch html", function(assert) {
    var element = document.getElementById("test-1");
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

QUnit.test("Idom patch tokens", function(assert) {
    var element = document.getElementById("test-2");
    idom.patchInner(element, [
        {type: "open", tag: "p", attributes:[]},
        {type: "text", data: "Hello World!"},
        {type: "close", tag: "p"}
    ]);

    var p = element .getElementsByTagName("p");
    assert.equal(p[0].innerHTML, "Hello World!");

    /* The p element we retrieved earlier should still be usable */
    idom.patchInner(element, [
        {type: "open", tag: "p", attributes:[]},
        {type: "text", data: "How are you doing"},
        {type: "close", tag: "p"}
    ]);
    assert.equal(p[0].innerHTML, "How are you doing");

    /* Adding an element */
    idom.patchInner(element, [
        {type: "open", tag: "p", attributes:[]},
        {type: "text", data: "Still fine?"},
        {type: "close", tag: "p"},

        {type: "open", tag: "p", attributes:[]},
        {type: "text", data: "Yes"},
        {type: "close", tag: "p"}
    ]);
    assert.equal(p[0].innerHTML, "Still fine?");

    var p2 = element .getElementsByTagName("p");
    assert.equal(p2[1].innerHTML, "Yes");
});