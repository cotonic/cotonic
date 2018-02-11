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
        subscriptions:         {}, // topic -> callback
        pending_subscriptions: {}, // sub-id -> callback

        selfClose: self.close
    }

    model.present = function(data) {
        /* State changes happen here */
        if(state.connected(model)) {
	    // PUBLISH
	    if(data.cmd == "publish") {
		if(data.from == "client") {
		    self.postMessage({cmd: data.cmd, topic: data.topic, message: data.message});
		} else {
		    // Lookup matching topics, and trigger callbacks
		    for(var topic in model.subscriptions) {
			var p = topic.exec(topic, data.topic)
			if(p !== null) {
			    try {
			        mode.subscriptions[topic](data.payload, p._topic = data.topic);
			    } catch(e) {
				console.log("Error during callback of: " + topic);
			    }
			}
		    }
		}
	    }

	    // SUBSCRIBE
            if(data.cmd == "subscribe" && data.from == "client") {
                var sub_id = model.sub_id++;
                self.postMessage({cmd: "subscribe", topic: data.topic, id: sub_id});
                model.pending_subscriptions[sub_id] = data;
            }

	    // SUBACK
            if(data.cmd == "suback" && data.from == "broker") {
                var pending_subscription = model.pending_subscriptions[data.sub_id];
                if(pending_subscription) {
                    delete model.pending_subscriptions[data.sub_id];

                    model.subscriptions[pending_subscription.topic] = pending_subscription.callback;
                    if(pending_subscription.suback_callback) {
                        setTimeout(pending_subscription.suback_callback, 0);
                    }
                }
            }

        } else if(state.disconnected(model)) {

            if(data.cmd == "connect") {
                model.id = data.id;
                model.connected = false;
                model.connecting = true;
                self.postMessage({cmd: "connect", willTopic: data.willTopic, willMessage: data.willMessage})
            } else if(data.cmd == "publish") {
            }

        } else if(state.connecting(model)) {
            if(data.cmd == "connack" && data.from == "broker") {
                model.connecting = false;
                model.connected = true;
                if(self.on_connect) setTimeout(self.on_connect, 0);
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

    function client_cmd(cmd, data, present) {
	present = present || model.present;
	data.from = "client";
	data.cmd = cmd;
        present(data);
    }

    actions.on_message = function(e) {
	var data = e.data;
	data.from = "broker";
        model.present(data);
    }

    actions.on_error = function(e) {
    }

    actions.disconnect = client_cmd.bind(null, "disconnect");
    actions.connect = client_cmd.bind(null, "connect");
    actions.subscribe = client_cmd.bind(null, "subscribe");
    actions.publish = client_cmd.bind(null, "publish");

    actions.connect_timeout = function(data, present) {
        present = present || model.present;
        var d = data, p = present;

        setTimeout(function() {
            d.connect_timeout = true;
            p(d);
        }, 1000);
    }

    /** External api */
    self.is_connected = function() {
        return state.connected();
    }

    self.close = function() {
        actions.close();
    }

    self.connect = function(id, willTopic, willMessage) {
        actions.connect({id: id, willTopic: willTopic, willMessage: willMessage});
    }

    self.subscribe = function(topic, callback, suback_callback) {
        actions.subscribe({topic: topic, callback: callback, suback_callback: suback_callback});
    }

    self.publish = function(topic, message) {
	actions.publish({topic, topic, message: message});
    }

    self.disconnect = function() {
        actions.disconnect();
    }

    self.addEventListener("message", actions.on_message);
    self.addEventListener("error", actions.on_error);
})(self);
