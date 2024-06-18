//
// IncrementalDOM - Formatter test
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

QUnit.test("IncrementalDOM - Formatter", function(assert) {
    let container = undefined;
    let node;
    let count;

    function init() {
        if (container) {
            document.body.removeChild(container);
        }
        container = document.createElement('div');
        document.body.appendChild(container);
    };

    //
    // Newly created Text nodes
    //

    init();

    function sliceOne(str) {
        return ('' + str).slice(1);
    }

    function prefixQuote(str) {
        return '\'' + str;
    }

    IncrementalDOM.patch(container, () => {
        IncrementalDOM.text('hello world!', sliceOne, prefixQuote);
    });
    node = container.childNodes[0];
    assert.equal(node.textContent, '\'ello world!', 'should render with the specified formatted value');

    init();

    //
    // Updated Text nodes
    //

    function stub() {
        count++
        if (count == 1) {
            return 'stubValueOne';
        }
        if (count == 2) {
            return 'stubValueTwo';
        }
    }

    function render(value) {
        IncrementalDOM.text(value, stub);
    }

    init();
    count = 0;

    IncrementalDOM.patch(container, () => render('hello'));
    IncrementalDOM.patch(container, () => render('hello'));
    node = container.childNodes[0];
    assert.equal(node.textContent, 'stubValueOne', 'should not call the formatter for unchanged values (1)');
    assert.equal(count, 1, 'should not call the formatter for unchanged values (2)');

    init();
    count = 0;

    IncrementalDOM.patch(container, () => render('hello'));
    IncrementalDOM.patch(container, () => render('world'));
    node = container.childNodes[0];
    assert.equal(node.textContent, 'stubValueTwo', 'should call the formatter when the value changes (1)');
    assert.equal(count, 2, 'should call the formatter when the value changes (2)');

    init();
    count = 0;

    container.textContent = 'test';
    IncrementalDOM.patch(container, () => IncrementalDOM.text('test', s => s + 'Z'));
    assert.equal(container.textContent, 'testZ', 'should call the formatter even if the initial value matches');

    // it('should not leak the arguments object', () => {
    //   const stub = Sinon.stub().returns('value');
    //   patch(container, () => text('value', stub));

    //   expect(stub).to.not.have.been.calledOn(['value', stub]);
    // });
});

