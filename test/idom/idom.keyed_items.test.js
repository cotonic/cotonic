//
// IncrementalDOM - rendering with keys test
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

QUnit.test("IncrementalDOM - Rendering With Keys", function(assert) {
    let container = undefined;
    let containerTwo;
    let el;
    let foreign;
    let items;
    let newItems;
    let keyedNode;
    let slice;
    let nodes;
    let firstNode;
    let secondNode;
    let thirdNode;
    let newNode;
    let first;
    let second;
    let config;
    let observer;
    let focusNode;
    let shadowRoot;
    let div;
    let shadowEl;
    let keyedEl;

    function init() {
        if (container) {
            document.body.removeChild(container);
        }
        container = document.createElement('div');
        document.body.appendChild(container);
    };

    function render(items) {
        for (let i = 0; i < items.length; i++) {
          const key = items[i].key;
          IncrementalDOM.elementVoid('div', key, key ? ['id', key] : null);
        }
    }

    //
    // Rendering with keys
    //

    init();

    items = [ {key: 'one'} ];
    IncrementalDOM.patch(container, () => render(items));
    keyedNode = container.childNodes[0];
    items.unshift({key: null});
    IncrementalDOM.patch(container, () => render(items));

    assert.equal(container.childNodes.length, 2, 'should not re-use a node with a non-null key (1)');
    assert.notEqual(container.childNodes[0], keyedNode, 'should not re-use a node with a non-null key (2)');

    init();

    slice = Array.prototype.slice;
    items = [{key: null}, {key: undefined}, {key: ''}];

    IncrementalDOM.patch(container, () => render(items));
    nodes = slice.call(container.childNodes);
    IncrementalDOM.patch(container, () => render(items));
    assert.deepEqual(slice.call(container.childNodes), nodes, 'should not modify DOM nodes with falsey keys');

    init();

    items = [{key: 'one'}, {key: 'two'}];

    IncrementalDOM.patch(container, () => render(items));
    firstNode = container.childNodes[0];
    secondNode = container.childNodes[1];
    items.splice(1, 0, {key: 'one-point-five'});
    IncrementalDOM.patch(container, () => render(items));

    assert.equal(container.childNodes.length, 3, 'should not modify the DOM nodes when inserting (1)');
    assert.equal(container.childNodes[0], firstNode, 'should not modify the DOM nodes when inserting (2)');
    assert.equal(container.childNodes[0].id, 'one', 'should not modify the DOM nodes when inserting (3)');
    assert.equal(container.childNodes[1].id, 'one-point-five', 'should not modify the DOM nodes when inserting (4)');
    assert.equal(container.childNodes[2], secondNode, 'should not modify the DOM nodes when inserting (5)');
    assert.equal(container.childNodes[2].id, 'two', 'should not modify the DOM nodes when inserting (6)');

    init();

    items = [{key: 'one'}, {key: 'two'}, {key: 'three'}];

    IncrementalDOM.patch(container, () => render(items));
    firstNode = container.childNodes[0];
    thirdNode = container.childNodes[2];

    items.splice(1, 1);
    IncrementalDOM.patch(container, () => render(items));

    assert.equal(container.childNodes.length, 2, 'should not modify the DOM nodes when removing (1)');
    assert.equal(container.childNodes[0], firstNode, 'should not modify the DOM nodes when removing (2)');
    assert.equal(container.childNodes[0].id, 'one', 'should not modify the DOM nodes when removing (3)');
    assert.equal(container.childNodes[1], thirdNode, 'should not modify the DOM nodes when removing (4)');
    assert.equal(container.childNodes[1].id, 'three', 'should not modify the DOM nodes when removing (5)');

    init();

    items = [{key: 'one'}, {key: 'two'}, {key: 'three'}];

    IncrementalDOM.patch(container, () => render(items));
    firstNode = container.childNodes[0];
    secondNode = container.childNodes[1];
    thirdNode = container.childNodes[2];

    items.splice(1, 1);
    items.push({key: 'two'});
    IncrementalDOM.patch(container, () => render(items));

    assert.equal(container.childNodes.length, 3, 'should not modify the DOM nodes when re-ordering (1)');
    assert.equal(container.childNodes[0], firstNode, 'should not modify the DOM nodes when re-ordering (2)');
    assert.equal(container.childNodes[0].id, 'one', 'should not modify the DOM nodes when re-ordering (3)');
    assert.equal(container.childNodes[1], thirdNode, 'should not modify the DOM nodes when re-ordering (4)');
    assert.equal(container.childNodes[1].id, 'three', 'should not modify the DOM nodes when re-ordering (5)');
    assert.equal(container.childNodes[2], secondNode, 'should not modify the DOM nodes when re-ordering (6)');
    assert.equal(container.childNodes[2].id, 'two', 'should not modify the DOM nodes when re-ordering (7)');

    init();

    items = [{key: 'hasOwnProperty'}];
    IncrementalDOM.patch(container, () => render(items));
    assert.equal(container.childNodes.length, 1, 'should avoid collisions with Object.prototype');

    init();

    function render1(tag) {
        IncrementalDOM.elementVoid(tag, 'key');
    }

    IncrementalDOM.patch(container, render1, 'div');
    firstNode = container.childNodes[0];

    IncrementalDOM.patch(container, render1, 'span');
    newNode = container.childNodes[0];
    assert.notEqual(newNode, firstNode, 'should not reuse dom node when nodeName doesn\'t match (1)');
    assert.equal(newNode.nodeName, 'SPAN', 'should not reuse dom node when nodeName doesn\'t match (2)');
    assert.equal(firstNode.parentNode, null, 'should not reuse dom node when nodeName doesn\'t match (3)');

    init();

    function renderOne(tag) {
        IncrementalDOM.elementVoid('div', 'keyOne');
        IncrementalDOM.elementVoid(tag, 'keyTwo');
    }

    function renderTwo(tag) {
        IncrementalDOM.elementVoid(tag, 'keyTwo');
    }

    IncrementalDOM.patch(container, renderOne, 'div');
    IncrementalDOM.patch(container, renderOne, 'span');
    newNode = container.lastChild;
    IncrementalDOM.patch(container, renderTwo, 'span');

    assert.equal(newNode, container.lastChild, 'should update the mapping when a keyed item does not match');

    init();

    IncrementalDOM.patch(container, () => IncrementalDOM.elementVoid('div', 'key'));
    firstNode = container.firstChild;
    container.removeChild(firstNode);
    IncrementalDOM.patch(container, () => IncrementalDOM.elementVoid('span', 'key'));
    newNode = container.firstChild;
    assert.equal(newNode.nodeName, 'SPAN', 'should patch correctly when child in key map is manually removed');

    //
    // Non unique keys
    //

    init();

    items = [{key: 'one'}, {key: 'one'}];
    IncrementalDOM.patch(container, () => render(items));
    assert.equal(container.childNodes.length, 2, 'should render all items');

    init();

    items = [{key: 'one'}, {key: 'two'}, {key: 'one'}];
    IncrementalDOM.patch(container, () => render(items));
    first = container.childNodes[0];
    second = container.childNodes[2];
    newItems = [{key: 'one'}, {key: 'one'}];
    IncrementalDOM.patch(container, () => render(newItems));

    assert.equal(container.childNodes.length, 2, 'should reuse items in order (1)');
    assert.equal(container.childNodes[0], first, 'should reuse items in order (2)');
    assert.equal(container.childNodes[1], second, 'should reuse items in order (3)');

    init();

    function render2() {
        IncrementalDOM.elementOpen('div', 0);
            IncrementalDOM.text('Foo');
        IncrementalDOM.elementClose('div');
        IncrementalDOM.elementVoid('div', 1);
    }

    config = {
        'childList': true,
        'attributes': true,
        'characterData': true,
        'subtree': true,
    };
    IncrementalDOM.patch(container, render2);
    // Simulate serverside rendering by clearing the cache.
    IncrementalDOM.clearCache(container);
    observer = new MutationObserver(() => {});
    observer.observe(container, config);
    IncrementalDOM.patch(container, render2);
    assert.equal(observer.takeRecords().length, 0, 'should preserve nodes already in the DOM');

    //
    // an item with focus
    //

    init();

    function render3(items) {
        for (let i = 0; i < items.length; i++) {
            const key = items[i].key;
            IncrementalDOM.elementOpen('div', key);
            IncrementalDOM.elementVoid('div', null, null, 'id', key, 'tabindex', -1);
            IncrementalDOM.elementClose('div');
        }
    }

    items = [{key: 'one'}, {key: 'two'}];
    IncrementalDOM.patch(container, () => render3(items));
    focusNode = container.querySelector('#two');
    focusNode.focus();
    // Simulate serverside rendering by clearing the cache.
    IncrementalDOM.clearCache(container);
    IncrementalDOM.patch(container, () => render3(items));
    assert.equal(document.activeElement, focusNode, 'should retain focus when importing DOM with inferred keys');

    init();

    items = [{key: 'one'}];
    IncrementalDOM.patch(container, () => render3(items));
    focusNode = container.querySelector('#one');
    focusNode.focus();
    items.unshift({key: 'zero'});
    IncrementalDOM.patch(container, () => render3(items));
    assert.equal(document.activeElement, focusNode, 'should retain focus when prepending a new item');

    init();

    items = [{key: 'one'}, {key: 'two'}, {key: 'three'}];
    IncrementalDOM.patch(container, () => render3(items));
    focusNode = container.querySelector('#three');
    focusNode.focus();
    items.unshift(items.pop());
    IncrementalDOM.patch(container, () => render3(items));
    assert.equal(document.activeElement, focusNode, 'should retain focus when moving up in DOM order');

    init();

    items = [{key: 'one'}, {key: 'two'}, {key: 'three'}];
    IncrementalDOM.patch(container, () => render3(items));
    focusNode = container.querySelector('#one');
    focusNode.focus();
    items.push(items.shift());
    IncrementalDOM.patch(container, () => render3(items));
    assert.equal(document.activeElement, focusNode, 'should retain focus when moving down in DOM order');

    init();

    function renderInner(id) {
        IncrementalDOM.elementVoid('div', null, null, 'id', id, 'tabindex', -1);
    }

    function render4(item) {
      for (let i = 0; i < items.length; i++) {
        const key = items[i].key;
        IncrementalDOM.elementOpen('div', key, null);
        IncrementalDOM.patch(IncrementalDOM.currentElement(), () => renderInner(key));
        IncrementalDOM.skip();
        IncrementalDOM.elementClose('div');
      }
    }

    items = [{key: 'one'}, {key: 'two'}, {key: 'three'}];
    IncrementalDOM.patch(container, () => render4(items));
    focusNode = container.querySelector('#three');
    focusNode.focus();
    items.unshift(items.pop());
    IncrementalDOM.patch(container, () => render4(items));
    assert.equal(document.activeElement, focusNode, 'should retain focus when doing a nested patch of a subtree');

    init();

    function renderOuter(items) {
        IncrementalDOM.elementOpen('div', null, null);
        IncrementalDOM.patch(containerTwo, () => render3(items));
        IncrementalDOM.elementClose('div');
    }

    containerTwo = document.createElement('div');
    items = [{key: 'one'}, {key: 'two'}, {key: 'three'}];
    document.body.appendChild(containerTwo);
    IncrementalDOM.patch(container, () => renderOuter(items));
    focusNode = containerTwo.querySelector('#three');
    focusNode.focus();
    items.unshift(items.pop());
    IncrementalDOM.patch(container, () => renderOuter(items));
    assert.equal(document.activeElement, focusNode, 'should retain focus when doing a nested patch of another tree');


    //
    // retain focus when patching ShadowRoot
    //

    init();

    items = [{key: 'one'}];
    shadowRoot = container.attachShadow({mode: 'closed'})
    IncrementalDOM.patch(shadowRoot, () => render3(items));
    focusNode = shadowRoot.querySelector('#one');
    focusNode.focus();
    items.unshift({key: 'zero'});
    IncrementalDOM.patch(shadowRoot, () => render3(items));
    assert.equal(shadowRoot.activeElement, focusNode, 'should retain focus when patching a ShadowRoot (1)');
    assert.equal(document.activeElement, container, 'should retain focus when patching a ShadowRoot (2)');

    init();

    items = [{key: 'one'}];
    shadowRoot = container.attachShadow({mode: 'closed'})
    shadowEl = shadowRoot.appendChild(document.createElement('div'));
    shadowEl.tabIndex = -1;
    shadowEl.focus();
    items.unshift({key: 'zero'});
    IncrementalDOM.patch(container, () => render(items));
    assert.equal(shadowRoot.activeElement, shadowEl, 'should retain focus when patching outside a ShadowRoot');

    //
    // Data
    //

    init();

    div = document.createElement('div');
    assert.equal(IncrementalDOM.isDataInitialized(div), false, 'should return false if the element has no data');

    div = document.createElement('div');
    IncrementalDOM.patch(div, () => { IncrementalDOM.elementVoid('div', '3'); });
    assert.equal(IncrementalDOM.isDataInitialized(div.firstChild), true, 'should return true if the element has initialized data');

    //
    // getKey
    //

    init();

    div = document.createElement('div');
    assert.throws(
      () => { IncrementalDOM.getKey(div); },
      Error('Expected value to be defined'),
      'should fail if the element has no node data');

    init();

    div = document.createElement('div');
    IncrementalDOM.patch(div, () => { IncrementalDOM.elementVoid('div'); });
    assert.equal(IncrementalDOM.getKey(div.firstChild), undefined, 'should return undefined if the element has no key');

    init();

    div = document.createElement('div');
    IncrementalDOM.patch(div, () => { IncrementalDOM.elementVoid('div', '3'); });
    assert.equal(IncrementalDOM.getKey(div.firstChild), '3', 'should return a key if the element has a key');

    //
    // setKeyAttributeName
    //

    function init2() {
      if (container) {
          document.body.removeChild(container);
          IncrementalDOM.setKeyAttributeName('key'); // Default.
      }
      container = document.createElement('div');
      keyedEl = document.createElement('div');
      keyedEl.setAttribute('key', 'foo');
      keyedEl.setAttribute('secondaryKey', 'bar');
      container.appendChild(keyedEl);
      document.body.appendChild(container);

    }

    init2();

    IncrementalDOM.patch(container, () => { IncrementalDOM.elementVoid('div', 'baz'); });
    assert.equal(IncrementalDOM.getKey(keyedEl), 'foo', 'should use the default `key` attribute as the source-of-truth key (1)');
    // The original keyedEl should have been removed and replaced by a new
    // element, since keyedEl did not have a matching key.
    assert.notEqual(container.firstChild, keyedEl, 'should use the default `key` attribute as the source-of-truth key (2)');

    init2();

    IncrementalDOM.setKeyAttributeName('secondaryKey');
    IncrementalDOM.patch(container, () => { IncrementalDOM.elementVoid('div', 'baz'); });
    assert.equal(IncrementalDOM.getKey(keyedEl), 'bar', 'should use the `secondaryKey` attribute if keyAttributeName is set to `secondaryKey` (1)');
    // The original keyedEl should have been removed and replaced by a new
    // element, since keyedEl did not have a matching key.
    assert.notEqual(container.firstChild, keyedEl, 'should use the `secondaryKey` attribute if keyAttributeName is set to `secondaryKey` (2)');

    init2();

    IncrementalDOM.setKeyAttributeName(null);
    IncrementalDOM.patch(container, () => { IncrementalDOM.elementVoid('div', 'baz'); });
    assert.equal(IncrementalDOM.getKey(keyedEl), 'baz', 'should use the given key if `keyAttributeName` is set to null (1)');
    assert.equal(container.firstChild, keyedEl, 'should use the given key if `keyAttributeName` is set to null (2)');

});
