/**
 * Copyright 2017-2023 The Cotonic Authors. All Rights Reserved.
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

// TODO: Import incrementalDOM... 
const idom = IncrementalDOM;

import { tokens as getTokens } from "./cotonic.tokenizer.js";

const SKIP_TAG = "cotonic-idom-skip";
const FRAME_TAG = "cotonic-idom-iframe";

const RENDER_OPS = {
    text: textNode,
    open: openNode,
    void: voidNode,
    close: closeNode
}

function render(tokens) {
    while(tokens.length > 0) {
        const token = tokens.shift();
        RENDER_OPS[token.type]?.(token, tokens);

        // This happens when we reached the end of the document of an iframe.
        if(idom.currentElement().nodeType === Node.DOCUMENT_NODE) {
            skipTextNodes(tokens);
            break;
        }
    }
}

function textNode(token) {
    idom.text(token.data);
}

function openNode(token, tokens) {
    if(token.tag === FRAME_TAG) {
        // Insert an iframe, and continue rendering the rest tokens from this point.
        idom.elementOpen.apply(null,  ["iframe", token?.key, null].concat(token.attributes));

        const frameDoc = idom.currentElement().contentDocument;

        // When the frame is uninitialized and new, there is no doctype, or it is not
        // initialized. Write the html5 doctype. After this, the frame is ready to be
        // updated.
        if(frameDoc.readyState === "uninitialized" || frameDoc.doctype === null) {
            frameDoc.open();
            frameDoc.write("<!DOCTYPE html>\n"); // We could make this configurable via the attributes.
            frameDoc.close();
        }

        // When rendered from a template, the tokens often include leading text nodes before the 
        // the first node reached. These nodes should be skipped.
        skipTextNodes(tokens);
        patchOuter(frameDoc.documentElement, tokens);

        return;
    }

    idom.elementOpen.apply(null,  [token.tag, token?.key, null].concat(token.attributes));
}

function skipTextNodes(tokens) {
    while(tokens.length > 0) {
        let t = tokens[0];
        if(t.type !== "text") break;
        tokens.shift();
    }
}

function closeNode(token) {
    const currentElement = idom.currentElement();
    const currentTag = currentElement?.tagName;
    let tag = token.tag;

    if(tag === FRAME_TAG) {
        tag = "iframe";
    }

    /*
     * Safety measure. If the tag of the current element does not match, doc
     * not close the element via IncrementalDOM
     */

    if (currentTag !== undefined && (currentTag.toLowerCase() !== tag.toLowerCase())) {
        return;
    }

    idom.elementClose(tag);
}

function voidNode(token) {
    if(token.tag === SKIP_TAG) {
        return skipNode(token);
    }

    idom.elementVoid.apply(null,  [token.tag, token?.key, null].concat(token.attributes));
}

function skipNode(token) {
    const currentPointer = idom.currentPointer();
    let id;

    for(let i = 0; i < token.attributes.length; i=i+2) {
        if(token.attributes[i] === "id") {
            id = token.attributes[i+1];
            break;
        }
    }

    if(!id) {
        throw(`No id attribute found in ${ SKIP_TAG }`);
    }

    if(!currentPointer || currentPointer.id !== id) {
        let tag = "div", attributes = [];

        for(let i = 0; i < token.attributes.length; i=i+2) {
            if(token.attributes[i] === "tag") {
                tag = token.attributes[i+1];
            } else {
                attributes.push(token.attributes[i]);
                attributes.push(token.attributes[i+1]);
            }
        }

        return idom.elementVoid.apply(null,  [tag, token?.key, null].concat(attributes));
    }

    idom.skipNode();
}

function patch(patch, element, HTMLorTokens) {
    let tokens;

    if(Array.isArray(HTMLorTokens)) {
        tokens = HTMLorTokens;
    } else {
        tokens = getTokens(HTMLorTokens);
    }

    patch(element, render.bind(null, tokens));
}

const patchInner = patch.bind(null, idom.patch);
const patchOuter = patch.bind(null, idom.patchOuter);

export { patchInner, patchOuter };
