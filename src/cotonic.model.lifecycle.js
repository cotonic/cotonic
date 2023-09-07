/**
 * Copyright 2021-2023 The Cotonic Authors. All Rights Reserved.
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

import { publish } from "./cotonic.broker.js";

const model = {
    state: undefined,
    online: undefined
};

const actions = {};
const state = {};

/*
 * Diagram of state transitions.
 *
 * digraph state {
 *
 *   active -> passive;
 *   passive -> active;
 *
 *   passive -> hidden;
 *   hidden -> passive;
 *
 *   hidden -> terminated;
 *   hidden -> frozen;
 *
 *   frozen -> hidden;
 * }
 *
 * digraph online {
 *     online -> offline;
 *     offline -> online;
 * }
 */

const validTransitions = {
    active:  {
        passive: [],
        hidden: ["passive"],
        frozen: ["passive", "hidden"],
        terminated: ["passive", "hidden"],
    },
    passive: {
        active: [],
        hidden: [],
        frozen: ["hidden"],
        terminated: ["hidden"]
    },
    hidden:  {
        active: ["passive"],
        passive: [],
        frozen: [],
        terminated: []
    },
    frozen:  {
        active: ["hidden", "passive"],
        passive: ["hidden"],
        hidden: [],
        terminated: ["hidden"]
    },
    terminated: {
    }
};

model.present = function(proposal) {
    if(proposal.is_init) {
        listenToLifecycleEvents();

        model.state = proposal.newState;
        model.online = proposal.online; 

        publish("model/lifecycle/event/ping", "pong", { retain: true });
        publish("model/lifecycle/event/state", model.state, { retain: true });
        publish("model/lifecycle/event/online", model.online, { retain: true });
    } else {
        if(proposal.type === "onlineState") {
            if(model.online !== proposal.online) {
                model.online = proposal.online;
                publish("model/lifecycle/event/online", model.online, { retain: true });
            }
        } else if(proposal.type === "blur") {
            if(model.state === "active") {
                doPossibleStateChange(model, proposal.newState);
            }
        } else if(proposal.type === "visibilitychange") {
            if(model.state !== "frozen" && model.state !== "terminated") {
                doPossibleStateChange(model, proposal.newState); 
            }
        } else {
            doPossibleStateChange(model, proposal.newState); 
        }
    }

    state.render(model);
};

//
// State
//

state.nextAction = function(model) {
};

state.representation = function(model) {
};

state.render = function(model) {
    state.representation(model);
    state.nextAction(model) ;
};

//
// Actions
//

actions.focus = function() {
    model.present({type: "focus", newState: "active"});
};

actions.freeze = function() {
    model.present({type: "freeze", newState: "frozen"});
};

actions.terminatedOrFrozen = function(evt) {
    model.present({type: evt.type, newState: evt.persisted ? "frozen" : "terminated"});
};

actions.handleEvent = function(evt) {
    model.present({type: evt.type, newState: getCurrentState()});
};

actions.handleOnlineStatus = function(evt) {
    model.present({type: "onlineState", online: navigator.onLine});
};

//
// Helpers
//

function listenToLifecycleEvents() {
    const opts = { capture: true, passive: true };

    window.addEventListener("focus", actions.focus, opts);
    window.addEventListener("freeze", actions.freeze, opts);

    window.addEventListener("blur", actions.handleEvent, opts);
    window.addEventListener("visibilitychange", actions.handleEvent, opts);
    window.addEventListener("resume", actions.handleEvent, opts);
    window.addEventListener("pageshow", actions.handleEvent, opts);

    // On modern browsers it is not advised to use unload. 
    // See: https://developer.chrome.com/articles/page-lifecycle-api/
    const terminationEvent = 'onpagehide' in globalThis ? 'pagehide' : 'unload';
    window.addEventListener(terminationEvent, actions.terminatedOrFrozen, opts);

    window.addEventListener("online", actions.handleOnlineStatus, opts);
    window.addEventListener("offline", actions.handleOnlineStatus, opts);
}

function getCurrentState() {
    if (document.visibilityState === "hidden") {
        return "hidden";
    }

    if (document.hasFocus()) {
        return "active";
    }

    return "passive";
}

function doPossibleStateChange(model, newState) {
    // Get the transition path
    const transitions = validTransitions[model.state];
    if(transitions === undefined) return;

    const transitionPath = transitions[newState];
    if(transitionPath === undefined) return;

    for(let i=0; i < transitionPath.length; i++) {
        publish("model/lifecycle/event/state", transitionPath[i], { retain: true });
    }
    publish("model/lifecycle/event/state", newState, { retain: true });

    model.state = newState;
}

//
// Start
//

model.present({is_init: true, newState: getCurrentState(), online: navigator.onLine});
