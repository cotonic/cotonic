//
// IncrementalDOM - Buffered attributes test
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

QUnit.test("IncrementalDOM - buffered attributes", function(assert) {
    let container = undefined;
    let secondContainer;
    let firstChild;
    let secondChild;

    function init() {
        if (container) {
            document.body.removeChild(container);
        }
        container = document.createElement('div');
        document.body.appendChild(container);
    };

    init();

    IncrementalDOM.patch(container, () => {
        IncrementalDOM.open('div');
        IncrementalDOM.attr('nameOne', 'valueOne');
        IncrementalDOM.attr('nameTwo', 'valueTwo');
        IncrementalDOM.applyAttrs();
        IncrementalDOM.close();

        IncrementalDOM.open('div');
        IncrementalDOM.attr('nameThree', 'valueThree');
        IncrementalDOM.applyAttrs();
        IncrementalDOM.close();
    });

    firstChild = container.children[0];
    secondChild = container.children[1];
    assert.equal(firstChild.attributes.length, 2, 'should add attributes to the current element (1)');
    assert.equal(firstChild.getAttribute('nameOne'), 'valueOne', 'should add attributes to the current element (2)');
    assert.equal(firstChild.getAttribute('nameTwo'), 'valueTwo', 'should add attributes to the current element (3)');
    assert.equal(secondChild.attributes.length, 1, 'should add attributes to the current element (4)');
    assert.equal(secondChild.getAttribute('nameThree'), 'valueThree', 'should add attributes to the current element (5)');

    init();

    IncrementalDOM.patch(container, () => {
        IncrementalDOM.open('div');
        IncrementalDOM.open('span');
        IncrementalDOM.close();

        IncrementalDOM.attr('nameOne', 'valueOne');
        IncrementalDOM.attr('nameTwo', 'valueTwo');
        IncrementalDOM.applyAttrs();
        IncrementalDOM.close();
    });

    firstChild = container.children[0];
    assert.equal(firstChild.attributes.length, 2);
    assert.equal(firstChild.getAttribute('nameOne'), 'valueOne', 'should add attributes even when a subtree has been open/closed (1)');
    assert.equal(firstChild.getAttribute('nameTwo'), 'valueTwo', 'should add attributes even when a subtree has been open/closed (2)');

    init();

    IncrementalDOM.patch(container, () => {
        IncrementalDOM.attr('nameOne', 'valueOne');
        IncrementalDOM.attr('nameTwo', 'valueTwo');
    });

    IncrementalDOM.patch(container, () => {
        IncrementalDOM.open('div');
        IncrementalDOM.attr('nameThree', 'valueThree');
        IncrementalDOM.applyAttrs();
        IncrementalDOM.close();
    });

    firstChild = container.children[0];
    assert.equal(firstChild.attributes.length, 1, 'should not be left over between patches (1)');
    assert.equal(firstChild.getAttribute('nameThree'), 'valueThree', 'should not be left over between patches (2)');

    init();

    secondContainer = document.createElement('div');
    IncrementalDOM.patch(container, () => {
        IncrementalDOM.attr('nameOne', 'valueOne');
        IncrementalDOM.attr('nameTwo', 'valueTwo');

        IncrementalDOM.patch(secondContainer, () => {
            IncrementalDOM.open('div');
            IncrementalDOM.attr('nameThree', 'valueThree');
            IncrementalDOM.applyAttrs();
            IncrementalDOM.close();
        });
    });

    firstChild = secondContainer.children[0];
    assert.equal(firstChild.attributes.length, 1, 'should not carry over to nested patches (1)');
    assert.equal(firstChild.getAttribute('nameThree'), 'valueThree', 'should not carry over to nested patches(2)');

    init();

    secondContainer = document.createElement('div');
    IncrementalDOM.patch(container, () => {
        IncrementalDOM.attr('nameOne', 'valueOne');
        IncrementalDOM.attr('nameTwo', 'valueTwo');

        IncrementalDOM.patch(secondContainer, () => {
            IncrementalDOM.open('div');
            IncrementalDOM.attr('nameThree', 'valueThree');
            IncrementalDOM.applyAttrs();
            IncrementalDOM.close();
        });

        IncrementalDOM.open('div');
        IncrementalDOM.applyAttrs();
        IncrementalDOM.close();
    });

    firstChild = container.children[0];
    assert.equal(firstChild.attributes.length, 2);
    assert.equal(firstChild.getAttribute('nameOne'), 'valueOne', 'should restore after nested patches (1)');
    assert.equal(firstChild.getAttribute('nameTwo'), 'valueTwo', 'should restore after nested patches (2)');
});
