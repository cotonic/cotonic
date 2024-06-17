//
// IncrementalDOM - importing element test
//

import "/src-idom/index-bundle.js";

QUnit.test("IncrementalDOM - Importing Element", function(assert) {
    let container = undefined;
    let el;
    let foreign;

    function init() {
        if (container) {
            document.body.removeChild(container);
        }
        container = document.createElement('div');
        document.body.appendChild(container);
    };

    //
    // in HTML
    //

    init();

    container.innerHTML = '<div></div>';
    IncrementalDOM.importNode(container);
    el = container.firstChild;
    IncrementalDOM.patch(container, () => IncrementalDOM.elementVoid('div'));
    assert.equal(container.firstChild, el, 'handles normal nodeName capitalization');

    init();

    container.innerHTML = '<dIv></dIv>';
    IncrementalDOM.importNode(container);

    el = container.firstChild;
    IncrementalDOM.patch(container, () => IncrementalDOM.elementVoid('div'));
    assert.equal(container.firstChild, el, 'handles odd nodeName capitalization');

    //
    // in SVG
    //

    init();

    container.innerHTML = '<svg><foreignObject></foreignObject></svg>';
    IncrementalDOM.importNode(container);

    foreign = container.firstChild.firstChild;
    IncrementalDOM.patch(container, () => {
        IncrementalDOM.elementOpen('svg');
        IncrementalDOM.elementVoid('foreignObject');
        IncrementalDOM.elementClose('svg');
    });
    assert.equal(container.firstChild.firstChild, foreign, 'SVG handles normal nodeName capitalization');

    init();

    container.innerHTML = '<svg><foreignobject></foreignobject></svg>';
    IncrementalDOM.importNode(container);

    foreign = container.firstChild.firstChild;
    IncrementalDOM.patch(container, () => {
        IncrementalDOM.elementOpen('svg');
        IncrementalDOM.elementVoid('foreignObject');
        IncrementalDOM.elementClose('svg');
    });
    assert.equal(container.firstChild.firstChild, foreign, 'SVG handles odd nodeName capitalization');
});

