//
// IncrementalDOM - skipNode test
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

QUnit.test("IncrementalDOM - skipNode", function(assert) {
    let container = document.createElement('div');
    container.innerHTML = '<div></div><span></span>';

    let firstChild = container.firstChild;
    let lastChild = container.lastChild;

    document.body.appendChild(container);

    IncrementalDOM.patch(container, () => {
      IncrementalDOM.skipNode();
      IncrementalDOM.elementVoid('span');
    });

    assert.equal(container.firstChild, firstChild, "should keep nodes that were skipped at the start - 1");
    assert.equal(container.lastChild, lastChild, "should keep nodes that were skipped at the start - 2");

    IncrementalDOM.patch(container, () => {
      IncrementalDOM.elementVoid('div');
      IncrementalDOM.skipNode();
    });

    assert.equal(container.lastChild, lastChild, "should keep nodes that were skipped");
});
