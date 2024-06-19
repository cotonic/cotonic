//
// IncrementalDOM - text nodes test
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

QUnit.test("IncrementalDOM - text nodes", function(assert) {
    let container = undefined;
    let node;
    let mo;

    function init() {
        if (container) {
            document.body.removeChild(container);
        }
        container = document.createElement('div');
        document.body.appendChild(container);
    };

    //
    // when created
    //

    init();

    IncrementalDOM.patch(container, () => {
        IncrementalDOM.text('Hello world!');
    });
    node = container.childNodes[0];
    assert.equal(node.textContent, 'Hello world!', 'should render a text node with the specified value (1)');
    assert.equal(node instanceof Text, true, 'should render a text node with the specified value (2)');

    init();

    IncrementalDOM.patch(container, () => {
        IncrementalDOM.text('Hello ');
        IncrementalDOM.text('World');
        IncrementalDOM.text('!');
    });
    assert.equal(container.textContent, 'Hello World!', 'should allow for multiple text nodes under one parent element');

    init();

    assert.throws(
      () => {
          IncrementalDOM.patch(container, () => {
              IncrementalDOM.elementOpenStart('div');
              IncrementalDOM.text('Hello');
          });
      },
      Error('text() can not be called between elementOpenStart() and elementOpenEnd().'),
      'should throw when inside virtual attributes element');

    //
    // when updated after the DOM is updated
    //

    init();

    // This avoids an Edge bug; see
    // https://github.com/google/incremental-dom/pull/398#issuecomment-497339108

    IncrementalDOM.patch(container, () => IncrementalDOM.text('Hello'));

    container.firstChild.nodeValue = 'Hello World!';

    mo = new MutationObserver(() => {});
    mo.observe(container, {subtree: true, characterData: true});

    IncrementalDOM.patch(container, () => IncrementalDOM.text('Hello World!'));
    assert.equal(mo.takeRecords().length, 0, 'should do nothing (1)');
    assert.equal(container.textContent, 'Hello World!', 'should do nothing (2)');

    //
    // with conditional text
    //

    init();

    function render1(data) {
        IncrementalDOM.text(data);
    }

    IncrementalDOM.patch(container, () => render1('Hello'));
    IncrementalDOM.patch(container, () => render1('Hello World!'));
    node = container.childNodes[0];
    assert.equal(node.textContent, 'Hello World!', 'should update the DOM when the text is updated');

});
