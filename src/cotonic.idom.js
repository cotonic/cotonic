/**
 * Copyright 2017 The Cotonic Authors. All Rights Reserved.
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

"use strict";
var cotonic = cotonic || {};

(function(cotonic, idom) {
    function render(tokens) {
        function renderToken(token) {
            if(token.type == "text") {
                return idom.text(token.data);
            }

            if(token.type == "close") {
                var currentTag = idom.currentElement().tagName;

                /* Safety measure. If the tag of the current element does not match, doc
                 * not close the element via IncrementalDOM
                 */
                if (currentTag.toLowerCase() != token.tag.toLowerCase()) {
                    return;
                }

                return idom.elementClose(token.tag);
            }

            if(token.type == "void") {
                return idom.elementVoid.apply(null,  [token.tag, null, null].concat(token.attributes))
            }

            if(token.type == "open") {
                return idom.elementOpen.apply(null,  [token.tag, null, null].concat(token.attributes))
            }
        }

        for(var i=0; i<tokens.length; i++) {
            renderToken(tokens[i]);
        }
    }

    function patch(patch, element, HTMLorTokens) {
        var tokens;

        if(Array.isArray(HTMLorTokens)) {
            tokens = HTMLorTokens;
        } else {
            tokens = cotonic.tokenizer.tokens(HTMLorTokens);
        }

        patch(element, function() { render(tokens); });
    }

    cotonic.idom = cotonic.idom || {};

    cotonic.idom.patchInner = patch.bind(this, idom.patch);
    cotonic.idom.patchOuter = patch.bind(this, idom.patchOuter);
}(cotonic, IncrementalDOM));