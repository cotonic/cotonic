//
// IncrementalDOM - patchOuter test
//

import "/src-idom/index-bundle.js";

QUnit.test("IncrementalDOM - patchOuter", function(assert) {
    let container = undefined;
    let result;
    let containerOne;
    let containerTwo;
    let div;
    let prev;
    let next;
    let span;
    let el;
    let renderTest;
    let divOne;
    let divTwo;

    function init() {
        if (container) {
            document.body.removeChild(container);
        }
        container = document.createElement('div');
        document.body.appendChild(container);
    };

    //
    // Patching an element
    //

    init();

    function render1() {
        IncrementalDOM.elementVoid('div', null, null, 'tabindex', '0');
    }
    IncrementalDOM.patchOuter(container, render1);
    assert.equal(container.getAttribute('tabindex'), '0', 'should update attributes');

    init();

    function render2() {
        IncrementalDOM.elementVoid('div');
    }
    result = IncrementalDOM.patchOuter(container, render2);
    assert.equal(result, container, 'should return the DOM node');


    init();

    function render3() {
        IncrementalDOM.elementOpen('div');
        IncrementalDOM.elementVoid('span');
        IncrementalDOM.elementClose('div');
    }
    IncrementalDOM.patchOuter(container, render3);
    assert.equal(container.firstChild.tagName, 'SPAN', 'should update children');

    init();

    containerOne = container.appendChild(document.createElement('div'));
    containerTwo = container.appendChild(document.createElement('div'));

    function renderTwo1() {
        IncrementalDOM.elementOpen('div');
        IncrementalDOM.text('foobar');
        IncrementalDOM.elementClose('div');
    }

    function renderOne1() {
        IncrementalDOM.elementOpen('div');
        IncrementalDOM.patchOuter(containerTwo, renderTwo1);
        IncrementalDOM.text('hello');
        IncrementalDOM.elementClose('div');
    }

    IncrementalDOM.patchOuter(containerOne, renderOne1);
    assert.equal(containerOne.textContent, 'hello', 'should be re-entrant (1)');
    assert.equal(containerTwo.textContent, 'foobar', 'should be re-entrant (2)');

    init();

    function render4(content) {
        IncrementalDOM.elementOpen('div');
        IncrementalDOM.text(content);
        IncrementalDOM.elementClose('div');
    }
    IncrementalDOM.patchOuter(container, render4, 'foobar');
    assert.equal(container.textContent, 'foobar', 'should pass third argument to render function');

    //
    // with an empty patch
    //

    init();

    prev = container.appendChild(document.createElement('div'));
    div = container.appendChild(document.createElement('div'));
    next = container.appendChild(document.createElement('div'));
    result = IncrementalDOM.patchOuter(div, () => {});

    assert.equal(div.parentNode, null, 'should remove the DOM node (1)');
    assert.equal(container.children.length, 2, 'should remove the DOM node (2)');
    assert.equal(container.firstChild, prev, 'should leave prior nodes alone');
    assert.equal(container.lastChild, next, 'should leaving following nodes alone');
    assert.equal(result, null, 'should return null on an empty patch');

    //
    // with a matching node
    //

    init();

    prev = container.appendChild(document.createElement('div'));
    div = container.appendChild(document.createElement('div'));
    next = container.appendChild(document.createElement('div'));
    result = IncrementalDOM.patchOuter(div, () => IncrementalDOM.elementVoid('div'));

    assert.equal(container.children.length, 3, 'should leave the patched node alone (1)');
    assert.equal(container.children[1], div, 'should leave the patched node alone (2)');
    assert.equal(container.firstChild, prev, 'should leave prior nodes alone');
    assert.equal(container.lastChild, next, 'should leaving following nodes alone');
    assert.equal(result, div, 'should return the patched node');

    //
    // with a different tag
    //

    // without a key

    init();

    prev = container.appendChild(document.createElement('div'));
    div = container.appendChild(document.createElement('div'));
    next = container.appendChild(document.createElement('div'));
    result = IncrementalDOM.patchOuter(div, () => IncrementalDOM.elementVoid('span'));
    span = container.querySelector('span');

    assert.equal(container.children.length, 3, 'should replace the DOM node (1)');
    assert.equal(container.children[1], span, 'should replace the DOM node (2)');
    assert.equal(container.firstChild, prev, 'should leave prior nodes alone');
    assert.equal(container.lastChild, next, 'should leaving following nodes alone');
    assert.equal(result, span, 'should return the new DOM node');

    // with a different key

    function initDiffKey() {
        prev = container.appendChild(document.createElement('div'));
        div = container.appendChild(document.createElement('div'));
        next = container.appendChild(document.createElement('div'));
    }

    // when a key changes

    init();
    initDiffKey();

    renderTest = function (data) {
        el = IncrementalDOM.elementVoid(data.tag, data.key);
    };

    div.setAttribute('key', 'key0');
    IncrementalDOM.patchOuter(div, renderTest, {tag: 'span', key: 'key1'});

    assert.equal(container.children.length, 3, 'should replace the DOM node (1)');
    assert.equal(container.children[1], el, 'should replace the DOM node (2)');
    assert.equal(container.firstChild, prev, 'should leave prior nodes alone');
    assert.equal(container.lastChild, next, 'should leaving following nodes alone');

    // when a key is removed

    init();
    initDiffKey();

    div.setAttribute('key', 'key0');
    IncrementalDOM.patchOuter(div, renderTest, {tag: 'span'});

    assert.equal(container.children.length, 3, 'should replace the DOM node (1)');
    assert.equal(container.children[1].tagName, 'SPAN', 'should replace the DOM node (2)');
    assert.equal(container.children[1], el, 'should replace the DOM node (3)');
    assert.equal(container.firstChild, prev, 'should leave prior nodes alone');
    assert.equal(container.lastChild, next, 'should leaving following nodes alone');

    // when a key is added

    init();
    initDiffKey();

    IncrementalDOM.patchOuter(div, renderTest, {tag: 'span', key: 'key2'});

    assert.equal(container.children.length, 3, 'should replace the DOM node (1)');
    assert.equal(container.children[1], el, 'should replace the DOM node (2)');
    assert.equal(container.firstChild, prev, 'should leave prior nodes alone');
    assert.equal(container.lastChild, next, 'should leaving following nodes alone');

    //
    // should not hang on to removed elements with keys
    //

    init();

    function render5() {
        IncrementalDOM.elementVoid('div', 'key');
    }

    divOne = container.appendChild(document.createElement('div'));
    IncrementalDOM.patchOuter(divOne, render5);
    el = container.firstChild;
    IncrementalDOM.patchOuter(el, () => {});
    divTwo = container.appendChild(document.createElement('div'));
    IncrementalDOM.patchOuter(divTwo, render5);

    assert.equal(container.children.length, 1, 'should not hang on to removed elements with keys (1)');
    assert.notEqual(container.firstChild, el, 'should not hang on to removed elements with keys (2)');

    //
    // should throw an error when patching too many elements
    //

    init();

    function render6() {
        IncrementalDOM.elementVoid('div');
        IncrementalDOM.elementVoid('div');
    }

    div = container.appendChild(document.createElement('div'));
    assert.throws(
      () => IncrementalDOM.patchOuter(div, render6),
      Error('There must be exactly one top level call corresponding to the patched element.'),
      'should throw an error when patching too many elements');
});
