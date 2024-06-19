//
// IncrementalDOM - keyed items 2 test
//
// These tests just capture the current state of mutations that occur when
// changing the items. These could change in the future.
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

QUnit.test("IncrementalDOM - keyed items 2", function(assert) {
    let container = undefined;
    let mo;
    let records;

    function init() {
        if (container) {
            document.body.removeChild(container);
        }
        container = document.createElement('div');
        document.body.appendChild(container);
    };

    const mutationObserverConfig = {
        childList: true,
        subtree: true,
    };

    function createMutationObserver(container) {
        const mo = new MutationObserver(() => {});
        mo.observe(container, mutationObserverConfig);
        return mo;
    }

    function render(keys) {
        keys.forEach((key) => {
            IncrementalDOM.elementOpen('div', key);
            IncrementalDOM.elementClose('div');
        });
    }

    // should cause no mutations when the items stay the same

    init();

    IncrementalDOM.patch(container, () => render([1, 2, 3]));
    mo = createMutationObserver(container);
    IncrementalDOM.patch(container, () => render([1, 2, 3]));
    assert.equal(mo.takeRecords().length, 0, 'should cause no mutations when the items stay the same');

    // causes only one mutation when adding a new item

    init();

    IncrementalDOM.patch(container, () => render([1, 2, 3]));
    mo = createMutationObserver(container);
    IncrementalDOM.patch(container, () => render([0, 1, 2, 3]));
    assert.equal(mo.takeRecords().length, 1, 'causes only one mutation when adding a new item');

    // cause a removal and addition when moving forwards

    init();

    IncrementalDOM.patch(container, () => render([1, 2, 3]));
    mo = createMutationObserver(container);
    IncrementalDOM.patch(container, () => render([3, 1, 2]));
    records = mo.takeRecords();
    assert.equal(records.length, 2);
    assert.equal(records[0].addedNodes.length, 0, 'cause a removal and addition when moving forwards (1)');
    assert.equal(records[0].removedNodes.length, 1, 'cause a removal and addition when moving forwards (1)');
    assert.equal(records[1].addedNodes.length, 1, 'cause a removal and addition when moving forwards (1)');
    assert.equal(records[1].removedNodes.length, 0, 'cause a removal and addition when moving forwards (1)');

    // causes mutations for each item when removing from the start

    init();

    IncrementalDOM.patch(container, () => render([1, 2, 3, 4]));
    mo = createMutationObserver(container);
    IncrementalDOM.patch(container, () => render([2, 3, 4]));

    records = mo.takeRecords();
    // 7 Mutations: two for each of the nodes moving forward and one for the removal.
    assert.equal(records.length, 7, 'causes mutations for each item when removing from the start');
});
