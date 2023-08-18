//
// HTML Idom Tests.
//

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


QUnit.test("Idom skip node", function(assert) {
    let element = document.getElementById("skip-test");

    idom.patchInner(element, [
        {type: "open", tag: "p", attributes: []},
        {type: "text", data: "Hello World!\n"},
        {type: "void", tag: "cotonic-idom-skip", attributes: ["id", "skip-this", "tag", "div"]},
        {type: "open", tag: "span"},
        {type: "text", data: "Hela hola, tijd voor ...!\n"},
        {type: "close", tag: "span"},
        {type: "close", tag: "p"}
    ]);

    assert.equal(element.innerHTML,
        '<p>Hello World!\n<div id="skip-this"></div><span>Hela hola, tijd voor ...!\n</span></p>')

    let skipThis = document.getElementById("skip-this");
    skipThis.innerHTML = "<p>Externally managed</p>";
    assert.ok(skipThis.innerHTML === "<p>Externally managed</p>");

    idom.patchInner(element, [
        {type: "open", tag: "p", attributes: []},
        {type: "text", data: "Hallo Wereld!\n"},
        {type: "void", tag: "cotonic-idom-skip", attributes: ["id", "skip-this", "tag", "div"]},
        {type: "open", tag: "span"},
        {type: "text", data: "Hela hola, tijd voor chips en cola!\n"},
        {type: "close", tag: "span"},
        {type: "close", tag: "p"}
    ]);

    // After another patch, the inner text of the element should not
    // have been changed.
    skipThis = document.getElementById("skip-this");
    assert.ok(skipThis.innerHTML === "<p>Externally managed</p>");

    assert.equal(element.innerHTML,
        '<p>Hallo Wereld!\n<div id="skip-this"><p>Externally managed</p></div><span>Hela hola, tijd voor chips en cola!\n</span></p>')

    
});

QUnit.test("Idom iframe node", function(assert) {
    let element = document.getElementById("iframe-test");

    idom.patchInner(element, [
        {type: "open", tag: "div", attributes: []},

        {type: "open", tag: "span", attributes: ["id", "before-iframe"]},
            {type: "text", data: "Before frame!"},
        {type: "close", tag: "span"},

        {type: "open", tag: "cotonic-idom-iframe", attributes: ["id", "the-iframe"]},
            {type: "open", tag: "html"},
            {type: "open", tag: "body", attributes: ["id", "body-in-iframe"]},
                {type: "text", data: "Hela hola, tijd voor chips en cola!"},
            {type: "close", tag: "body"},
            {type: "close", tag: "html"},
        {type: "close", tag: "cotonic-idom-iframe"},

        {type: "open", tag: "span", attributes: ["id", "after-iframe"]},
            {type: "text", data: "After frame!"},
        {type: "close", tag: "span"},

        {type: "close", tag: "div"}
    ]);

    assert.ok(document.getElementById("before-iframe"));
    assert.ok(document.getElementById("after-iframe"));

    const iframe = document.getElementById("the-iframe");
    assert.ok(iframe);

    const doc = iframe.contentDocument;
    assert.equal("Hela hola, tijd voor chips en cola!", doc.body.innerHTML);

});

QUnit.test("Idom nested iframe nodes", function(assert) {
    let element = document.getElementById("nested-iframe-test");

    idom.patchInner(element, [
        {type: "open", tag: "div", attributes: []},

        {type: "open", tag: "span", attributes: ["id", "before-nested-iframe"]},
            {type: "text", data: "Before nested frame!"},
        {type: "close", tag: "span"},

        {type: "open", tag: "cotonic-idom-iframe", attributes: ["id", "top-iframe"]},
            {type: "open", tag: "html"},
            {type: "open", tag: "body"},

            {type: "open", tag: "cotonic-idom-iframe", attributes: ["id", "nested-iframe"]},
                {type: "open", tag: "html"},
                    {type: "open", tag: "body"},
                        {type: "text", data: "Hela hola, tijd voor chips en cola!\n"},
                    {type: "close", tag: "body"},
                {type: "close", tag: "html"},
            {type: "close", tag: "cotonic-idom-iframe"},
            {type: "close", tag: "body"},
            {type: "close", tag: "html"},
        {type: "close", tag: "cotonic-idom-iframe"},

        {type: "open", tag: "span", attributes: ["id", "after-nested-iframe"]},
            {type: "text", data: "After nested frame!"},
        {type: "close", tag: "span"},

        {type: "close", tag: "div"}
    ]);

    assert.ok(document.getElementById("before-nested-iframe"));
    assert.ok(document.getElementById("after-nested-iframe"));

    const topIframe = document.getElementById("top-iframe");
    assert.ok(topIframe);

    const topDoc = topIframe.contentDocument;

    assert.ok(topDoc.getElementById("nested-iframe"));
});

