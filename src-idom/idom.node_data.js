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

import { assert } from "./idom.assertions.js";
import { createArray } from "./idom.util.js";
import { isElement } from "./idom.dom_util.js";
import { getKeyAttributeName } from "./idom.global.js";


/**
 * Keeps track of information needed to perform diffs for a given DOM node.
 */
class NodeData {
    constructor(nameOrCtor, key, text) {
        /**
         * An array of attribute name/value pairs, used for quickly diffing the
         * incomming attributes to see if the DOM node's attributes need to be
         * updated.
         */
        this._attrsArr = null;
        /**
         * Whether or not the statics have been applied for the node yet.
         */
        this.staticsApplied = false;
        this.nameOrCtor = nameOrCtor;
        this.key = key;
        this.text = text;
    }
    hasEmptyAttrsArr() {
        const attrs = this._attrsArr;
        return !attrs || !attrs.length;
    }
    getAttrsArr(length) {
        return this._attrsArr || (this._attrsArr = createArray(length));
    }
}
/**
 * Initializes a NodeData object for a Node.
 * @param node The Node to initialized data for.
 * @param nameOrCtor The NameOrCtorDef to use when diffing.
 * @param key The Key for the Node.
 * @param text The data of a Text node, if importing a Text node.
 * @returns A NodeData object with the existing attributes initialized.
 */
function initData(node, nameOrCtor, key, text) {
    const data = new NodeData(nameOrCtor, key, text);
    node["__incrementalDOMData"] = data;
    return data;
}
/**
 * @param node The node to check.
 * @returns True if the NodeData already exists, false otherwise.
 */
function isDataInitialized(node) {
    return Boolean(node["__incrementalDOMData"]);
}
/**
 * Records the element's attributes.
 * @param node The Element that may have attributes
 * @param data The Element's data
 */
function recordAttributes(node, data) {
    const attributes = node.attributes;
    const length = attributes.length;
    if (!length) {
        return;
    }
    const attrsArr = data.getAttrsArr(length);
    // Use a cached length. The attributes array is really a live NamedNodeMap,
    // which exists as a DOM "Host Object" (probably as C++ code). This makes the
    // usual constant length iteration very difficult to optimize in JITs.
    for (let i = 0, j = 0; i < length; i += 1, j += 2) {
        const attr = attributes[i];
        const name = attr.name;
        const value = attr.value;
        attrsArr[j] = name;
        attrsArr[j + 1] = value;
    }
}
/**
 * Imports single node and its subtree, initializing caches, if it has not
 * already been imported.
 * @param node The node to import.
 * @param fallbackKey A key to use if importing and no key was specified.
 *    Useful when not transmitting keys from serverside render and doing an
 *    immediate no-op diff.
 * @returns The NodeData for the node.
 */
function importSingleNode(node, fallbackKey) {
    if (node["__incrementalDOMData"]) {
        return node["__incrementalDOMData"];
    }
    const nodeName = isElement(node) ? node.localName : node.nodeName;
    const keyAttrName = getKeyAttributeName();
    const keyAttr = isElement(node) && keyAttrName != null
        ? node.getAttribute(keyAttrName)
        : null;
    const key = isElement(node) ? keyAttr || fallbackKey : null;
    const data = initData(node, nodeName, key);
    if (isElement(node)) {
        recordAttributes(node, data);
    }
    return data;
}
/**
 * Imports node and its subtree, initializing caches.
 * @param node The Node to import.
 */
function importNode(node) {
    importSingleNode(node);
    for (let child = node.firstChild; child; child = child.nextSibling) {
        importNode(child);
    }
}
/**
 * Retrieves the NodeData object for a Node, creating it if necessary.
 * @param node The node to get data for.
 * @param fallbackKey A key to use if importing and no key was specified.
 *    Useful when not transmitting keys from serverside render and doing an
 *    immediate no-op diff.
 * @returns The NodeData for the node.
 */
function getData(node, fallbackKey) {
    return importSingleNode(node, fallbackKey);
}
/**
 * Gets the key for a Node. note that the Node should have been imported
 * by now.
 * @param node The node to check.
 * @returns The key used to create the node.
 */
function getKey(node) {
    assert(node["__incrementalDOMData"]);
    return getData(node).key;
}
/**
 * Clears all caches from a node and all of its children.
 * @param node The Node to clear the cache for.
 */
function clearCache(node) {
    node["__incrementalDOMData"] = null;
    for (let child = node.firstChild; child; child = child.nextSibling) {
        clearCache(child);
    }
}


export { getData, getKey, initData, importNode, isDataInitialized, clearCache };

