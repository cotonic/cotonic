//
// IncrementalDOM - skip test
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

QUnit.test("IncrementalDOM - skip", function(assert) {
    let container = undefined;

    function init() {
        if (container) {
            document.body.removeChild(container);
        }
        container = document.createElement('div');
        document.body.appendChild(container);
    };

    // should keep any DOM nodes in the subtree

    init();

    function render1(data) {
        IncrementalDOM.elementOpen('div');
        if (data.skip) {
            IncrementalDOM.skip();
        } else {
            IncrementalDOM.text('some ');
            IncrementalDOM.text('text');
        }
        IncrementalDOM.elementClose('div');
    }

    IncrementalDOM.patch(container, render1, {skip: false});
    IncrementalDOM.patch(container, render1, {skip: true});

    assert.equal(container.textContent, 'some text', 'should keep any DOM nodes in the subtree');

    // should throw if an element is declared after skipping

    init();

    assert.throws(
        () => {
            IncrementalDOM.patch(container, () => {
                IncrementalDOM.skip();
                IncrementalDOM.elementOpen('div');
                IncrementalDOM.elementClose('div');
            });
        },
        Error('elementOpen() may not be called inside an element that has called skip().'),
        'should throw if an element is declared after skipping');

    // should throw if a text is declared after skipping

    init();

    assert.throws(
      () => {
          IncrementalDOM.patch(container, () => {
              IncrementalDOM.skip();
              IncrementalDOM.text('text');
          });
      },
      Error('text() may not be called inside an element that has called skip().'),
      'should throw if a text is declared after skipping');

    // should throw skip is called after declaring an element

    init();

    assert.throws(
      () => {
          IncrementalDOM.patch(container, () => {
              IncrementalDOM.elementVoid('div');
              IncrementalDOM.skip();
          });
      },
      Error('skip() must come before any child declarations inside the current element.'),
      'should throw skip is called after declaring an element');

    // should throw skip is called after declaring a text

    init();

    assert.throws(
      () => {
          IncrementalDOM.patch(container, () => {
              IncrementalDOM.text('text');
              IncrementalDOM.skip();
          });
      },
      Error('skip() must come before any child declarations inside the current element.'),
      'should throw skip is called after declaring a text');

    //
    // alignWithDOM
    //

    function render2(condition, shouldSkip) {
        if (condition) {
            IncrementalDOM.elementVoid('img');
        }
        if (shouldSkip) {
            IncrementalDOM.alignWithDOM('div', 1);
        } else {
            IncrementalDOM.elementOpen('div', 1);
                IncrementalDOM.text('Hello');
            IncrementalDOM.elementClose('div');
        }
    }

    init();

    IncrementalDOM.patch(container, () => {
        render2(true, false);
    });
    assert.equal(container.children[1].innerHTML, 'Hello', 'should skip the correct element when used with conditional elements (1)');

    container.children[1].innerHTML = 'Hola';
    IncrementalDOM.patch(container, () => {
        render2(false, true);
    });
    assert.equal(container.childElementCount, 1, 'should skip the correct element when used with conditional elements (2)');

    // When condition is false, the current node will be at <img>
    // alignWithDOM will then pull the second <div> up to the
    // current position and diff it. The <img> will then be deleted.
    assert.equal(container.children[0].innerHTML, 'Hola', 'should skip the correct element when used with conditional elements (3)');
});
