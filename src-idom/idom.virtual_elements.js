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

import {
  assert,
  assertCloseMatchesOpenTag,
  assertInAttributes,
  assertInPatch,
  assertNotInAttributes,
  assertNotInSkip,
  setInAttributes
} from "./idom.assertions.js";
import { attributes, updateAttribute } from "./idom.attributes.js";
import {
  getArgsBuilder,
  getAttrsBuilder,
  close,
  open,
  text,
  currentElement
} from "./idom.core.js";
import { getData } from "./idom.node_data.js";
import { createMap, truncateArray } from "./idom.util.js";
import { calculateDiff } from "./idom.diff.js";


/**
 * The offset in the virtual element declaration where the attributes are
 * specified.
 */
const ATTRIBUTES_OFFSET = 3;

/**
 * Used to keep track of the previous values when a 2-way diff is necessary.
 * This object is reused.
 * TODO(sparhamI) Scope this to a patch so you can call patch from an attribute
 * update.
 */
const prevAttrsMap = createMap();

/**
 * @param element The Element to diff the attrs for.
 * @param data The NodeData associated with the Element.
 */
function diffAttrs(element, data) {
    const attrsBuilder = getAttrsBuilder();
    const prevAttrsArr = data.getAttrsArr(attrsBuilder.length);
    calculateDiff(prevAttrsArr, attrsBuilder, element, updateAttribute,
                  data.alwaysDiffAttributes);
    truncateArray(attrsBuilder, 0);
}

/**
 * Applies the statics. When importing an Element, any existing attributes that
 * match a static are converted into a static attribute.
 * @param node The Element to apply statics for.
 * @param data The NodeData associated with the Element.
 * @param statics The statics array.
 */
function diffStatics(node, data, statics) {
    if (data.staticsApplied) {
        return;
    }
    data.staticsApplied = true;
    if (!statics || !statics.length) {
        return;
    }
    if (data.hasEmptyAttrsArr()) {
        for (let i = 0; i < statics.length; i += 2) {
            updateAttribute(node, statics[i], statics[i + 1]);
        }
        return;
    }
    for (let i = 0; i < statics.length; i += 2) {
        prevAttrsMap[statics[i]] = i + 1;
    }
    const attrsArr = data.getAttrsArr(0);
    let j = 0;
    for (let i = 0; i < attrsArr.length; i += 2) {
        const name = attrsArr[i];
        const value = attrsArr[i + 1];
        const staticsIndex = prevAttrsMap[name];
        if (staticsIndex) {
            // For any attrs that are static and have the same value, make sure we do
            // not set them again.
            if (statics[staticsIndex] === value) {
                delete prevAttrsMap[name];
            }
            continue;
        }
        // For any attrs that are dynamic, move them up to the right place.
        attrsArr[j] = name;
        attrsArr[j + 1] = value;
        j += 2;
    }
    // Anything after `j` was either moved up already or static.
    truncateArray(attrsArr, j);
    for (const name in prevAttrsMap) {
        updateAttribute(node, name, statics[prevAttrsMap[name]]);
        delete prevAttrsMap[name];
    }
}

/**
 * Declares a virtual Element at the current location in the document. This
 * corresponds to an opening tag and a elementClose tag is required. This is
 * like elementOpen, but the attributes are defined using the attr function
 * rather than being passed as arguments. Must be folllowed by 0 or more calls
 * to attr, then a call to elementOpenEnd.
 * @param nameOrCtor The Element's tag or constructor.
 * @param key The key used to identify this element. This can be an
 *     empty string, but performance may be better if a unique value is used
 *     when iterating over an array of items.
 * @param statics An array of attribute name/value pairs of the static
 *     attributes for the Element. Attributes will only be set once when the
 *     Element is created.
 */
function elementOpenStart(nameOrCtor, key, statics) {
    const argsBuilder = getArgsBuilder();
    {
        assertNotInAttributes("elementOpenStart");
        setInAttributes(true);
    }
    argsBuilder[0] = nameOrCtor;
    argsBuilder[1] = key;
    argsBuilder[2] = statics;
}

/**
 * Allows you to define a key after an elementOpenStart. This is useful in
 * templates that define key after an element has been opened ie
 * `<div key('foo')></div>`.
 * @param key The key to use for the next call.
 */
function key(key) {
    const argsBuilder = getArgsBuilder();
    {
        assertInAttributes("key");
        assert(argsBuilder);
    }
    argsBuilder[1] = key;
}

/**
 * Buffers an attribute, which will get applied during the next call to
 * `elementOpen`, `elementOpenEnd` or `applyAttrs`.
 * @param name The of the attribute to buffer.
 * @param value The value of the attribute to buffer.
 */
function attr(name, value) {
    const attrsBuilder = getAttrsBuilder();
    {
        assertInPatch("attr");
    }
    attrsBuilder.push(name);
    attrsBuilder.push(value);
}

/**
 * Closes an open tag started with elementOpenStart.
 * @return The corresponding Element.
 */
function elementOpenEnd() {
    const argsBuilder = getArgsBuilder();
    {
        assertInAttributes("elementOpenEnd");
        setInAttributes(false);
    }
    const node = open(argsBuilder[0], argsBuilder[1], getNonce());
    const data = getData(node);
    diffStatics(node, data, argsBuilder[2]);
    diffAttrs(node, data);
    truncateArray(argsBuilder, 0);
    return node;
}

/** Gets the value of the nonce attribute. */
function getNonce() {
    const argsBuilder = getArgsBuilder();
    const statics = argsBuilder[2];
    if (statics) {
        for (let i = 0; i < statics.length; i += 2) {
            if (statics[i] === 'nonce') {
                return statics[i + 1];
            }
        }
    }
    return '';
}

/**
 * @param  nameOrCtor The Element's tag or constructor.
 * @param  key The key used to identify this element. This can be an
 *     empty string, but performance may be better if a unique value is used
 *     when iterating over an array of items.
 * @param statics An array of attribute name/value pairs of the static
 *     attributes for the Element. Attributes will only be set once when the
 *     Element is created.
 * @param varArgs, Attribute name/value pairs of the dynamic attributes
 *     for the Element.
 * @return The corresponding Element.
 */
function elementOpen(nameOrCtor, key, 
// Ideally we could tag statics and varArgs as an array where every odd
// element is a string and every even element is any, but this is hard.
statics, ...varArgs) {
    {
        assertNotInAttributes("elementOpen");
        assertNotInSkip("elementOpen");
    }
    elementOpenStart(nameOrCtor, key, statics);
    for (let i = ATTRIBUTES_OFFSET; i < arguments.length; i += 2) {
        attr(arguments[i], arguments[i + 1]);
    }
    return elementOpenEnd();
}

/**
 * Applies the currently buffered attrs to the currently open element. This
 * clears the buffered attributes.
 */
function applyAttrs() {
    const node = currentElement();
    const data = getData(node);
    diffAttrs(node, data);
}

/**
 * Applies the current static attributes to the currently open element. Note:
 * statics should be applied before calling `applyAtrs`.
 * @param statics The statics to apply to the current element.
 */
function applyStatics(statics) {
    const node = currentElement();
    const data = getData(node);
    diffStatics(node, data, statics);
}

/**
 * Closes an open virtual Element.
 *
 * @param nameOrCtor The Element's tag or constructor.
 * @return The corresponding Element.
 */
function elementClose(nameOrCtor) {
    {
        assertNotInAttributes("elementClose");
    }
    const node = close();
    {
        assertCloseMatchesOpenTag(getData(node).nameOrCtor, nameOrCtor);
    }
    return node;
}

/**
 * Declares a virtual Element at the current location in the document that has
 * no children.
 * @param nameOrCtor The Element's tag or constructor.
 * @param key The key used to identify this element. This can be an
 *     empty string, but performance may be better if a unique value is used
 *     when iterating over an array of items.
 * @param statics An array of attribute name/value pairs of the static
 *     attributes for the Element. Attributes will only be set once when the
 *     Element is created.
 * @param varArgs Attribute name/value pairs of the dynamic attributes
 *     for the Element.
 * @return The corresponding Element.
 */
function elementVoid(nameOrCtor, key, 
// Ideally we could tag statics and varArgs as an array where every odd
// element is a string and every even element is any, but this is hard.
statics, ...varArgs) {
    elementOpen.apply(null, arguments);
    return elementClose(nameOrCtor);
}

/**
 * Declares a virtual Text at this point in the document.
 *
 * @param value The value of the Text.
 * @param varArgs
 *     Functions to format the value which are called only when the value has
 *     changed.
 * @return The corresponding text node.
 */
function text$1(value, ...varArgs) {
    {
        assertNotInAttributes("text");
        assertNotInSkip("text");
    }
    const node = text();
    const data = getData(node);
    if (data.text !== value) {
        data.text = value;
        let formatted = value;
        for (let i = 1; i < arguments.length; i += 1) {
            /*
             * Call the formatter function directly to prevent leaking arguments.
             * https://github.com/google/incremental-dom/pull/204#issuecomment-178223574
             */
            const fn = arguments[i];
            formatted = fn(formatted);
        }
        // Setting node.data resets the cursor in IE/Edge.
        if (node.data !== formatted) {
            node.data = formatted;
        }
    }
    return node;
}

export {
    applyAttrs,
    applyStatics,
    elementOpenStart,
    elementOpenEnd,
    elementOpen,
    elementVoid,
    elementClose,
    text$1,
    attr,
    key
};

