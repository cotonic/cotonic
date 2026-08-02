/**
 * Copyright 2017-2026 The Cotonic Authors. All Rights Reserved.
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

function render(tokens) {
    let preserveSkipLevel = 0;

    function renderToken(token) {
        switch(token.type) {
            case "text":
                if(preserveSkipLevel === 0) {
                    idom.text(token.data);
                }

                break;
            case "open":
                if(preserveSkipLevel === 0) {
                    const shouldPreserve = hasPreserveAttribute(token) && hasPreserveAttribute(idom.currentPointer());

                    idom.elementOpen.apply(null,
                        [token.tag, token.hasOwnProperty("key")?token.key:null, null].concat(token.attributes));

                    if(shouldPreserve) {
                        preserveSkipLevel = 1;

                        while(idom.currentPointer()) {
                            idom.skipNode();
                        }
                    }
                } else {
                    preserveSkipLevel++;
                }

                break;
            case "void":
                if(preserveSkipLevel === 0) {
                    idom.elementVoid.apply(null,
                        [token.tag, token.hasOwnProperty("key")?token.key:null, null].concat(token.attributes));
                } 

                break;
            case "close":
                if(preserveSkipLevel > 0) {
                    preserveSkipLevel--;
                }

                if(preserveSkipLevel === 0) {
                    closeNode(token);
                } 

                break;
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

function hasPreserveAttribute(nodeOrToken) {
    const preserveAttribute = "data-cotonic-preserve";

    if (typeof Node !== "undefined" && nodeOrToken?.nodeType === Node.ELEMENT_NODE) {
        return nodeOrToken.hasAttribute(preserveAttribute);
    }

    const attributes = nodeOrToken?.attributes;

    if (attributes) {
        for (let i = 0; i < attributes.length; i += 2) {
            if (attributes[i] === preserveAttribute) {
                return true;
            }
        }
    }

    return false;
}

function patch(patch, element, HTMLorTokens) {
    let tokens;

    if(Array.isArray(HTMLorTokens)) {
        tokens = HTMLorTokens;
    } else {
        tokens = getTokens(HTMLorTokens);
    }

    patch(element, () => { render(tokens); });
}

const patchInner = patch.bind(this, idom.patch);
const patchOuter = patch.bind(this, idom.patchOuter);

export { patchInner, patchOuter };
