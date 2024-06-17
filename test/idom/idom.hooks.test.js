//
// IncrementalDOM - Hooks test
//

import "/src-idom/index-bundle.js";

QUnit.test("IncrementalDOM - Hooks", function(assert) {
    let container = undefined;
    let oldSymbolsDefault;
    let attrStubCalls = [];
    let defaultCalls = [];
    let nodesCreatedCalls = [];
    let nodesDeletedCalls = [];
    let el;

    function init() {
        if (container) {
            document.body.removeChild(container);
        }
        container = document.createElement('div');
        document.body.appendChild(container);

        for (const mutator in IncrementalDOM.attributes) {
            if (mutator !== IncrementalDOM.symbols.default && mutator !== 'style') {
                delete IncrementalDOM.attributes[mutator];
            }
        }
        IncrementalDOM.notifications.nodesCreated = null;
        IncrementalDOM.notifications.nodesDeleted = null;
        attrStubCalls = [];
        defaultCalls = [];
        nodesCreatedCalls = [];
        nodesDeletedCalls = [];
    };

    function symbolsDefault(el, attr, value) {
        defaultCalls.push([el, attr, value]);
        // oldSymbolsDefault(el, attr, value);
    }

    oldSymbolsDefault = IncrementalDOM.attributes[IncrementalDOM.symbols.default];
    IncrementalDOM.attributes[IncrementalDOM.symbols.default] = symbolsDefault;

    function attrStub(el, attr, value) {
        attrStubCalls.push([el, attr, value]);
    }

    function render(dynamicValue) {
        IncrementalDOM.elementVoid(
            'div', 'key', ['staticName', 'staticValue'], 'dynamicName', dynamicValue
        );
    }

    //
    // for deciding how attributes are set
    //

    init();

    IncrementalDOM.attributes["staticName"] = attrStub;
    IncrementalDOM.patch(container, render, 'dynamicValue');
    el = container.childNodes[0];
    assert.deepEqual(
        attrStubCalls,
        [ [el, 'staticName', 'staticValue'] ],
        'should call specific setter');


    init();

    IncrementalDOM.patch(container, render, 'dynamicValue');
    el = container.childNodes[0];
    assert.deepEqual(
        defaultCalls,
        [
            [el, 'staticName', 'staticValue'],
            [el, 'dynamicName', 'dynamicValue']
        ],
        'should call generic setter');

    init();

    IncrementalDOM.attributes["staticName"] = attrStub;
    IncrementalDOM.patch(container, render, 'dynamicValue');
    el = container.childNodes[0];

    assert.equal(attrStubCalls.length, 1, "should prioritize specific setter over generic (1)");
    assert.deepEqual(
        defaultCalls,
        [ [el, 'dynamicName', 'dynamicValue'] ],
        'should prioritize specific setter over generic (2)');


    //
    // specific dynamic attributes
    //

    init();

    IncrementalDOM.attributes["dynamicName"] = attrStub;
    IncrementalDOM.patch(container, render, 'dynamicValue');
    el = container.childNodes[0];
    assert.deepEqual(
        attrStubCalls,
        [ [el, 'dynamicName', 'dynamicValue'] ],
        'should be called for dynamic attribute');


    init();

    IncrementalDOM.attributes["dynamicName"] = attrStub;
    IncrementalDOM.patch(container, render, 'dynamicValueOne');
    IncrementalDOM.patch(container, render, 'dynamicValueTwo');
    el = container.childNodes[0];
    assert.deepEqual(
        attrStubCalls,
        [
          [el, 'dynamicName', 'dynamicValueOne'],
          [el, 'dynamicName', 'dynamicValueTwo']
        ],
        'should be called on attribute update');

    init();

    IncrementalDOM.attributes["dynamicName"] = attrStub;
    IncrementalDOM.patch(container, render, 'dynamicValue');
    IncrementalDOM.patch(container, render, 'dynamicValue');
    el = container.childNodes[0];
    assert.deepEqual(
        attrStubCalls,
        [
          [el, 'dynamicName', 'dynamicValue']
        ],
        'should only be called when attributes change');

    init();

    IncrementalDOM.attributes["dynamicName"] = attrStub;
    IncrementalDOM.patch(container, render, 'dynamicValue');
    el = container.childNodes[0];

    assert.equal(attrStubCalls.length, 1, 'should prioritize specific setter over generic (1)')
    assert.equal(defaultCalls.length, 1, 'should prioritize specific setter over generic (2)')
    assert.deepEqual(
        defaultCalls,
        [
          [el, 'staticName', 'staticValue']
        ],
        'should prioritize specific setter over generic (3)');

    init();

    IncrementalDOM.patch(container, render, 'dynamicValue');
    el = container.childNodes[0];
    assert.deepEqual(
        defaultCalls,
        [
            [el, 'staticName', 'staticValue'],
            [el, 'dynamicName', 'dynamicValue']
        ],
        'should be called for dynamic attribute');


    init();

    IncrementalDOM.patch(container, render, 'dynamicValueOne');
    IncrementalDOM.patch(container, render, 'dynamicValueTwo');
    el = container.childNodes[0];
    assert.deepEqual(
        defaultCalls,
        [
          [el, 'staticName', 'staticValue'],
          [el, 'dynamicName', 'dynamicValueOne'],
          [el, 'dynamicName', 'dynamicValueTwo']
        ],
        'should be called on attribute update');


    init();

    IncrementalDOM.patch(container, render, 'dynamicValue');
    IncrementalDOM.patch(container, render, 'dynamicValue');
    el = container.childNodes[0];
    assert.equal(defaultCalls.length, 2, 'should only be called when attributes chang (1)')
    assert.deepEqual(
        defaultCalls,
        [
          [el, 'staticName', 'staticValue'],
          [el, 'dynamicName', 'dynamicValue']
        ],
        'should only be called when attributes chang (2)');


    //
    // Node creation
    //

    function nodesCreated(nodes) {
        assert.notEqual(nodes[0].parentNode, null, "Should have parent node");
        nodesCreatedCalls.push(nodes);
    }

    init();
    IncrementalDOM.notifications.nodesCreated = nodesCreated;

    IncrementalDOM.patch(container, function render() {
        IncrementalDOM.elementVoid('div', 'key', ['staticName', 'staticValue']);
    });
    el = container.childNodes[0];
    assert.deepEqual(nodesCreatedCalls, [ [el] ], 'should be called for elements');


    init();
    IncrementalDOM.notifications.nodesCreated = nodesCreated;

    IncrementalDOM.patch(container, function render() {
        IncrementalDOM.text('hello');
    });
    el = container.childNodes[0];
    assert.deepEqual(nodesCreatedCalls, [ [el] ], 'should be called for text');


    //
    // Node deletion
    //

    function nodesDeleted(nodes) {
        assert.equal(nodes[0].parentNode, null, "Should not have parent node");
        nodesDeletedCalls.push(nodes);
    }

    function render1(withTxt) {
        if (withTxt) {
            IncrementalDOM.text('hello');
        } else {
            IncrementalDOM.elementVoid('div', 'key2', ['staticName', 'staticValue']);
        }
    }

    function empty() {}

    init();
    IncrementalDOM.notifications.nodesDeleted = nodesDeleted;

    IncrementalDOM.patch(container, render1, false);
    el = container.childNodes[0];
    IncrementalDOM.patch(container, empty);
    assert.deepEqual(nodesDeletedCalls, [ [el] ], 'should be called for detached element');

    init();
    IncrementalDOM.notifications.nodesDeleted = nodesDeleted;

    IncrementalDOM.patch(container, render1, true);
    el = container.childNodes[0];
    IncrementalDOM.patch(container, empty);
    assert.deepEqual(nodesDeletedCalls, [ [el] ], 'should be called for detached text');

    init();
    IncrementalDOM.notifications.nodesDeleted = nodesDeleted;

    IncrementalDOM.patch(container, render1, false);
    el = container.childNodes[0];
    IncrementalDOM.patch(container, render1, true);
    assert.deepEqual(nodesDeletedCalls, [ [el] ], 'should be called for replaced element');

    init();
    IncrementalDOM.notifications.nodesDeleted = nodesDeleted;

    IncrementalDOM.patch(container, render1, true);
    el = container.childNodes[0];
    IncrementalDOM.patch(container, render1, false);
    assert.deepEqual(nodesDeletedCalls, [ [el] ], 'should be called for removed text');

    //
    // not being notified when Elements are reordered
    //

    function render2(first) {
        if (first) {
           IncrementalDOM.elementVoid('div', 'keyA', ['staticName', 'staticValue']);
        }
        IncrementalDOM.elementVoid('div', 'keyB');
        if (!first) {
            IncrementalDOM.elementVoid('div', 'keyA', ['staticName', 'staticValue']);
        }
    }

    init();
    IncrementalDOM.notifications.nodesDeleted = nodesDeleted;

    IncrementalDOM.patch(container, render2, true);
    IncrementalDOM.patch(container, render2, false);
    assert.deepEqual(nodesDeletedCalls, [], 'should not call the nodesDeleted callback');
});
