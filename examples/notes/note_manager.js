/*
 * Note manager, manages notes on the screen.
 */

"use strict";

/**
 * Model
 */

let model = {
    displayTopic: "ui/note-manager",

    connected: false,

    note_ids: undefined,
    notes: undefined,

    add_note: false
}

model.present = function(proposal) {
    if(state.connected(model)) {
        if(proposal.note_ids !== undefined) {
            model.note_ids = proposal.note_ids;
            model.notes = {};
        }
    } else {
        model.connected = proposal.connected || false;
    }

    state.render(model);
}

/*
 * View
 */

let view = {}
 
view.normal = function(model) {
}

view.adding_note = function(model) {
}

view.display = function(representation, model) {
    if(!model.displayTopic) {
        return;
    }

    if(!representation) {
        return;
    }

    self.publish(model.displayTopic + "/update", representation);
}

/*
 * State
 */

let state = {
    view: view
}

model.state = state;

state.connected = function(model)  {
    return model.connected;
}

state.adding_note = function(model) {
    return model.connected && model.add_note;
}

state.representation = function(model) {
    const representation = "<p>Note Manager</p>";

    state.view.display(representation, model);
}

state.nextAction = function(model) {
    if(!state.connected(model)) {
        actions.connect();
    } else {
        if(model.note_ids === null) {
            actions.init_note_ids();
        }
    }
}

state.render = function(model) {
    state.representation(model);
    state.nextAction(model);
}

/*
 * Actions
 */

let actions = {}

actions.on_connect = function() {
    self.subscribe("id/add-note/click", actions.add_note);

    self.call("model/localStorage/get/notes", undefined, {timeout: 1000})
        .then(actions.note_ids)
        .catch(actions.error_note_ids);

    model.present({connected: true});
}
self.on_connect = actions.on_connect;

actions.on_error = function(error) {
    console.log("Note manager error", error);
}
self.on_error = actions.on_error;

actions.add_note = function() {
    console.log("Adding note");

    model.present({add_note: true});
}

actions.note_ids = function(msg, bindings) {
    if(msg.payload === null) {
        model.present({note_ids: null});
    } else {
        model.present({note_ids: JSON.parse(msg.payload)});
    }
}

actions.error_note_ids = function(err) {
    console.log("error note ids", err);
}

actions.init_note_ids = function(msg, bindings) {
    self.call("model/localStorage/post/notes", JSON.stringify([]), {timeout: 1000})
        .then(actions.note_ids)
        .catch(actions.error_note_ids);
}

actions.connect = function() {
    self.connect();
}

state.nextAction(model);

