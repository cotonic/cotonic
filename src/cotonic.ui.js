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
    const state = {};
    const order = [];

    const stateData = {};
    const stateClass = {};

    var dirty = false;

    /**
     * insert element to the prioritized patch list.
     */
    function insert(id, inner, initialData, priority) {
        state[id] = {
            id: id,
            inner: inner,
            data: initialData,
            dirty: true
        };

        insertSorted(order,
            {id: id, priority: priority},
            function(a, b) {
                return a.priority < b.priority
            });
    }

    function get(id) {
        return state[id];
    }

    function insertSorted(arr, item, compare) {
        // get the index we need to insert the item at
        let min = 0;
        let max = arr.length;
        let index = Math.floor((min + max) / 2);

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

        dirty = true;
    };

    /**
     * Get the representation of an element. 
     */
    function retrieve(id) {
        return state[id];
    }

    /**
     * Remove element from the patch list.
     */
    function remove(id) {
        delete state[id];

        for(let i = 0; i < order.length; i++) {
            if(order.id != id) {
                continue;
            }

            delete order[i];
        }
    }

    /**
     * Update representation of `id`  
     */
    function update(id, htmlOrTokens) {
        let currentState = state[id];

        if(!currentState) {
            return;
        }

        currentState.data = htmlOrTokens;
        currentState.dirty = true;
        dirty = true;
    }

    function renderId(id) {
        /* Lookup the element we want to update */
        const elt = document.getElementById(id);

        if(elt === undefined)  {
            /* It is not here, maybe it is the next time around */
            return;
        }

        renderElement(elt, id);
    }

    function renderElement(elt, id) {
        const s = state[id];

        if(s === undefined || s.data === undefined || s.dirty === false) {
            /* The element is not here anymore or does not have data yet */
            return;
        }

        /* Patch the element */
        if(s.inner) {
            cotonic.idom.patchInner(elt, s.data);
        } else {
            cotonic.idom.patchOuter(elt, s.data);
        }
        s.dirty = false;
    }

    function render() {
        for(let i = 0; i < order.length; i++) {
            renderId(order[i].id);
        }
        dirty = false;
    }

    function on(topic, msg, event, options) {
        options = options || {};
        const payload = {
            message: msg,
            event: event ? cloneableEvent(event) : undefined,
            value: event ? eventTargetValue(event) : undefined,
            data: event ? eventDataAttributes(event) : undefined
        };
        const pubopts = {
            qos: typeof(options.qos) == 'number' ? options.qos : 0
        };

        // console.log("ui.on", topic, payload);
        cotonic.broker.publish(topic, payload, pubopts);

        if (typeof event.type == 'string') {
            switch (options.cancel) {
                case false:
                    break;
                case 'preventDefault':
                    if (event.cancelable) {
                        event.preventDefault();
                    }
                    break;
                case true:
                default:
                    if (event.cancelable) {
                        event.preventDefault();
                    }
                    event.stopPropagation();
                    break;
            }
        }
        return false;
    }

    function cloneableEvent(e) {
        return {
            eventName: e.constructor.name,
            altKey: e.altKey,
            bubbles: e.bubbles,
            button: e.button,
            buttons: e.buttons,
            cancelBubble: e.cancelBubble,
            cancelable: e.cancelable,
            clientX: e.clientX,
            clientY: e.clientY,
            composed: e.composed,
            ctrlKey: e.ctrlKey,
            currentTargetId: e.currentTarget ? e.currentTarget.id : null,
            defaultPrevented: e.defaultPrevented,
            detail: e.detail,
            eventPhase: e.eventPhase,
            fromElementId: e.fromElement ? e.fromElement.id : null,
            isTrusted: e.isTrusted,
            keyCode: window.event ? e.keyCode : e.which,
            layerX: e.layerX,
            layerY: e.layerY,
            metaKey: e.metaKey,
            movementX: e.movementX,
            movementY: e.movementY,
            offsetX: e.offsetX,
            offsetY: e.offsetY,
            pageX: e.pageX,
            pageY: e.pageY,
            // path: pathToSelector(e.path && e.path.length ? e.path[0] : null),
            relatedTargetId: e.relatedTarget ? e.relatedTarget.id : null,
            returnValue: e.returnValue,
            screenX: e.screenX,
            screenY: e.screenY,
            shiftKey: e.shiftKey,
            // sourceCapabilities: e.sourceCapabilities ? e.sourceCapabilities.toString() : null,
            targetId: e.target ? e.target.id : null,
            timeStamp: e.timeStamp,
            toElementId: e.toElement ? e.toElement.id : null,
            type: e.type,
            // view: e.view ? e.view.toString() : null,
            which: e.which,
            x: e.x,
            y: e.y
        };
    }

    function eventDataAttributes(event) {
        const d = {};

        if(!event.target)
            return d;

        if(event.target.hasOwnProperty("attributes")) {
            const attrs = event.target.attributes;

            for (let i=0; i < attrs.length; i++) {
                if (attrs[i].name.startsWith("data-")) {
                    d[attrs[i].name.substr(5)] = attrs[i].value;
                }
            }
        }

        return d;
    }

    function eventTargetValue(event) {
        if (event.target && !event.target.disabled) {
            const elt = event.target;
            switch (event.target.nodeName) {
                case 'FORM':
                    return serializeForm(elt);
                case 'INPUT':
                case 'SELECT':
                    if (elt.type == 'select-multiple') {
                        const l = elt.options.length;
                        const v = [];
                        for (let j=0; j<l; j++) {
                            if(field.options[j].selected) {
                                v[v.length] = elt.options[j].value;
                            }
                        }
                        return v;
                    } else if (elt.type == 'checkbox' || elt.type == 'radio') {
                        if (elt.checked) {
                            return elt.value;
                        } else {
                            return false;
                        }
                    } else {
                        return elt.value;
                    }
                case 'TEXTAREA':
                    return elt.value;
                default:
                    return undefined;
            }
        } else {
            return undefined;
        }
    }

    // From https://plainjs.com/javascript/ajax/serialize-form-data-into-an-array-46/
    function serializeForm(form) {
        let field, l, v, s = {};
        if (typeof form == 'object' && form.nodeName == "FORM") {
            const len = form.elements.length;
            for (let i=0; i<len; i++) {
                field = form.elements[i];
                if (   field.name
                    && !field.disabled
                    && field.type != 'file'
                    && field.type != 'reset'
                    && field.type != 'submit'
                    && field.type != 'button')
                {
                    if (field.type == 'select-multiple') {
                        v = [];
                        l = form.elements[i].options.length;
                        for (j=0; j<l; j++) {
                            if(field.options[j].selected) {
                                v[v.length] = field.options[j].value;
                            }
                        }
                        s[field.name] = v;
                    } else if ((field.type != 'checkbox' && field.type != 'radio') || field.checked) {
                        s[field.name] = field.value;
                    }
                }
            }
        }
        return s;
    }

    /**
     * Manage the model state and classes
     */

    function updateStateData( model, states ) {
        stateData[model] = states;
        syncStateData();
    }

    function updateStateClass( model, classes ) {
        stateClass[model] = classes;
        syncStateClass();
    }

    // Synchronize all the model classes with the ui-state- classes
    function syncStateClass() {
        let attr = document.body.parentElement.getAttribute("class") || "";
        let classes = attr.split(/\s+/);
        let keep = [];
        var i, j;

        for (i = classes.length - 1; i >= 0; i--) {
            if (!classes[i].startsWith("ui-state-")) {
                keep.push(classes[i]);
            }
        }
        let ms = Object.keys(stateClass);
        for (i = ms.length - 1; i >= 0; i--) {
            let m = ms[i];
            for (j = stateClass[m].length - 1; j >= 0; j--) {
                keep.push("ui-state-" + m + "-" + stateClass[m][j]);
            }
        }
        let new_attr = keep.sort().join(" ");
        if (new_attr != attr) {
            document.body.parentElement.setAttribute("class", new_attr);
        }
    }

    // Synchronize the model status data with the 'data-ui-state-' attributes
    function syncStateData() {
        let root = document.body.parentElement;
        var current = {};
        var attrs = {};
        var i, j;
        var ks;

        if (root.hasAttributes()) {
            var rs = root.attributes;
            for (i = rs.length-1; i >= 0; i--) {
                if (rs[i].name.startsWith("data-ui-state-")) {
                    current[rs[i].name] = rs[i].value;
                }
            }
        }
        let ms = Object.keys(stateData);
        for (i = ms.length - 1; i >= 0; i--) {
            let m = ms[i];
            let ks = Object.keys(stateData[m]);
            for (j = ks.length - 1; j >= 0; j--) {
                attrs["data-ui-state-" + m + "-" + ks[j]] = stateData[m][ks[j]];
            }
        }

        // Remove all attributes in current and not in attrs
        ks = Object.keys(current);
        for (i = ks.length-1; i >= 0; i--) {
            if (! (ks[i] in attrs)) {
                root.removeAttribute(ks[i]);
            }
        }

        // Add all new or changed attributes
        ks = Object.keys(attrs);
        for (i = ks.length-1; i >= 0; i--) {
            var k = ks[i];
            if (!(k in current) || attrs[k] != current[k]) {
                root.setAttribute(k, attrs[k]);
            }
        }
    }

    function renderLoop(){
        if (dirty) {
            render();
        }
        window.requestAnimationFrame(renderLoop);
    }
    renderLoop();

    cotonic.ui = cotonic.ui || {};

    cotonic.ui.insert = insert;
    cotonic.ui.get = get;
    cotonic.ui.update = update;
    cotonic.ui.remove = remove;
    cotonic.ui.render = render;
    cotonic.ui.renderId = renderId;
    cotonic.ui.updateStateData = updateStateData;
    cotonic.ui.updateStateClass = updateStateClass;
    cotonic.ui.on = on;
}(cotonic));
