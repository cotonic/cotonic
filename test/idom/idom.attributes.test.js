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

QUnit.test("IncrementalDOM - attribute updates", function(assert) {

    let container = undefined;
    let firstChild;
    let grandChild;
    let child;
    let el;
    let fn;
    let obj;
    let div;
    let mo;

    function init() {
        if (container) {
            document.body.removeChild(container);
        }
        container = document.createElement('div');
        document.body.appendChild(container);
    };

    function render(attrs) {
        IncrementalDOM.elementOpenStart('div');
        for (const attrName in attrs) {
            IncrementalDOM.attr(attrName, attrs[attrName]);
        }
        IncrementalDOM.elementOpenEnd();
        IncrementalDOM.elementClose('div');
    }

    function createMutationObserver(container) {
        const mo = new MutationObserver(() => {});
        mo.observe(container, {
            attributes: true,
            subtree: true,
        });
        return mo;
    };

    //
    // Attribute updates
    //

    init();

    IncrementalDOM.patch(container, () => render({'data-expanded': 'hello'}));
    el = container.childNodes[0];
    assert.equal(el.getAttribute('data-expanded'), 'hello', 'attribute should be present when they have a value');

    init();

    IncrementalDOM.patch(container, () => render({'data-expanded': false}));
    el = container.childNodes[0];
    assert.equal(el.getAttribute('data-expanded'), 'false', 'attribute should be present when falsy');

    init();

    IncrementalDOM.patch(container, () => render({
        id: undefined,
        tabindex: undefined,
        'data-expanded': undefined
    }));
    el = container.childNodes[0];
    assert.equal(el.getAttribute('data-expanded'), null, 'attribute should be not present when undefined (1)');
    assert.equal(el.getAttribute('id'), null, 'attribute should be not present when undefined (2)');
    assert.equal(el.getAttribute('tabindex'), null, 'attribute should be not present when undefined (3)');

    init();

    IncrementalDOM.patch(container, () => render({'data-expanded': 'foo' }));
    IncrementalDOM.patch(container, () => render({'data-expanded': 'bar'}));
    el = container.childNodes[0];
    assert.equal(el.getAttribute('data-expanded'), 'bar', 'should update the DOM when they change');

    init();

    IncrementalDOM.patch(container, () => render({'data-expanded': 'foo'}));
    mo = createMutationObserver(container);
    IncrementalDOM.patch(container, () => render({'data-expanded': 'foo'}));
    assert.equal(mo.takeRecords().length, 0, 'should not cause a mutation when they are unchanged');

    init();

    IncrementalDOM.patch(container, () => render({'data-foo': 'foo' }));
    IncrementalDOM.patch(container, () => render({'data-bar': 'foo'}));
    el = container.childNodes[0];
    assert.equal(el.getAttribute('data-bar'), 'foo', 'should update different attribute in same position (1)');
    assert.equal(el.getAttribute('data-foo'), null, 'should update different attribute in same position (2)');

    init();

    IncrementalDOM.patch(container, () => render({ 'data-foo': 'foo', 'data-bar': 'bar' }));
    IncrementalDOM.patch(container, () => render({ 'data-bar': 'bar' }));
    el = container.childNodes[0];
    assert.equal(el.getAttribute('data-foo'), null, 'should keep attribute that is moved up (1)');
    assert.equal(el.getAttribute('data-bar'), 'bar', 'should keep attribute that is moved up (2)');

    init();

    IncrementalDOM.patch(container, () => render({'data-bar': 'bar'}));
    IncrementalDOM.patch(container, () => render({'data-foo': 'foo', 'data-bar': 'bar'}));
    el = container.childNodes[0];
    assert.equal(el.getAttribute('data-foo'), 'foo', 'should keep attribute that is moved back (1)');
    assert.equal(el.getAttribute('data-bar'), 'bar', 'should keep attribute that is moved back (2)');


    init();

    IncrementalDOM.patch(container, () => render({'data-foo': 'foo', 'data-bar': 'bar', 'data-baz': 'baz'}));
    IncrementalDOM.patch(container, () => render({'data-bar': 'bar', 'data-baz': 'baz'}));
    el = container.childNodes[0];
    assert.equal(el.getAttribute('data-foo'), null, 'should keep attribute that is moved up then kept (1)');
    assert.equal(el.getAttribute('data-bar'), 'bar', 'should keep attribute that is moved up then kept (2)');
    assert.equal(el.getAttribute('data-baz'), 'baz', 'should keep attribute that is moved up then kept (3)');
    IncrementalDOM.patch(container, () => render({'data-bar': 'bar'}));
    assert.equal(el.getAttribute('data-foo'), null, 'should keep attribute that is moved up then kept (4)');
    assert.equal(el.getAttribute('data-bar'), 'bar', 'should keep attribute that is moved up then kept (5)');
    assert.equal(el.getAttribute('data-baz'), null, 'should keep attribute that is moved up then kept (6)');

    init();

    IncrementalDOM.patch(container, () => render({'data-bar': 'bar', 'data-baz': 'baz'}));
    IncrementalDOM.patch(container, () => render({'data-foo': 'foo', 'data-bar': 'bar', 'data-baz': 'baz'}));
    el = container.childNodes[0];
    assert.equal(el.getAttribute('data-foo'), 'foo', 'should keep attribute that is backwards up then kept (1)');
    assert.equal(el.getAttribute('data-bar'), 'bar', 'should keep attribute that is backwards up then kept (2)');
    assert.equal(el.getAttribute('data-baz'), 'baz', 'should keep attribute that is backwards up then kept (3)');

    IncrementalDOM.patch(container, () => render({'data-foo': 'foo', 'data-bar': 'bar'}));
    assert.equal(el.getAttribute('data-foo'), 'foo', 'should keep attribute that is backwards up then kept (4');
    assert.equal(el.getAttribute('data-bar'), 'bar', 'should keep attribute that is backwards up then kept (5)');
    assert.equal(el.getAttribute('data-baz'), null, 'should keep attribute that is backwards up then kept (6)');

    init();

    IncrementalDOM.patch(container, () => render({'data-foo': 'foo', 'data-bar': 'bar'}));
    IncrementalDOM.patch(container, () => render({}));
    el = container.childNodes[0];

    assert.equal(el.getAttribute('data-foo'), null, 'should remove trailing attributes when missing (1)');
    assert.equal(el.getAttribute('data-bar'), null, 'should remove trailing attributes when missing (2)');

    //
    // Function attributes
    //

    init();

    fn = () =>{};
    IncrementalDOM.patch(container, () => {
        IncrementalDOM.elementVoid('div', null, null, 'fn', fn);
    });
    el = container.childNodes[0];
    assert.equal(el.hasAttribute('fn'), false, 'function should not be set as attributes');

    init();

    fn = () =>{};
    IncrementalDOM.patch(container, () => {
        IncrementalDOM.elementVoid('div', null, null, 'fn', fn);
    });
    el = container.childNodes[0];
    assert.equal(el.fn, fn, 'function should be set on the node');

    //
    // Object attributes
    //

    init();

    obj = {};
    IncrementalDOM.patch(container, () => {
      IncrementalDOM.elementVoid('div', null, null, 'obj', obj);
    });
    el = container.childNodes[0];
    assert.equal(el.hasAttribute('obj'), false, 'object should not be set as attributes');

    init();

    obj = {};
    IncrementalDOM.patch(container, () => {
        IncrementalDOM.elementVoid('div', null, null, 'obj', obj);
    });
    el = container.childNodes[0];
    assert.equal(el.obj, obj, 'object should be set on the node');

    //
    // SVG elements
    //

    init();

    IncrementalDOM.patch(container, () => {
        IncrementalDOM.elementVoid('svg', null, null, 'class', 'foo');
    });
    el = container.childNodes[0];
    assert.equal(el.getAttribute('class'), 'foo', 'SVG should correctly apply the class attribute');

    init();

    IncrementalDOM.patch(container, () => {
        IncrementalDOM.elementOpen('svg');
        IncrementalDOM.elementVoid('image', null, null, 'xlink:href', '#foo');
        IncrementalDOM.elementClose('svg');
    });
    el = container.childNodes[0].childNodes[0];
    assert.equal(el.getAttributeNS('http://www.w3.org/1999/xlink', 'href'), '#foo', 'should apply the correct namespace for namespaced SVG attributes');

    init();

    IncrementalDOM.patch(container, () => {
        IncrementalDOM.elementOpen('svg');
        IncrementalDOM.elementVoid('image', null, null, 'xlink:href', '#foo');
        IncrementalDOM.elementClose('svg');
    });
    IncrementalDOM.patch(container, () => {
        IncrementalDOM.elementOpen('svg');
        IncrementalDOM.elementVoid('image', null, null);
        IncrementalDOM.elementClose('svg');
    });
    el = container.childNodes[0].childNodes[0];
    assert.equal(el.hasAttributeNS('http://www.w3.org/1999/xlink', 'href'), false, 'should remove namespaced SVG attributes');


    //
    // non-Incremental DOM attributes
    //

    init();

    function render1() {
        IncrementalDOM.elementVoid('div');
    }

    IncrementalDOM.patch(container, render1);
    el = container.firstChild;
    el.setAttribute('data-foo', 'bar');
    IncrementalDOM.patch(container, render1);
    assert.equal(el.getAttribute('data-foo'), 'bar', 'should be preserved when changed between patches');


    init();

    container.innerHTML = '<div></div>';
    IncrementalDOM.importNode(container);
    el = container.firstChild;
    el.setAttribute('data-foo', 'bar');
    IncrementalDOM.patch(container, render1);
    assert.equal(el.getAttribute('data-foo'), 'bar', 'should be preserved when importing DOM');

    //
    // Existing document tree
    //

    function init2() {
        div = document.createElement('div');
        div.setAttribute('tabindex', '-1');
        container.appendChild(div);
    };

    init();
    init2();

    IncrementalDOM.patch(container, function() {
        IncrementalDOM.elementVoid('div', null, null, 'tabindex', '0');
    });
    child = container.childNodes[0];
    assert.equal(child.getAttribute('tabindex'), '0', 'should update attributes');

    init();
    init2();

    fn = function (data) {
        IncrementalDOM.elementVoid('div', null, null, data.attr, 'bar');
    }
    IncrementalDOM.patch(container, fn, {attr: 'data-foo'});
    child = container.childNodes[0];
    assert.equal(child.hasAttribute('tabindex'), false, 'should remove attributes (1)');
    assert.equal(child.getAttribute('data-foo'), 'bar', 'should remove attributes (2)');

    IncrementalDOM.patch(container, fn, { attr: 'data-bar' });
    assert.equal(child.hasAttribute('tabindex'), false, 'should remove attributes (3)');
    assert.equal(child.hasAttribute('data-foo'), false, 'should remove attributes (4)');
    assert.equal(child.getAttribute('data-bar'), 'bar', 'should remove attributes (5)');

    init();
    init2();

    let onclick = () => {};
    IncrementalDOM.patch(container, () => {
        IncrementalDOM.elementVoid('div', null, ['tabindex', '-1', 'onclick', onclick]);
    });
    assert.equal(div.onclick, onclick, 'should apply new statics');

    init();
    init2();

    div.setAttribute('data-foo', 'bar');
    mo = createMutationObserver(div);
    IncrementalDOM.patch(container, () => {
        IncrementalDOM.elementVoid('div', null, ['tabindex', '-1', 'data-foo', 'bar']);
    });
    assert.equal(mo.takeRecords().length, 0, 'should not re-apply existing statics with the same vaue');

    init();
    init2();

    IncrementalDOM.patch(container, () => {
        IncrementalDOM.elementVoid('div', null, ['tabindex', '42']);
    });
    child = container.firstElementChild;
    assert.equal(child.getAttribute('tabindex'), '42', 'should apply changed statics');

    init();
    init2();

    div.setAttribute('data-foo', 'bar');
    mo = createMutationObserver(div);
    IncrementalDOM.patch(container, () => {
        IncrementalDOM.elementVoid('div', null, ['data-foo', 'bar', 'tabindex', '-1']);
    });
    assert.equal(mo.takeRecords().length, 0, 'should not re-apply existing statics regardless of order');

    init();
    init2();

    fn = function (value) {
        IncrementalDOM.elementVoid('div', null, ['data-foo', value]);
    }

    function renderParent(value) {
        IncrementalDOM.elementOpen('div');
        fn(value);
        IncrementalDOM.elementClose('div');
    }

    child = container.childNodes[0];
    IncrementalDOM.patch(child, fn, 'bar');

    grandChild = child.childNodes[0];
    assert.equal(grandChild.getAttribute('data-foo'), 'bar', 'should persist statics when patching a parent (1)');

    IncrementalDOM.patch(container, renderParent, 'baz');

    assert.equal(child.hasAttribute('tabindex'), false, 'should persist statics when patching a parent (2)');
    assert.equal(grandChild.getAttribute('data-foo'), 'bar', 'should persist statics when patching a parent (3)');
});
