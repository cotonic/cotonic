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

import { patchOuter, patchInner } from "./cotonic.idom.js";
import { publish, call } from "./cotonic.broker.js";

const state = {};
const order = [];

const stateData = {};
const stateClass = {};

let animationFrameRequestId;

/**
 * insert element to the prioritized patch list.
 */
function insert(id, mode, initialData, priority) {
    if(mode === true) {
        mode = "inner";
    } else if(mode === false) {
        mode = "outer";
    }

    state[id] = {
        id: id,
        mode: mode ?? "inner",
        data: initialData,
        dirty: true
    };

    insertSorted(order,
        {id: id, priority: priority},
        function(a, b) {
            return a.priority < b.priority;
        });

    publish("model/ui/event/insert/" + id, initialData);
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

    requestRender();
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

    publish("model/ui/event/delete/" + id, undefined);
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

    requestRender();
}

/**
 * Replace the element with the new representation.
 * This is a one-time actions, no state should be
 * retained after this update.
 */
function replace(id, htmlOrTokens) {
    let currentState = state[id];
    const priority = undefined;

    if (currentState) {
        currentState.data = htmlOrTokens;
    } else {
        state[id] = {
            id: id,
            data: htmlOrTokens,
            dirty: true,
            mode: "outer",
            onetime: true
        };
        insertSorted(order,
            {id: id, priority: priority},
            function(a, b) {
                return a.priority < b.priority;
            });
    }
    requestRender();
}

function renderId(id) {
    /* Lookup the element we want to update */
    const elt = document.getElementById(id);

    if(elt === null)  {
        /* It is not here, maybe it is the next time around */
        return false;
    }

    return renderElement(elt, id);
}

function initializeShadowRoot(elt, mode) {
    if(elt.shadowRoot)
        return elt.shadowRoot;

    if(mode === "shadow-closed") {
        mode = "closed";
    } else {
        mode = "open";
    }

    return elt.attachShadow({mode: mode});
}

function renderElement(elt, id) {
    const s = state[id];
    let is_patch_replace = false;

    if(s === undefined || s.data === undefined || s.dirty === false) {
        /* The element is not here anymore or does not have data yet */
        return;
    }

    if (s.onetime && s.mode == "outer" && typeof s.data == "string") {
        s.data = '<cotonic-tmp-outer id="-tmp-patch-outer-">' + s.data + "</cotonic-tmp-outer>";
        is_patch_replace = true;
    }

    /* Patch the element */
    switch(s.mode) {
        case "inner":
            patchInner(elt, s.data);
            break;
        case "outer":
            patchOuter(elt, s.data);
            break;
        case "shadow":
        case "shadow-open":
        case "shadow-closed":
            if(!s.shadowRoot) {
                s.shadowRoot = initializeShadowRoot(elt, s.mode);
                publish("model/ui/event/new-shadow-root/" + id, { id: id, shadow_root: s.shadowRoot });
            }

            patchInner(s.shadowRoot, s.data);
    }

    s.dirty = false;

    if (is_patch_replace) {
        elt = document.getElementById("-tmp-patch-outer-")
        elt.replaceWith(...elt.children);
    }

    if (s.onetime) {
        remove(id);
    }

    return true;
}

function render() {
    const updated_ids = [];

    for(let i = 0; i < order.length; i++) {
        if (renderId(order[i].id)) {
            updated_ids.push(order[i].id);
        }
    }

    setTimeout(
        function() {
            for(let i = 0; i < updated_ids.length; i++) {
                publish("model/ui/event/dom-updated/" + updated_ids[i], { id: updated_ids[i] });
            }
        },
        0);
}

function on(topic, msg, event, topicTarget, options) {
    options = options || {};
    let payload = {
        message: msg,
        event: event ? cloneableEvent(event) : undefined,
        value: topicTarget ? topicTargetValue(topicTarget) : undefined,
        data: topicTarget ? topicTargetDataAttributes(topicTarget) : undefined
    };

    if (topicTarget) {
        const valueList = topicTargetValueList(topicTarget);
        if (Array.isArray(valueList)) {
            payload.valueList = valueList;
        }
    }

    const pubopts = {
        qos: typeof(options.qos) == 'number' ? options.qos : 0
    };

    if (options.response_topic) {
        call(topic, payload, pubopts)
            .then( function(resp) {
                publish(options.response_topic, resp.payload, pubopts);
            });
    } else {
        publish(topic, payload, pubopts);
    }

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

function topicTargetDataAttributes(topicTarget) {
    const d = {};

    if(!topicTarget)
        return d;

    if(topicTarget.hasOwnProperty("attributes")) {
        const attrs = topicTarget.attributes;

        for (let i=0; i < attrs.length; i++) {
            if (attrs[i].name.startsWith("data-")) {
                d[attrs[i].name.substr(5)] = attrs[i].value;
            }
        }
    }

    return d;
}

function topicTargetValue(topicTarget) {
    if (topicTarget && !topicTarget.disabled) {
        switch (topicTarget.nodeName) {
            case 'FORM':
                return serializeFormToObject(topicTarget);
            case 'INPUT':
            case 'SELECT':
                if (topicTarget.type == 'select-multiple') {
                    const l = topicTarget.options.length;
                    const v = [];
                    for (let j=0; j<l; j++) {
                        if(topicTarget.options[j].selected) {
                            v[v.length] = topicTarget.options[j].value;
                        }
                    }
                    return v;
                } else if (topicTarget.type == 'checkbox' || topicTarget.type == 'radio') {
                    if (topicTarget.checked) {
                        return topicTarget.value;
                    } else {
                        return false;
                    }
                }
                return topicTarget.value;
            case 'TEXTAREA':
                return topicTarget.value;
            default:
                return undefined;
        }
    } else {
        return undefined;
    }
}

function topicTargetValueList(topicTarget) {
    if (topicTarget && !topicTarget.disabled) {
        if (topicTarget.nodeName === 'FORM') {
            return serializeFormToList(topicTarget);
        } else {
            return undefined;
        }
    }
}

function fieldValue(field) {
    if (field.type == 'select-multiple') {
        v = [];
        l = field.options.length;
        for (let j=0; j<l; j++) {
            if(field.options[j].selected) {
                v[v.length] = field.options[j].value;
            }
        }
        return v;
    } else if (field.type == 'checkbox') {
        if (field.checked) {
            return field.value;
        } else if (field.hasAttribute('value-unchecked')) {
            return field.getAttribute('value-unchecked');
        } else {
            return "";
        }
    } else if (field.type != 'radio' || field.checked) {
        return field.value;
    }
    return false;
}

function fieldSubmitIfOk(field, form) {
    if (field.disabled || field.classList.contains("nosubmit")) {
        return false;
    }
    if (field.dataset.submitIf) {
        const submitIf = form.elements[field.dataset.submitIf]
                         ?? document.getElementById(field.dataset.submitIf);
        if (!submitIf || !fieldValue(submitIf)) {
            return false;
        }
    }
    if (field.dataset.submitIfNot) {
        const submitIfNot = form.elements[field.dataset.submitIfNot]
                            ?? document.getElementById(field.dataset.submitIf);
        if (submitIfNot && !!fieldValue(submitIfNot)) {
            return false;
        }
    }
    return true;
}

// From https://plainjs.com/javascript/ajax/serialize-form-data-into-an-array-46/
function serializeFormToObject(form) {
    let field, l, v, s = {};
    if (typeof form == 'object' && form.nodeName == "FORM") {
        const len = form.elements.length;
        for (let i=0; i<len; i++) {
            field = form.elements[i];
            if (   field.name
                && field.type != 'file'
                && field.type != 'reset'
                && field.type != 'submit'
                && field.type != 'button')
            {
                if (!fieldSubmitIfOk(field, form)) {
                    continue;
                }
                const val = fieldValue(field);
                if (val !== false) {
                    s[field.name] = val;
                }
            }
        }
    }
    return s;
}

function serializeFormToList(form) {
    let field, l, v, s = [], prev = "", skipped = false;
    if (typeof form == 'object' && form.nodeName == "FORM") {
        const len = form.elements.length;
        for (let i=0; i<len; i++) {
            field = form.elements[i];
            if (   field.name
                && field.type != 'file'
                && field.type != 'reset'
                && field.type != 'submit'
                && field.type != 'button')
            {
                if (!fieldSubmitIfOk(field, form)) {
                    continue;
                }
                if (skipped && field.name != skipped) {
                    s.push([skipped, ""]);
                    skipped = false;
                }

                if (field.type == 'select-multiple') {
                    l = form.elements[i].options.length;
                    for (let j=0; j<l; j++) {
                        if(field.options[j].selected) {
                            s.push([field.name, field.options[j].value]);
                        }
                    }
                } else if (field.type == 'checkbox') {
                    if (field.checked) {
                        if (prev == field.name) {
                            skipped = false;
                        }
                        s.push([field.name, field.value]);
                    } else if (field.hasAttribute('value-unchecked')) {
                        if (prev == field.name) {
                            skipped = false;
                        }
                        s.push([field.name, field.getAttribute('value-unchecked')]);
                    } else if (prev != field.name) {
                        skipped = field.name;
                    }
                } else if (field.type != 'radio' || field.checked) {
                    s.push([field.name, field.value]);
                }
                prev = field.name;
            }
        }
        if (skipped) {
            s.push([skipped, ""]);
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

function requestRender() {
    if(animationFrameRequestId) {
        // A render is already requested.
        return;
    }

    function renderUpdate() {
        animationFrameRequestId = undefined;
        render();
    }

    animationFrameRequestId = window.requestAnimationFrame(renderUpdate);
}

export { insert, get, update, replace, remove,
    render, renderId,
    updateStateData, updateStateClass, on,
    serializeFormToList, serializeFormToObject };
