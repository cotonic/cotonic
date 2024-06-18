//
// IncrementalDOM - applyStatics test
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

QUnit.test("IncrementalDOM - applyStatics", function(assert) {
    let container = undefined;
    let firstChild = undefined;

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
        IncrementalDOM.applyStatics(['nameOne', 'valueOne', 'nameTwo', 'valueTwo']);
        IncrementalDOM.close();
    });

    firstChild = container.children[0];
    assert.equal(firstChild.attributes.length, 2, 'should add two attributes');
    assert.equal(firstChild.getAttribute('nameOne'), 'valueOne', 'should add attribute One');
    assert.equal(firstChild.getAttribute('nameTwo'), 'valueTwo', 'should add attribute Two');

    init();

    IncrementalDOM.patch(container, () => {
        IncrementalDOM.open('div');
        IncrementalDOM.open('span');
        IncrementalDOM.close();

        IncrementalDOM.applyStatics(['nameOne', 'valueOne', 'nameTwo', 'valueTwo']);
        IncrementalDOM.close();
    });

    firstChild = container.children[0];
    assert.equal(firstChild.attributes.length, 2, 'should add two attributes after subtree');
    assert.equal(firstChild.getAttribute('nameOne'), 'valueOne', 'should add attribute One after subtree');
    assert.equal(firstChild.getAttribute('nameTwo'), 'valueTwo', 'should add attribute Two after subtree');

    init();

    IncrementalDOM.patch(container, () => {
        IncrementalDOM.open('div');
        IncrementalDOM.applyStatics(['nameOne', 'valueOne', 'nameTwo', 'valueTwo']);
        IncrementalDOM.close();
    });

    const mo = new MutationObserver(() => {});
    mo.observe(container, {
        attributes: true,
        subtree: true,
    });

    IncrementalDOM.patch(container, () => {
        IncrementalDOM.open('div');
        IncrementalDOM.applyStatics(['nameOne', 'valueOneNew', 'nameThree', 'valueThree']);
        IncrementalDOM.close();
    });

    assert.equal(mo.takeRecords().length, 0, 'should not re-apply if the statics changed');
});
