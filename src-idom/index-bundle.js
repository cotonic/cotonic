/**
 * @preserve
 * Copyright 2024 The Cotonic Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */

/**
 * Copyright 2024 The Cotonic Authors. All Rights Reserved.
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

import * as idom_global from "./idom.global.js";
import * as idom_assertions from "./idom.assertions.js";
import * as idom_util from "./idom.util.js";
import * as idom_symbols from "./idom.symbols.js";
import * as idom_attributes from "./idom.attributes.js";
import * as idom_notifications from "./idom.notifications.js";
import * as idom_context from "./idom.context.js";
import * as idom_dom_util from "./idom.dom_util.js";
import * as idom_node_data from "./idom.node_data.js";
import * as idom_nodes from "./idom.nodes.js";
import * as idom_core from "./idom.core.js";
import * as idom_changes from "./idom.changes.js";
import * as idom_diff from "./idom.diff.js";
import * as idom_virtual_elements from "./idom.virtual_elements.js";

let IncrementalDOM = globalThis.IncrementalDOM || {};
if(!globalThis.IncrementalDOM) {
    globalThis.IncrementalDOM = IncrementalDOM;
}

IncrementalDOM.applyAttr = idom_attributes.applyAttr;
IncrementalDOM.applyProp = idom_attributes.applyProp;
IncrementalDOM.attributes = idom_attributes.attributes;
IncrementalDOM.alignWithDOM = idom_core.alignWithDOM;
IncrementalDOM.alwaysDiffAttributes = idom_core.alwaysDiffAttributes;
IncrementalDOM.close = idom_core.close;
IncrementalDOM.createPatchInner = idom_core.createPatchInner;
IncrementalDOM.createPatchOuter = idom_core.createPatchOuter;
IncrementalDOM.currentElement = idom_core.currentElement;
IncrementalDOM.currentContext = idom_core.currentContext;
IncrementalDOM.currentPointer = idom_core.currentPointer;
IncrementalDOM.open = idom_core.open;
IncrementalDOM.patch = idom_core.patchInner;
IncrementalDOM.patchInner = idom_core.patchInner;
IncrementalDOM.patchOuter = idom_core.patchOuter;
IncrementalDOM.skip = idom_core.skip;
IncrementalDOM.skipNode = idom_core.nextNode;
IncrementalDOM.tryGetCurrentElement = idom_core.tryGetCurrentElement;
IncrementalDOM.setKeyAttributeName = idom_global.setKeyAttributeName;
IncrementalDOM.clearCache = idom_node_data.clearCache;
IncrementalDOM.getKey = idom_node_data.getKey;
IncrementalDOM.importNode = idom_node_data.importNode;
IncrementalDOM.isDataInitialized = idom_node_data.isDataInitialized;
IncrementalDOM.notifications = idom_notifications.notifications;
IncrementalDOM.symbols = idom_symbols.symbols;
IncrementalDOM.applyAttrs = idom_virtual_elements.applyAttrs;
IncrementalDOM.applyStatics = idom_virtual_elements.applyStatics;
IncrementalDOM.attr = idom_virtual_elements.attr;
IncrementalDOM.elementClose = idom_virtual_elements.elementClose;
IncrementalDOM.elementOpen = idom_virtual_elements.elementOpen;
IncrementalDOM.elementOpenEnd = idom_virtual_elements.elementOpenEnd;
IncrementalDOM.elementOpenStart = idom_virtual_elements.elementOpenStart;
IncrementalDOM.elementVoid = idom_virtual_elements.elementVoid;
IncrementalDOM.key = idom_virtual_elements.key;
IncrementalDOM.text = idom_virtual_elements.text$1;

