//
// HTML Idom Tests.
//

import "/src-idom/index-bundle.js";

import * as idom from "/src/cotonic.idom.js";

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

QUnit.test("Cotonic preserve already in dom test", function(assert) {
    let element = document.getElementById("cotonic-preserve-already-in-dom-test");

    const prePatchHTML = element.innerHTML;

    /* This patch replaces the preserve...  */
    idom.patchInner(element, [
        {type: "open", tag: "p", attributes: []},
            {type: "open", tag: "span", attributes: []},
                {type: "text", data: "Hello World!"},
            {type: "close", tag: "span"},
        {type: "close", tag: "p"}
    ]);
    assert.equal(element.innerHTML, "<p><span>Hello World!</span></p>");

    // Reset
    element.innerHTML = prePatchHTML;

    /* Now the data in the dom is kept in place */
    idom.patchInner(element, [
        {type: "text", data: "\n"},
        {type: "open", tag: "div", attributes: ["class", "update-some-class", "data-cotonic-preserve", "data-cotonic-preserve"]},
        {type: "open", tag: "span", attributes: []},
        {type: "text", data: "Hello World!"},
        {type: "close", tag: "span"},
        {type: "close", tag: "div"},
        {type: "text", data: "\n"},
    ]);

    const preserved = element.querySelector('[data-cotonic-preserve]');
    assert.ok(preserved);
    assert.equal(preserved.className, "update-some-class");
    assert.equal(preserved.querySelector("p")?.textContent, "This node is already in the dom");
    assert.equal(preserved.querySelectorAll("span").length, 0);

    // Reset
    element.innerHTML = prePatchHTML;

})
