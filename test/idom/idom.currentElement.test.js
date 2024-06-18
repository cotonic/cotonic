//
// IncrementalDOM - currentElement test
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

QUnit.test("IncrementalDOM - currentElement", function(assert) {
    let container = undefined;
    let el = undefined;

    function init() {
        if (container) {
            document.body.removeChild(container);
        }
        container = document.createElement('div');
        document.body.appendChild(container);
    };

    init();

    IncrementalDOM.patch(container, () => {
        IncrementalDOM.elementOpen('div');
        el = IncrementalDOM.currentElement();
        IncrementalDOM.elementClose('div');
    });
    assert.equal(el, container.childNodes[0], 'should return the element from elementOpen');

    init();

    IncrementalDOM.patch(container, () => {
        IncrementalDOM.elementOpenStart('div');
        IncrementalDOM.elementOpenEnd();
        el = IncrementalDOM.currentElement();
        IncrementalDOM.elementClose('div');
    });
    assert.equal(el, container.childNodes[0], 'should return the element from elementOpenEnd');

    init();

    IncrementalDOM.patch(container, () => {
        IncrementalDOM.elementOpen('div');
        IncrementalDOM.elementClose('div');
        el = IncrementalDOM.currentElement();
    });
    assert.equal(el, container, 'should return the parent after elementClose');

    init();

    IncrementalDOM.patch(container, () => {
        IncrementalDOM.elementVoid('div');
        el = IncrementalDOM.currentElement();
    });
    assert.equal(el, container, 'should return the parent after elementVoid');

    init();

    assert.throws(
        () => IncrementalDOM.currentElement(),
        Error("Cannot call currentElement() unless in patch."),
        'should throw an error if not patching');

    init();

    assert.throws(
        () => {
            IncrementalDOM.patch(container, () => {
              IncrementalDOM.elementOpenStart('div');
              el = IncrementalDOM.currentElement();
              IncrementalDOM.elementOpenEnd();
              IncrementalDOM.elementClose('div');
            });
        },
        Error("currentElement() can not be called between elementOpenStart() and elementOpenEnd()."),
        'should throw an error if inside virtual attributes element');
});
