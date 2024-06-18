//
// IncrementalDOM - virtual attributes test
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

QUnit.test("IncrementalDOM - virtual attributes", function(assert) {
    let container = undefined;
    let el;
    let otherContainer;
    let parentAttributes;
    let childAttributes;

    function init() {
        if (container) {
            document.body.removeChild(container);
        }
        container = document.createElement('div');
        document.body.appendChild(container);
    };

    //
    // for conditional attributes
    //

    function render1(obj) {
        IncrementalDOM.elementOpenStart('div');
        if (obj.key) {
            IncrementalDOM.attr('data-expanded', obj.key);
        }
        IncrementalDOM.elementOpenEnd();
        IncrementalDOM.elementClose('div');
    }

    init();

    IncrementalDOM.patch(container, () => render1({key: 'hello'}));
    el = container.childNodes[0];
    assert.equal(el.getAttribute('data-expanded'), 'hello', 'should be present when specified');

    init();

    IncrementalDOM.patch(container, () => render1({key: false}));
    el = container.childNodes[0];
    assert.equal(el.getAttribute('data-expanded'), null, 'should be not present when not specified');

    init();

    IncrementalDOM.patch(container, () => render1({key: 'foo'}));
    IncrementalDOM.patch(container, () => render1({key: 'bar'}));
    el = container.childNodes[0];
    assert.equal(el.getAttribute('data-expanded'), 'bar', 'should update the DOM when they change');

    init();

    otherContainer = document.createElement('div');

    IncrementalDOM.patch(container, () => {
        IncrementalDOM.elementOpenStart('div');
        IncrementalDOM.attr('parrentAttrOne', 'pOne');

        IncrementalDOM.patch(otherContainer, () => {
            IncrementalDOM.elementOpenStart('div');
            IncrementalDOM.attr('childAttrOne', 'cOne');
            IncrementalDOM.elementOpenEnd();
            IncrementalDOM.elementClose('div');
        });

        IncrementalDOM.attr('parrentAttrTwo', 'pTwo');
        IncrementalDOM.elementOpenEnd();

        IncrementalDOM.elementClose('div');
    });

    parentAttributes = container.children[0].attributes;
    assert.equal(parentAttributes.length, 2, 'should correctly apply attributes during nested patches (1)');
    assert.equal(parentAttributes['parrentAttrOne'].value, 'pOne', 'should correctly apply attributes during nested patches (2)');
    assert.equal(parentAttributes['parrentAttrTwo'].value, 'pTwo', 'should correctly apply attributes during nested patches (3)');

    childAttributes = otherContainer.children[0].attributes;
    assert.equal(childAttributes.length, 1, 'should correctly apply attributes during nested patches (4)');
    assert.equal(childAttributes['childAttrOne'].value, 'cOne', 'should correctly apply attributes during nested patches (5)');

    init();

    assert.throws(
      () => {
          IncrementalDOM.patch(container, () => {
              IncrementalDOM.elementOpenStart('div');
          });
      },
      Error('elementOpenEnd() must be called after calling elementOpenStart().'),
      'should throw when a virtual attributes element is unclosed');

    init();

    assert.throws(
      () => {
          IncrementalDOM.patch(container, () => {
              IncrementalDOM.elementOpenEnd();
          });
      },
      Error('elementOpenEnd() can only be called after calling elementOpenStart().'),
      'should throw when virtual attributes element is closed without being opened');

    init();

    assert.throws(
      () => {
          IncrementalDOM.patch(container, () => {
              IncrementalDOM.elementOpenStart('div');
              IncrementalDOM.elementOpen('div');
          });
      },
      Error('elementOpen() can not be called between elementOpenStart() and elementOpenEnd().'),
      'should throw when opening an element inside a virtual attributes element');

    init();

    assert.throws(
      () => {
          IncrementalDOM.patch(container, () => {
              IncrementalDOM.elementOpenStart('div');
              IncrementalDOM.elementOpenStart('div');
          });
      },
      Error('elementOpenStart() can not be called between elementOpenStart() and elementOpenEnd().'),
      'should throw when opening a virtual attributes element inside a virtual attributes element');

    init();

    assert.throws(
      () => {
          IncrementalDOM.patch(container, () => {
              IncrementalDOM.elementOpenStart('div');
              IncrementalDOM.elementClose('div');
          });
      },
      Error('elementClose() can not be called between elementOpenStart() and elementOpenEnd().'),
      'should throw when closing an element inside a virtual attributes element');
});
