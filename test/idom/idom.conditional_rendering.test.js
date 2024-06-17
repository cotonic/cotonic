//
// IncrementalDOM - conditional rendering test
//

import "/src-idom/index-bundle.js";

QUnit.test("IncrementalDOM - conditional rendering", function(assert) {
    let container = undefined;
    let firstChild = undefined;
    let lastChild;
    let secondDiv;
    let render1;
    let render2;
    let render3;
    let render4;
    let outer;

    function init() {
        if (container) {
            document.body.removeChild(container);
        }
        container = document.createElement('div');
        document.body.appendChild(container);
    };

    //
    // nodes
    //

    init();

    render1 = (condition) => {
        IncrementalDOM.elementOpen('div', 'outer', ['id', 'outer']);
        IncrementalDOM.elementVoid('div', 'one', ['id', 'one']);
        if (condition) {
            IncrementalDOM.elementVoid('div', 'conditional-one', ['id', 'conditional-one']);
            IncrementalDOM.elementVoid('div', 'conditional-two', ['id', 'conditional-two']);
        }
        IncrementalDOM.elementVoid('span', 'two', ['id', 'two']);
        IncrementalDOM.elementClose('div');
    };

    IncrementalDOM.patch(container, () => render1(true));
    IncrementalDOM.patch(container, () => render1(false));
    outer = container.childNodes[0];

    assert.equal(outer.childNodes.length, 2, 'should un-render when the condition becomes false (1)');
    assert.equal(outer.childNodes[0].id, 'one', 'should un-render when the condition becomes false (2)');
    assert.equal(outer.childNodes[0].tagName, 'DIV', 'should un-render when the condition becomes false (3)');
    assert.equal(outer.childNodes[1].id, 'two', 'should un-render when the condition becomes false (4)');
    assert.equal(outer.childNodes[1].tagName, 'SPAN', 'should un-render when the condition becomes false (5)');

    init();

    render2 = (condition) => {
        if (condition) {
            IncrementalDOM.elementVoid('div');
        }
        IncrementalDOM.elementVoid('span');
        IncrementalDOM.elementVoid('div');
    };

    IncrementalDOM.patch(container, () => render2(false));
    secondDiv = container.lastChild;
    IncrementalDOM.patch(container, () => render2(true));
    firstChild = container.firstChild;
    lastChild = container.lastChild;

    assert.equal(container.childNodes.length, 3, 'should not move non-keyed nodes (1)');
    assert.notEqual(firstChild, secondDiv, 'should not move non-keyed nodes (2)');
    assert.equal(lastChild, secondDiv, 'should not move non-keyed nodes (3)');

    init();

    IncrementalDOM.patch(container, () => render1(false));
    IncrementalDOM.patch(container, () => render1(true));
    outer = container.childNodes[0];

    assert.equal(outer.childNodes.length, 4, 'should render when the condition becomes true (1)');
    assert.equal(outer.childNodes[0].id, 'one', 'should render when the condition becomes true (2)');
    assert.equal(outer.childNodes[0].tagName, 'DIV', 'should render when the condition becomes true (3)');
    assert.equal(outer.childNodes[1].id, 'conditional-one', 'should render when the condition becomes true (4)');
    assert.equal(outer.childNodes[1].tagName, 'DIV', 'should render when the condition becomes true (1)');
    assert.equal(outer.childNodes[2].id, 'conditional-two', 'should render when the condition becomes true (5)');
    assert.equal(outer.childNodes[2].tagName, 'DIV', 'should render when the condition becomes true (6)');
    assert.equal(outer.childNodes[3].id, 'two', 'should render when the condition becomes true (7)');
    assert.equal(outer.childNodes[3].tagName, 'SPAN', 'should render when the condition becomes true (8)');

    //
    // with only conditional childNodes
    //

    init();

    render3 = (condition) => {
        IncrementalDOM.elementOpen('div', 'outer', ['id', 'outer']);
        if (condition) {
            IncrementalDOM.elementVoid('div', 'conditional-one', ['id', 'conditional-one']);
            IncrementalDOM.elementVoid('div', 'conditional-two', ['id', 'conditional-two']);
        }
        IncrementalDOM.elementClose('div');
    };

    IncrementalDOM.patch(container, () => render3(true));
    IncrementalDOM.patch(container, () => render3(false));
    outer = container.childNodes[0];
    assert.equal(outer.childNodes.length, 0, 'should not leave any remaning nodes');

    //
    // nodes
    //

    init();

    render4 = (condition) => {
        IncrementalDOM.elementOpen('div', null, null, 'id', 'outer');
        IncrementalDOM.elementVoid('div', null, null, 'id', 'one');
        if (condition) {
            IncrementalDOM.elementOpen('span', null, null, 'id', 'conditional-one', 'data-foo', 'foo');
            IncrementalDOM.elementVoid('span');
            IncrementalDOM.elementClose('span');
        }
        IncrementalDOM.elementVoid('span', null, null, 'id', 'two');
        IncrementalDOM.elementClose('div');
    };

    IncrementalDOM.patch(container, () => render4(true));
    IncrementalDOM.patch(container, () => render4(false));
    outer = container.childNodes[0];

    assert.equal(outer.childNodes.length, 2, 'should strip children when a conflicting node is re-used (1)');
    assert.equal(outer.childNodes[0].id, 'one', 'should strip children when a conflicting node is re-used (2)');
    assert.equal(outer.childNodes[0].tagName, 'DIV', 'should strip children when a conflicting node is re-used (3)');
    assert.equal(outer.childNodes[1].id, 'two', 'should strip children when a conflicting node is re-used (4)');
    assert.equal(outer.childNodes[1].tagName, 'SPAN', 'should strip children when a conflicting node is re-used (5)');
    assert.equal(outer.childNodes[1].children.length, 0, 'should strip children when a conflicting node is re-used (6)');

    init();

    IncrementalDOM.patch(container, () => render4(true));
    IncrementalDOM.patch(container, () => render4(false));
    outer = container.childNodes[0];

    assert.equal(outer.childNodes[1].getAttribute('data-foo'), null, 'should strip attributes when a conflicting node is re-used');
});
