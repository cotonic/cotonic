//
// IncrementalDOM - patchInner
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

QUnit.test("IncrementalDOM - patchInner", function(assert) {
    let container = undefined;
    let containerOne;
    let containerTwo;
    let div;
    let node;
    let child;

    function init() {
        if (container) {
            document.body.removeChild(container);
        }
        container = document.createElement('div');
        document.body.appendChild(container);
    };

    function render() {
        IncrementalDOM.elementVoid('div', null, null, 'tabindex', '0');
    }

    function init2() {
        init();
        div = document.createElement('div');
        div.setAttribute('tabindex', '-1');
        container.appendChild(div);
    }

    //
    // with an existing document tree
    //

    init2();

    IncrementalDOM.patchInner(container, render);
    child = container.childNodes[0];
    assert.equal(child, div, 'should preserve existing nodes');


    //
    // Should return DOM node
    //

    init2();

    IncrementalDOM.patchInner(container, () => {
        node = IncrementalDOM.elementOpen('div');
        IncrementalDOM.elementClose('div');
    });
    assert.equal(node, div, 'from elementOpen');

    init2();

    IncrementalDOM.patchInner(container, () => {
        IncrementalDOM.elementOpen('div');
        node = IncrementalDOM.elementClose('div');
    });
    assert.equal(node, div, 'from elementClose');

    init2();

    IncrementalDOM.patchInner(container, () => {
        node = IncrementalDOM.elementVoid('div');
    });
    assert.equal(node, div, 'from elementVoid');

    init2();

    IncrementalDOM.patchInner(container, () => {
        IncrementalDOM.elementOpenStart('div');
        node = IncrementalDOM.elementOpenEnd();
        IncrementalDOM.elementClose('div');
    });
    assert.equal(node, div, 'from elementOpenEnd');

    //
    // Other checks
    //

    init();

    containerOne = document.createElement('div');
    containerTwo = document.createElement('div');

    function renderOne() {
        IncrementalDOM.elementOpen('div');
            IncrementalDOM.patchInner(containerTwo, renderTwo);
            IncrementalDOM.text('hello');
        IncrementalDOM.elementClose('div');
    }

    function renderTwo() {
        IncrementalDOM.text('foobar');
    }

    IncrementalDOM.patchInner(containerOne, renderOne);
    assert.equal(containerOne.textContent, 'hello', 'should be re-entrant (1)');
    assert.equal(containerTwo.textContent, 'foobar', 'should be re-entrant (2)');

    init();

    function render2(content) {
        IncrementalDOM.text(content);
    }
    IncrementalDOM.patchInner(container, render2, 'foobar');
    assert.equal(container.textContent, 'foobar', 'should pass third argument to render function');


    init();

    let detachedContainer = document.createElement('div');
    function render3() {
        IncrementalDOM.elementVoid('span');
    }
    IncrementalDOM.patchInner(detachedContainer, render3);
    assert.equal(detachedContainer.firstChild.tagName, 'SPAN', 'should patch a detached node');

    init();

    assert.throws(
        () => IncrementalDOM.patch(container, () => { IncrementalDOM.elementOpen('div'); }),
        Error('One or more tags were not closed:\ndiv'),
        'should throw when an element is unclosed');

    //
    // patching a documentFragment
    //
    let frag = document.createDocumentFragment();
    IncrementalDOM.patchInner(frag, function() {
        IncrementalDOM.elementOpen('div', null, null, 'id', 'aDiv');
        IncrementalDOM.elementClose('div');
    });
    assert.equal(frag.childNodes[0].id, 'aDiv', 'should create the required DOM nodes');

    //
    // alias check
    //
    assert.equal(IncrementalDOM.patch, IncrementalDOM.patchInner, 'should alias patchInner');

});
