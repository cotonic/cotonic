//
// IncrementalDOM - skipNode test
//

import "/src-idom/index-bundle.js";

QUnit.test("IncrementalDOM - skipNode", function(assert) {
    let container = document.createElement('div');
    container.innerHTML = '<div></div><span></span>';

    let firstChild = container.firstChild;
    let lastChild = container.lastChild;

    document.body.appendChild(container);

    IncrementalDOM.patch(container, () => {
      IncrementalDOM.skipNode();
      IncrementalDOM.elementVoid('span');
    });

    assert.equal(container.firstChild, firstChild, "should keep nodes that were skipped at the start - 1");
    assert.equal(container.lastChild, lastChild, "should keep nodes that were skipped at the start - 2");

    IncrementalDOM.patch(container, () => {
      IncrementalDOM.elementVoid('div');
      IncrementalDOM.skipNode();
    });

    assert.equal(container.lastChild, lastChild, "should keep nodes that were skipped");
});
