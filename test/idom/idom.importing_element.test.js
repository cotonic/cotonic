//
// IncrementalDOM - importing element test
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

QUnit.test("IncrementalDOM - Importing Element", function(assert) {
    let container = undefined;
    let el;
    let foreign;

    function init() {
        if (container) {
            document.body.removeChild(container);
        }
        container = document.createElement('div');
        document.body.appendChild(container);
    };

    //
    // in HTML
    //

    init();

    container.innerHTML = '<div></div>';
    IncrementalDOM.importNode(container);
    el = container.firstChild;
    IncrementalDOM.patch(container, () => IncrementalDOM.elementVoid('div'));
    assert.equal(container.firstChild, el, 'handles normal nodeName capitalization');

    init();

    container.innerHTML = '<dIv></dIv>';
    IncrementalDOM.importNode(container);

    el = container.firstChild;
    IncrementalDOM.patch(container, () => IncrementalDOM.elementVoid('div'));
    assert.equal(container.firstChild, el, 'handles odd nodeName capitalization');

    //
    // in SVG
    //

    init();

    container.innerHTML = '<svg><foreignObject></foreignObject></svg>';
    IncrementalDOM.importNode(container);

    foreign = container.firstChild.firstChild;
    IncrementalDOM.patch(container, () => {
        IncrementalDOM.elementOpen('svg');
        IncrementalDOM.elementVoid('foreignObject');
        IncrementalDOM.elementClose('svg');
    });
    assert.equal(container.firstChild.firstChild, foreign, 'SVG handles normal nodeName capitalization');

    init();

    container.innerHTML = '<svg><foreignobject></foreignobject></svg>';
    IncrementalDOM.importNode(container);

    foreign = container.firstChild.firstChild;
    IncrementalDOM.patch(container, () => {
        IncrementalDOM.elementOpen('svg');
        IncrementalDOM.elementVoid('foreignObject');
        IncrementalDOM.elementClose('svg');
    });
    assert.equal(container.firstChild.firstChild, foreign, 'SVG handles odd nodeName capitalization');
});

