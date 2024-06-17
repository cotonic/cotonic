//
// IncrementalDOM - currentPointer test
//

import "/src-idom/index-bundle.js";

QUnit.test("IncrementalDOM - currentPointer", function(assert) {
    let container = undefined;
    let firstChild = undefined;
    let lastChild = undefined;
    let el;

    function init() {
        if (container) {
            document.body.removeChild(container);
        }
        container = document.createElement('div');
        container.innerHTML = `<div></div><span></span>`;
        firstChild = container.firstChild;
        lastChild = container.lastChild;
        document.body.appendChild(container);
    };

    init();

    container.innerHTML = '';
    IncrementalDOM.patch(container, () => {
        el = IncrementalDOM.currentPointer();
    });
    assert.equal(el, null, 'should return null if no children');

    init();

    IncrementalDOM.patch(container, () => {
        el = IncrementalDOM.currentPointer();
    });
    assert.equal(el, firstChild, 'should return the first child when an element was just opened');


    init();

    IncrementalDOM.patch(container, () => {
        IncrementalDOM.elementVoid('div');
        el = IncrementalDOM.currentPointer();
    });
    assert.equal(el, lastChild, 'should return the next node to evaluate');

    init();

    IncrementalDOM.patch(container, () => {
        IncrementalDOM.elementVoid('div');
        IncrementalDOM.elementVoid('span');
        el = IncrementalDOM.currentPointer();
    });
    assert.equal(el, null, 'should return null if past the end');

    init();

    assert.throws(
      () => IncrementalDOM.currentPointer(),
      Error("Cannot call currentPointer\(\) unless in patch."),
      'should throw an error if not patching');

    init();

    assert.throws(
      () => {
          IncrementalDOM.patch(container, () => {
              IncrementalDOM.elementOpenStart('div');
              IncrementalDOM.currentPointer();
              IncrementalDOM.elementOpenEnd();
              IncrementalDOM.elementClose('div');
          });
      },
      Error("currentPointer() can not be called between elementOpenStart() and elementOpenEnd()."),
      'should throw an error if inside virtual attributes element'
      );
});
