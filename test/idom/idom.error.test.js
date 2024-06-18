//
// IncrementalDOM - Error test
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

QUnit.test("IncrementalDOM - Error", function(assert) {
    let container = undefined;
    let el;
    let attributes;

    function init() {
        if (container) {
            document.body.removeChild(container);
        }
        container = document.createElement('div');
        document.body.appendChild(container);
    };

    //
    // Errors while rendering
    //

    init();

    function patchWithUnclosedElement() {
        assert.throws(
            () => {
                IncrementalDOM.patch(IncrementalDOM.currentElement(), () => {
                    IncrementalDOM.elementOpen('div');
                    throw new Error('Never closed element!');
                });
            },
            Error("Never closed element!"),
            "Never closed element");
    }


    IncrementalDOM.patch(container, () => {
        IncrementalDOM.elementOpen('div');

        IncrementalDOM.elementOpen('div');
        patchWithUnclosedElement();
        IncrementalDOM.elementClose('div');

        IncrementalDOM.elementVoid('div');
        IncrementalDOM.elementClose('div');
    });
    el = container.children[0];
    assert.equal(el.children.length, 2, 'should continue patching');

    init();

    IncrementalDOM.patch(container, () => {
        IncrementalDOM.elementOpen('div');

        IncrementalDOM.elementOpen('div');
        patchWithUnclosedElement();
        IncrementalDOM.elementClose('div');

        IncrementalDOM.elementVoid('span');
        IncrementalDOM.elementClose('div');
    });

    el = container.children[0];
    assert.equal(el.children.length, 2, 'should restore state while an element is open (1)');
    assert.equal(el.children[1].tagName, 'SPAN', 'should restore state while an element is open (2)');

    init();

    IncrementalDOM.patch(container, () => {
        const otherContainer = document.createElement('div');

        IncrementalDOM.elementOpenStart('div');
        IncrementalDOM.attr('parrentAttrOne', 'parrentAttrValOne');

        assert.throws(
            () => {
                IncrementalDOM.patch(otherContainer, () => {
                    IncrementalDOM.elementOpenStart('div');
                    IncrementalDOM.attr('childAttr', 'childAttrVal');
                    throw new Error();
                });
            },
            Error(),
            'should throw');

        IncrementalDOM.attr('parrentAttrTwo', 'parrentAttrValTwo');
        IncrementalDOM.elementOpenEnd();

        IncrementalDOM.elementClose('div');
    });

    attributes = container.children[0].attributes;
    assert.equal(attributes.length, 2, 'should restore state while calling elementOpenStart (1)');
    assert.equal(attributes['parrentAttrOne'].value, 'parrentAttrValOne', 'should restore state while calling elementOpenStart (2)');
    assert.equal(attributes['parrentAttrTwo'].value, 'parrentAttrValTwo', 'should restore state while calling elementOpenStart (3)');

    init();

    assert.throws(
        () => {
            IncrementalDOM.patch(container, () => {
                IncrementalDOM.elementVoid('div');
                IncrementalDOM.elementOpen('div');
                IncrementalDOM.elementOpen('div');
                throw new Error();
            });
        },
        Error(),
        "expect throw");

    el = container.children[1];
    assert.equal(container.children.length, 2, 'should render any partial elements (1)');
    assert.equal(el.children.length, 1, 'should render any partial elements (2)');
});


