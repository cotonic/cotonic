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

"use strict";

var cotonic = cotonic || {};

/* Cotonic worker code */

(function(self) {

    let model = {
        id: undefined,

        connected: false,
        connecting: false,

        sub_id: 0,
        subscriptions: {}, // topic -> [callback]
        pending_subscriptions: {}, // sub-id -> callback

        selfClose: self.close
    }

    model.present = function(data) {
        /* State changes happen here */
        if(state.connected(model)) {
	    // PUBLISH
	    if(data.type == "publish") {
		if(data.from == "client") {
		    self.postMessage({type: data.type, topic: data.topic, message: data.message, options: data.options});
		} else {
		    // Lookup matching topics, and trigger callbacks
		    for(let pattern in model.subscriptions) {
                        if(!cotonic.mqtt.matches(pattern, data.topic))
                            continue;

			let subs = model.subscriptions[pattern];
			for(let i=0; i < subs.length; i++) {
                            let subscription = subs[i];
	                    try {
				subscription.callback(data.msg,
                                                      cotonic.mqtt.extract(
                                                          subscription.topic, data.topic));
			    } catch(e) {
				console.error("Error during callback of: " + pattern, e);
			    }
			}
		    }
		}
	    }

	    // SUBSCRIBE
            if(data.type == "subscribe" && data.from == "client") {
                let sub_id = model.sub_id++;
                let sub_topic = data.topic;
                let already_subscribed = false;
		let mqtt_topic = cotonic.mqtt.remove_named_wildcards(data.topic);

                // Check if there already is a subscription with the same topic.
		for(let pattern in model.subscriptions) {
                    if(pattern != mqtt_topic) continue;

                    already_subscribed = true;
                    
                    let subs = model.subscriptions[pattern];
                    subs.push({topic: sub_topic, callback: data.callback})
                    if(data.suback_callback) {
                        setTimeout(data.suback_callback, 0);
                    }
                }

                if(!already_subscribed) {
                    self.postMessage({type: "subscribe", topic: mqtt_topic, id: sub_id});
                    data.mqtt_topic = mqtt_topic;
                    model.pending_subscriptions[sub_id] = data;
                }
            }

	    // SUBACK
            if(data.type == "suback" && data.from == "broker") {
                let pending_subscription = model.pending_subscriptions[data.sub_id];
                if(pending_subscription) {
                    delete model.pending_subscriptions[data.sub_id];

                    let subs = model.subscriptions[pending_subscription.mqtt_topic];
		    if(subs == undefined) {
                        subs = model.subscriptions[pending_subscription.mqtt_topic] = [];
		    }

		    subs.push({topic: pending_subscription.topic,
                               callback: pending_subscription.callback});

                    if(pending_subscription.suback_callback) {
                        setTimeout(pending_subscription.suback_callback, 0);
                        delete pending_subscription.suback_callback;
                    }
                }
            }
        } else if(state.disconnected(model)) {
            if(data.type == "connect") {
                model.id = data.id;
                model.connected = false;
                model.connecting = true;
                self.postMessage({type: "connect", willTopic: data.willTopic, willMessage: data.willMessage})
            } else if(data.type == "publish") {
            }
        } else if(state.connecting(model)) {
            if(data.type == "connack" && data.from == "broker") {
                model.connecting = false;
                model.connected = true;
                if(self.on_connect) {
                    setTimeout(self.on_connect, 0);
                }
            } else if(data.connect_timeout) {
                model.connected = false;
                model.connecting = false;
                if(self.on_error) {
                    self.on_error("connect_timeout");
                }
            }
        } else {
            // TODO
        }

        state.render(model);
    }

    /** View */
    let view = {};

    view.display = function(representation) {
        // TODO. Could be used to represent debug information.
    }

    /** State */
    let state = {view: view};

    state.representation = function(model) {
        // TODO, could be debug information.
        let representation;
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

    let actions = {};

    function client_cmd(type, data, present) {
	present = present || model.present;
	data.from = "client";
	data.type = type;
        present(data);
    }

    actions.on_message = function(e) {
	let data = e.data;
        if(data.type) {
            data.from = "broker";
            model.present(e.data);
        }
    }

    actions.on_error = function(e) {
    }

    actions.disconnect = client_cmd.bind(null, "disconnect");
    actions.connect = client_cmd.bind(null, "connect");
    actions.subscribe = client_cmd.bind(null, "subscribe");
    actions.publish = client_cmd.bind(null, "publish");

    actions.connect_timeout = function(data, present) {
        present = present || model.present;
        let d = data, p = present;

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

    self.publish = function(topic, message, options) {
	actions.publish({topic, topic, message: message, options: options});
    }

    self.disconnect = function() {
        actions.disconnect();
    }

    function init(e) {
        self.removeEventListener("message", init);

        if(e.data[0] !== "init")
            throw("Worker init error. Wrong init message.");

        self.addEventListener("message", actions.on_message);
        self.addEventListener("error", actions.on_error);

        const url = e.data[1].url;
        const args = e.data[1].args;

        if(url) {
            importScripts(url);
        }

        if(self.worker_init)
            worker_init.apply(null, args);
    }

    self.addEventListener("message", init);
})(self);
