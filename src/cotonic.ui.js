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

    function on(topic, msg, event, options) {
        options = options || {};
        var payload = {
            message: msg,
            event: event ? cloneableEvent(event) : undefined,
            value: event ? eventTargetValue(event) : undefined,
            data: event ? eventDataAttributes(event) : undefined
        };
        var pubopts = {
            qos: typeof(options.qos) == 'number' ? options.qos : 0
        };
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
        var d = {};
        if (event.target) {
            var attrs = event.target.attributes;
            var i, n = attrs.length;
            for (i=0; i<n; i++) {
                if (attrs[i].name.startsWith("data-")) {
                    d[attrs[i].name.substr(5)] = attrs[i].value;
                }
            }
        }
        return d;
    }

    function  eventTargetValue(event) {
        if (event.target && !event.target.disabled) {
            var elt = event.target;
            switch (event.target.nodeName) {
                case 'FORM':
                    return serializeForm(elt);
                case 'INPUT':
                case 'SELECT':
                    if (elt.type == 'select-multiple') {
                        var l = elt.options.length;
                        var v = [];
                        for (var j=0; j<l; j++) {
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
        var field, l, v, s = {};
        if (typeof form == 'object' && form.nodeName == "FORM") {
            var len = form.elements.length;
            for (var i=0; i<len; i++) {
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

    cotonic.ui = cotonic.ui || {};

    cotonic.ui.insert = insert;
    cotonic.ui.update = update;
    cotonic.ui.remove = remove;
    cotonic.ui.render = render;
    cotonic.ui.renderId = renderId;
    cotonic.ui.on = on;
}(cotonic));
