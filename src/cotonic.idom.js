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

function render(tokens) {
    function renderToken(token) {
        switch(token.type) {
            case "text":
                return idom.text(token.data);
            case "open":
                return idom.elementOpen.apply(null,  [token.tag, token.hasOwnProperty("key")?token.key:null, null].concat(token.attributes));
            case "void":
                return voidNode(token);
            case "close":
                return closeNode(token);
        }
    }

    for(let i=0; i < tokens.length; i++) {
        renderToken(tokens[i]);
    }
}

function closeNode(token) {
    const currentTag = idom.currentElement().tagName;

    /* Safety measure. If the tag of the current element does not match, doc
     * not close the element via IncrementalDOM
     */
    if (currentTag.toLowerCase() != token.tag.toLowerCase()) {
        return;
    }

    return idom.elementClose(token.tag);
}

function voidNode(token) {
    if(token.tag === "cotonic-idom-skip") {
        return skipNode(token);
    }

    return idom.elementVoid.apply(null,  [token.tag, token.hasOwnProperty("key")?token.key:null, null].concat(token.attributes));
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
        throw("No id attribute found in cotonic-idom-skip node");
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

        return idom.elementVoid.apply(null,  [tag, token.hasOwnProperty("key")?token.key:null, null].concat(attributes));
    } 

    idom.skipNode();
}

function patch(patch, element, HTMLorTokens) {
    let tokens;

    if(Array.isArray(HTMLorTokens)) {
        tokens = HTMLorTokens;
    } else {
        tokens = cotonic.tokenizer.tokens(HTMLorTokens);
    }

    patch(element, function() { render(tokens); });
}

const patchInner = patch.bind(this, idom.patch);
const patchOuter = patch.bind(this, idom.patchOuter);

export { patchInner, patchOuter };
