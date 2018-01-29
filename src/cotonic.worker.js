/**
 * Copyright 2016, 2017, 2018 The Cotonic Authors. All Rights Reserved.
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

 /**
  * Description of messages

  topic:

   message-cmd:
       CONNECT, CONNACK,

       PUBLISH, PUBACK, PUBREC, PUBREL, PUBCOMP,

       SUBSCRIBE, PUBCOMP, SUBSCRIBE, SUBACK, UNSUBSCRIBE, UNSUBACK,

       PINGREQ, PINGRESP,

       DISCONNECT

   message:
       {cmd:<message-cmd>, <payload>}

   connect-payload:
       {client_identifier: <id>, will_topic: <topic>, will_message: <payload>}
  */

"use strict";

/* Cotonic worker code */

(function(self) {
    /** Model */
    var model = {
        id: undefined,

        connected: false,
        connecting: false,

        sub_id: 0,
        subscriptions: {},

        selfClose: self.close
    }

    model.present = function(data) {
        /* State changes happen here */
        if(state.connected(model)) {
            // TODO
        } else if(state.disconnected(model)) {

            if(data.cmd == "connect") {
                model.id = data.id;
                model.connected = false;
                model.connecting = true;
                self.postMessage({cmd: "connect", willTopic: data.willTopic, willMessage: data.willMessage})
            }

        } else if(state.connecting(model)) {
            if(data.cmd == "connack") {
                model.connecting = true;
                model.connected = false;
                if(self.on_connect) self.on_connect();
            } else if(data.connect_timeout) {
                model.connected = false;
                model.connecting = false;
                if(self.on_error) self.on_error("connect_timeout");
            }
        } else {
            // TODO
        }

        state.render(model);
    }

    /** View */
    var view = {};

    view.display = function(representation) {
        // TODO. Could be used to represent debug information.
    }

    /** State */
    var state = {view: view};

    state.representation = function(model) {
        // TODO, could be debug information.
        var representation;
        state.view.display(representation);
    }

    state.nextAction = function(model) {
        if(state.connecting(model)) {
            // We are connecting, trigger a connect timeout
            actions.connect_timeout({}, model.present);
        }
    }

    state.render = function(model) {
        state.representation(model);
        state.nextAction(model);
    }

    model.state = state;

    state.disconnected = function(model) {
        return (!model.connected && !model.connecting);
    }

    state.connected = function(model) {
        return (model.connected && !model.connecting);
    }

    state.connecting = function(model) {
        return (!model.connected && model.connecting);
    }

    /** Actions */

    var actions = {};

    actions.on_message = function(e) {
        var present = model.present;
        present(e.data);
    }

    actions.on_error = function(e) {
    }

    actions.disconnect = function() {
    }

    actions.connect = function(data, present) {
        present = present || model.present;
        data.cmd = "connect";
        present(data);
    }

    actions.connect_timeout = function(data, present) {
        present = present || model.present;
        var d = data, p = present;

        setTimeout(function() {
            d.connect_timeout = true;
            p(d);
        }, 1000);
    }

    /* External api */
    self.is_connected = function() {
        return state.connected();
    }

    self.close = function() {
        actions.close();
    }

    self.connect = function(id, willTopic, willMessage) {
        actions.connect({id: id, willTopic: willTopic, willMessage: willMessage});
    }

    self.disconnect = function() {
        actions.disconnect();
    }

    self.addEventListener("message", actions.on_message);
    self.addEventListener("error", actions.on_error);
})(self);