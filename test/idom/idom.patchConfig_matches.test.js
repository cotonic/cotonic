//
// IncrementalDOM - patchConfig matches test
//

import "/src-idom/index-bundle.js";

QUnit.test("IncrementalDOM - patchConfig matches", function(assert) {
    let container = undefined;
    let patch;
    let postPatchOneChild;

    function init() {
        if (container) {
            document.body.removeChild(container);
        }
        container = document.createElement('div');
        document.body.appendChild(container);
    };

    //
    // createPatchInner
    //

    init();

    patch = IncrementalDOM.createPatchInner();
    patch(container, () => IncrementalDOM.elementVoid('div', 'foo'));
    postPatchOneChild = container.firstChild;
    patch(container, () => IncrementalDOM.elementVoid('div', 'foo'));
    assert.equal(container.childNodes.length, 1, 'should match with the same key and node name (1)');
    assert.equal(container.firstChild, postPatchOneChild, 'should match with the same key and node name (2)');

    init();

    patch = IncrementalDOM.createPatchInner();
    patch(container, () => IncrementalDOM.text('foo'));
    postPatchOneChild = container.firstChild;
    patch(container, () => IncrementalDOM.text('foo'));
    assert.equal(container.childNodes.length, 1, 'should match for text nodes (1)');
    assert.equal(container.firstChild, postPatchOneChild, 'should match for text nodes (2)');

    init();

    patch = IncrementalDOM.createPatchInner();
    patch(container, () => IncrementalDOM.elementVoid('div', 'foo'));
    postPatchOneChild = container.firstChild;
    patch(container, () => IncrementalDOM.elementVoid('span', 'foo'));
    assert.equal(container.childNodes.length, 1, 'should not match with different tags (1)');
    assert.notEqual(container.firstChild, postPatchOneChild, 'should not match with different tags (2)');

    init();

    patch = IncrementalDOM.createPatchInner();
    patch(container, () => IncrementalDOM.elementVoid('div', 'foo'));
    postPatchOneChild = container.firstChild;
    patch(container, () => IncrementalDOM.elementVoid('div', 'bar'));
    assert.equal(container.childNodes.length, 1, 'should not match with different keys (1)');
    assert.notEqual(container.firstChild, postPatchOneChild, 'should not match with different keys (2)');

    init();

    patch = IncrementalDOM.createPatchInner({});
    patch(container, () => IncrementalDOM.elementVoid('div', 'foo'));
    postPatchOneChild = container.firstChild;
    patch(container, () => IncrementalDOM.elementVoid('div', 'foo'));
    assert.equal(container.childNodes.length, 1, 'should default when a config is specified (1)');
    assert.equal(container.firstChild, postPatchOneChild, 'should default when a config is specified (2)');

    //
    // createPatchOuter
    //

    init();

    patch = IncrementalDOM.createPatchOuter();
    patch(container, () => {
        IncrementalDOM.elementOpen('div');
            IncrementalDOM.elementVoid('div', 'foo');
        IncrementalDOM.elementClose('div');
    });
    postPatchOneChild = container.firstChild;
    patch(container, () => {
        IncrementalDOM.elementOpen('div');
            IncrementalDOM.elementVoid('div', 'foo');
        IncrementalDOM.elementClose('div');
    });
    assert.equal(container.childNodes.length, 1, 'should match with the same key and node name (1)');
    assert.equal(container.firstChild, postPatchOneChild, 'should match with the same key and node name (2)');

    //
    // custom maches
    //

    // For the sake of example, uses a matches function
    let patchTripleEquals = IncrementalDOM.createPatchInner({
        matches: (node, nameOrCtor, expectedNameOrCtor, key, expectedKey) => {
            return nameOrCtor == expectedNameOrCtor && key === expectedKey;
        },
    });

    init();

    patchTripleEquals(container, () => IncrementalDOM.elementVoid('div', null));
    postPatchOneChild = container.firstChild;
    patchTripleEquals(container, () => IncrementalDOM.elementVoid('div', null));
    assert.equal(container.childNodes.length, 1, 'should reuse nodes when matching (1)');
    assert.equal(container.firstChild, postPatchOneChild, 'should reuse nodes when matching (2)');

    init();

    patchTripleEquals(container, () => IncrementalDOM.elementVoid('div', null));
    postPatchOneChild = container.firstChild;
    patchTripleEquals(container, () => IncrementalDOM.elementVoid('div', undefined));
    assert.equal(container.childNodes.length, 1, 'should reuse nodes when matching (1)');
    assert.notEqual(container.firstChild, postPatchOneChild, 'should reuse nodes when matching (2)');

    init();

    patchTripleEquals(container, () => IncrementalDOM.elementVoid('div', null));
    postPatchOneChild = container.firstChild;
    IncrementalDOM.patchInner(container, () => IncrementalDOM.elementVoid('div', undefined));
    assert.equal(container.childNodes.length, 1, 'should not effect the default patcher (1)');
    assert.equal(container.firstChild, postPatchOneChild, 'should not effect the default patcher (2)');

    init();

    let patchNeverEquals = IncrementalDOM.createPatchInner({
        matches: () => false,
    });

    patchTripleEquals(container, () => IncrementalDOM.elementVoid('div', null));
    postPatchOneChild = container.firstChild;
    patchNeverEquals(container, () => IncrementalDOM.elementVoid('div', null));
    assert.equal(container.childNodes.length, 1, 'should not effect other patchers (1)');
    assert.notEqual(container.firstChild, postPatchOneChild, 'should not effect other patchers (2)');
});
