//
// IncrementalDOM - currentPointer test
//

/**
 * Copyright 2018 The Incremental DOM Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


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
