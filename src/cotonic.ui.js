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

(function(cotonic) {
    var state = {};
    var order = [];

    /**
     * insert element to the prioritized patch list.
     */
    function insert(id, inner, initialData, priority) {
        state[id] = {id: id, inner: inner, data: initialData};
        insertSorted(order, {id: id, priority: priority}, function(a, b) { return a.priority <  b.priority})
    }

    function insertSorted(arr, item, compare) {
        // get the index we need to insert the item at
        var min = 0;
        var max = arr.length;
        var index = Math.floor((min + max) / 2);

        while (max > min) {
            if (compare(item, arr[index]) < 0) {
                max = index;
            } else {
                min = index + 1;
            }
            index = Math.floor((min + max) / 2);
        }

        // insert the item
        arr.splice(index, 0, item);
    };

    /**
     * Remove element from the patch list
     */
    function remove(id) {
        var i;

        delete state[id];
        
        for(i = 0; i < order.length; i++) {
            if(order.id != id) {
                continue;
            }

            delete order[i];
        }
    }

    function update(id, htmlOrTokens) {
        var currentState = state[id];

        if(!currentState) {
            return;
        }

        currentState.data = htmlOrTokens;
    }

    function renderId(id) {
        var elt;

        /* Lookup the element we want to update */
        elt = document.getElementById(id);
        if(elt == undefined)  {
            /* It is not here, maybe it is the next time around */
            return;
        }

        renderElement(elt, id);
    }

    function renderElement(elt, id) {
        var s = state[id];

        if(s == undefined || s.data == undefined) {
            /* The element is not here anymore or does not have data yet */
            return;
        }

        /* Patch the element */
        if(s.inner) {
            cotonic.idom.patchInner(elt, s.data);
        } else {
            cotonic.idom.patchOuter(elt, s.data);
        }
    }

    function render() {
        var i;

        for(i = 0; i < order.length; i++) {
            renderId(order[i].id);
        }
    }
    
    cotonic.ui = cotonic.ui || {};

    cotonic.ui.insert = insert;
    cotonic.ui.update = update;
    cotonic.ui.remove = remove;
    cotonic.ui.render = render;
    cotonic.ui.renderId = renderId;
}(cotonic));