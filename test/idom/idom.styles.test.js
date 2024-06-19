//
// IncrementalDOM - styles test
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

QUnit.test("IncrementalDOM - styles", function(assert) {
    let container = undefined;
    let el;

    function init() {
        if (container) {
            document.body.removeChild(container);
        }
        container = document.createElement('div');
        document.body.appendChild(container);
    };

    function browserSupportsCssCustomProperties() {
        const style = document.createElement('div').style;
        style.setProperty('--prop', 'value');
        return style.getPropertyValue('--prop') === 'value';
    }

    function render(style) {
        IncrementalDOM.elementVoid('div', null, null, 'style', style);
    }

    //
    // style updates
    //

    init();

    IncrementalDOM.patch(container, () => render({color: 'white', backgroundColor: 'red'}));
    el = container.childNodes[0];

    assert.equal(el.style.color, 'white', 'should render with the correct style properties for objects (1)');
    assert.equal(el.style.backgroundColor, 'red', 'should render with the correct style properties for objects (2)');

    if (browserSupportsCssCustomProperties()) {
        init();

        IncrementalDOM.patch(container, () => render({'--some-var': 'blue'}));
        el = container.childNodes[0];
        assert.equal(el.style.getPropertyValue('--some-var'), 'blue', 'should apply custom properties');
    }

    init();

    IncrementalDOM.patch(container, () => render({'background-color': 'red'}));
    el = container.childNodes[0];
    assert.equal(el.style.backgroundColor, 'red', 'should handle dashes in property names');

    init();

    IncrementalDOM.patch(container, () => render({color: 'white'}));
    IncrementalDOM.patch(container, () => render({color: 'red'}));
    el = container.childNodes[0];
    assert.equal(el.style.color, 'red', 'should update the correct style properties');

    init();

    IncrementalDOM.patch(container, () => render({color: 'white'}));
    IncrementalDOM.patch(container, () => render({backgroundColor: 'red'}));
    el = container.childNodes[0];
    assert.equal(el.style.color, '', 'should remove properties not present in the new object (1)');
    assert.equal(el.style.backgroundColor, 'red', 'should remove properties not present in the new object (2)');

    init();

    IncrementalDOM.patch(container, () => render('color: white; background-color: red;'));
    el = container.childNodes[0];
    assert.equal(el.style.color, 'white', 'should render with the correct style properties for strings (1)');
    assert.equal(el.style.backgroundColor, 'red', 'should render with the correct style properties for strings (2)');

});
