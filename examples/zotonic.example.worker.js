/**
 * Copyright 2020 Marc Worrell <marc@worrell.nl>
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


////////////////////////////////////////////////////////////////////////////////
// Model
//

var model = {
    status: 'start',
    is_depends_provided: false
};

model.present = function(data) {

    if (state.start(model)) {
        model.status = "waiting";
    }

    if (data.is_depends_provided) {
        model.is_depends_provided = true;
        if (state.waiting(model)) {
            model.status = 'active';
        }
    }

    state.render(model) ;
};


////////////////////////////////////////////////////////////////////////////////
// View
//
var view = {} ;

// Initial State
view.init = function(model) {
    return view.ready(model) ;
}

// State representation of the ready state
view.ready = function(model) {
    return "";
}


//display the state representation
view.display = function(representation) {
}

// Display initial state
view.display(view.init(model)) ;


////////////////////////////////////////////////////////////////////////////////
// State
//
var state =  { view: view };

model.state = state ;

// Derive the state representation as a function of the systen control state
state.representation = function(model) {
    if (state.waiting(model)) {
        // ...
    }

    if (state.running(model)) {
        // ...
    }
};

// Derive the current state of the system
state.start = function(model) {
    return model.status === 'start';
};

state.active = function(model) {
    return model.status === 'active';
}

state.waiting = function(model) {
    return !model.is_depends_provided;
}

state.running = function(model) {
    return model.is_depends_provided;
}


// Next action predicate, derives whether
// the system is in a (control) state where
// an action needs to be invoked

state.nextAction = function (model) {
}

state.render = function(model) {
    state.representation(model)
    state.nextAction(model) ;
}


////////////////////////////////////////////////////////////////////////////////
// Actions
//

var actions = {} ;

actions.start = function(data) {
    data = data || {};
    model.present(data);
};

actions.dependsProvided = function(_data) {
    let data = {};
    data.is_depends_provided = true;
    model.present(data);
};


////////////////////////////////////////////////////////////////////////////////
// Worker Startup
//

self.on_connect = function() {
    actions.start({});
}

self.on_depends_provided = function() {
    actions.dependsProvided({});
}

self.connect({
    depends: [ "bridge/origin", "model/auth", "model/location" ],
    provides: [ ]
});
