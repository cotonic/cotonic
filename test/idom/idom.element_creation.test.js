//
// IncrementalDOM - Element Creation test
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

QUnit.test("IncrementalDOM - Element Creation", function(assert) {
    let container = undefined;
    let el;
    let doc;
    let div;
    let mrow;
    let oldCreateElement;
    let count;
    let svg;

    function init() {
        if (container) {
            document.body.removeChild(container);
        }
        container = document.createElement('div');
        document.body.appendChild(container);
    };

    init();

    //
    // creating a single node'
    //

    function init2() {
        IncrementalDOM.patch(container, () => {
            IncrementalDOM.elementVoid(
              'div', 'key',
              ['id', 'someId', 'class', 'someClass', 'data-custom', 'custom'],
              'data-foo', 'Hello',
              'data-bar', 'World');
        });
        el = container.childNodes[0];
    };

    init();
    init2();

    assert.equal(el.tagName, 'DIV', 'should render with the specified tag');

    init();
    init2();

    assert.equal(el.id, 'someId', 'should render with static attributes (1)');
    assert.equal(el.className, 'someClass', 'should render with static attributes (2)');
    assert.equal(el.getAttribute('data-custom'), 'custom', 'should render with static attributes (3)');

    init();
    init2();

    assert.equal(el.getAttribute('data-foo'), 'Hello', 'should render with dynamic attributes (1)');
    assert.equal(el.getAttribute('data-bar'), 'World', 'should render with dynamic attributes (2)');

    //
    // return DOM node
    //

    function init3() {
        IncrementalDOM.patch(container, () => {});
    }

    init();
    init3();

    IncrementalDOM.patch(container, () => {
        el = IncrementalDOM.elementOpen('div');
        IncrementalDOM.elementClose('div');
    });
    assert.equal(el, container.childNodes[0], 'from elementOpen');

    init();
    init3();

    IncrementalDOM.patch(container, () => {
        IncrementalDOM.elementOpen('div');
        el = IncrementalDOM.elementClose('div');
    });
    assert.equal(el, container.childNodes[0], 'from elementClose');

    init();
    init3();

    IncrementalDOM.patch(container, () => {
        el = IncrementalDOM.elementVoid('div');
    });
    assert.equal(el, container.childNodes[0], 'from elementVoid');

    init();
    init3();

    IncrementalDOM.patch(container, () => {
        IncrementalDOM.elementOpenStart('div');
        el = IncrementalDOM.elementOpenEnd();
        IncrementalDOM.elementClose('div');
    });
    assert.equal(el, container.childNodes[0], 'from elementOpenEnd');


    //
    // Creating single node
    //

    init();

    IncrementalDOM.patch(container, () => {
        IncrementalDOM.elementVoid('div', null, null, 'id', 'test');
    });
    assert.equal(container.childNodes[0].id, 'test', 'should allow creation without static attributes');


    //
    // HTML elements
    //

    init();

    IncrementalDOM.patch(container, () => {
        IncrementalDOM.elementVoid('div');
    });
    assert.equal(container.childNodes[0].namespaceURI, 'http://www.w3.org/1999/xhtml', 'should use the XHTML namespace');


    init();

    doc = container.ownerDocument;
    div = doc.createElement('div');
    oldCreateElement = doc.createElement;
    count = 0;
    doc.createElement = () => { count++; return div; };

    IncrementalDOM.patch(container, () => {
        IncrementalDOM.elementOpen('svg');
        IncrementalDOM.elementOpen('foreignObject');
        el = IncrementalDOM.elementVoid('div');
        IncrementalDOM.elementClose('foreignObject');
        IncrementalDOM.elementClose('svg');
    });
    doc.createElement = oldCreateElement;
    assert.equal(el.namespaceURI, 'http://www.w3.org/1999/xhtml','should use createElement if no namespace has been specified (1)' );
    assert.equal(count, 1, 'should use createElement if no namespace has been specified (2)');

    //
    // SVG elements
    //

    function init4() {
        IncrementalDOM.patch(container, () => {
            IncrementalDOM.elementOpen('svg');
                IncrementalDOM.elementOpen('g');
                    IncrementalDOM.elementVoid('circle');
                IncrementalDOM.elementClose('g');
                IncrementalDOM.elementOpen('foreignObject');
                    IncrementalDOM.elementVoid('p');
                IncrementalDOM.elementClose('foreignObject');
                IncrementalDOM.elementVoid('path');
            IncrementalDOM.elementClose('svg');
        });
    }

    init();
    init4();

    el = container.querySelector('svg');
    assert.equal(el.namespaceURI, 'http://www.w3.org/2000/svg', 'should create svgs in the svg namespace');

    el = container.querySelector('circle');
    assert.equal(el.namespaceURI, 'http://www.w3.org/2000/svg', 'should create descendants of svgs in the svg namespace');

    el = container.querySelector('svg').childNodes[1];
    assert.equal(el.namespaceURI, 'http://www.w3.org/2000/svg', 'should have the svg namespace for foreignObjects');

    el = container.querySelector('p');
    assert.equal(el.namespaceURI, 'http://www.w3.org/1999/xhtml', 'should revert to the xhtml namespace when encounering a foreignObject');

    el = container.querySelector('path');
    assert.equal(el.namespaceURI, 'http://www.w3.org/2000/svg', 'should reset to the previous namespace after exiting a foreignObject');

    svg = container.querySelector('svg');
    IncrementalDOM.patch(svg, () => {
        IncrementalDOM.elementVoid('rect');
    });
    el = svg.querySelector('rect');
    assert.equal(el.namespaceURI, 'http://www.w3.org/2000/svg', 'should create children in the svg namespace when patching an svg');

    //
    // Math elements
    //

    function init5() {
        IncrementalDOM.patch(container, () => {
            IncrementalDOM.elementOpen('math');
                IncrementalDOM.elementOpen('semantics');
                    IncrementalDOM.elementOpen('mrow');
                        IncrementalDOM.elementVoid('mo');
                    IncrementalDOM.elementClose('mrow');
                IncrementalDOM.elementClose('semantics');
            IncrementalDOM.elementClose('math');
            IncrementalDOM.elementVoid('p');
        });
    }

    init();
    init5();

    el = container.querySelector('math');
    assert.equal(el.namespaceURI, 'http://www.w3.org/1998/Math/MathML', 'should create equations in the MathML namespace');

    el = container.querySelector('mo');
    assert.equal(el.namespaceURI, 'http://www.w3.org/1998/Math/MathML', 'should create descendants of math in the MathML namespace');

    el = container.querySelector('p');
    assert.equal(el.namespaceURI, 'http://www.w3.org/1999/xhtml', 'should reset to the previous namespace after exiting math');

    mrow = container.querySelector('mrow');
    IncrementalDOM.patch(mrow, () => {
        IncrementalDOM.elementVoid('mi');
    });
    el = mrow.querySelector('mi');
    assert.equal(el.namespaceURI, 'http://www.w3.org/1998/Math/MathML', 'should create children in the MathML namespace when patching an equation');
});
