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

    const model = {
        client_id: undefined,   // Set to the wid
        name: undefined,        // Name if named spawn

        response_topic_prefix: undefined,
        response_topic_nr: 1,
        response_handlers: {},  // response_topic -> { timeout, handler }

        connected: false,
        connecting: false,

        packet_id: 1,
        subscriptions: {},      // topic -> [callback]
        pending_acks: {},       // sub-id -> callback

        selfClose: self.close
    }

    model.present = function(data) {
        /* State changes happen here */
        if(state.connected(model)) {
            // PUBLISH
            if(data.type == "publish") {
                if(data.from == "client") {
                    // publish to broker
                    let options = data.options || {};
                    let msg = {
                        type: "publish",
                        topic: data.topic,
                        payload: data.payload,
                        qos: options.qos || 0,
                        retain: options.retain || false,
                        properties: options.properties || {}
                    }
                    self.postMessage(msg);
                } else {
                    if (typeof model.response_handlers[data.topic] === 'object') {
                        // Reply to a temp response handler for a call
                        try {
                            clearTimeout(model.response_handlers[data.topic].timeout);
                            model.response_handlers[data.topic].handler(data);
                            delete model.response_handlers[data.topic];
                        } catch(e) {
                            console.error("Error during callback of: " + data.topic, e);
                        }
                    } else {
                        // Receive publish from broker, call matching subscription callbacks
                        for(let pattern in model.subscriptions) {
                            if(cotonic.mqtt.matches(pattern, data.topic)) {
                                let subs = model.subscriptions[pattern];
                                for(let i=0; i < subs.length; i++) {
                                    let subscription = subs[i];
                                    try {
                                        subscription.callback(data,
                                                              cotonic.mqtt.extract(
                                                                  subscription.topic, data.topic));
                                    } catch(e) {
                                        console.error("Error during callback of: " + pattern, e);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // SUBSCRIBE
            if(data.type == "subscribe" && data.from == "client") {
                let new_subs = [];
                let new_topics = [];
                let packet_id = model.packet_id++;

                for (let k = 0; k < data.topics.length; k++) {
                    let t = data.topics[k];
                    let mqtt_topic = cotonic.mqtt.remove_named_wildcards(t.topic);

                    // Check if there is a subscription with the same MQTT topic.
                    if (model.subscriptions[mqtt_topic]) {
                        // TODO: check qos / retain_handling
                        //       if qos > or retain_handling < then resubscribe
                        already_subscribed = true;

                        let subs = model.subscriptions[mqtt_topic];
                        subs.push({topic: t.topic, callback: data.callback})
                        if(data.ack_callback) {
                            setTimeout(data.ack_callback, 0);
                        }
                    } else {
                        let newsub = {
                            topic: mqtt_topic,
                            qos: t.qos || 0,
                            retain_handling: t.retain_handling || 0,
                            retain_as_published: t.retain_as_published || false,
                            no_local: t.no_local || false
                        };
                        new_subs.push(newsub);
                        new_topics.push(t.topic);
                    }
                }

                if(new_topics.length > 0) {
                    self.postMessage({type: "subscribe", topics: new_subs, packet_id: packet_id});
                    data.subs = new_subs;
                    data.topics = new_topics;
                    model.pending_acks[packet_id] = data;
                }
            }

            // SUBACK
            if(data.type == "suback" && data.from == "broker") {
                let pending = model.pending_acks[data.packet_id];
                if(pending) {
                    delete model.pending_acks[data.packet_id];

                    for(let k = 0; k < pending.topics.length; k++) {
                        let subreq = pending.subs[k];
                        let mqtt_topic = subreq.topic;
                        if(model.subscriptions[mqtt_topic] === undefined) {
                            model.subscriptions[mqtt_topic] = [];
                        }

                        if(data.acks[k] < 0x80) {
                            model.subscriptions[mqtt_topic].push({
                                topic: pending.topics[k],
                                sub: subreq,
                                callback: pending.callback
                            });
                        }
                        if(pending.ack_callback) {
                            setTimeout(pending.ack_callback, 0, mqtt_topic, data.acks[k], subreq);
                        }
                    }
                    if(pending.ack_callback) {
                        delete pending.ack_callback;
                    }
                }
            }

            // UNSUBSCRIBE
            // TODO: use a subscriber tag to know which subscription is canceled
            //       now we unsubscribe all subscribers
            if(data.type == "unsubscribe" && data.from == "client") {
                let packet_id = model.packet_id++;
                let mqtt_topics = [];
                for (let k = 0; k < data.topics.length; k++) {
                    let t = data.topics[k];
                    let mqtt_topic = cotonic.mqtt.remove_named_wildcards(t);
                    mqtt_topics.push(mqtt_topic);
                }
                self.postMessage({type: "unsubscribe", topics: mqtt_topics, packet_id: packet_id});
                data.mqtt_topics = mqtt_topics;
                model.pending_acks[packet_id] = data;
            }

            // UNSUBACK
            if(data.type == "unsuback" && data.from == "broker") {
                let pending = model.pending_acks[data.packet_id];
                if(pending) {
                    delete model.pending_acks[data.packet_id];

                    for(let i = 0; i < pending.mqtt_topics.length; i++) {
                        let mqtt_topic = pending.mqtt_topics[i];
                        if (data.acks[i] < 0x80) {
                            let subs = model.subscriptions[mqtt_topic];
                            for (let k = subs.length-1; k >= 0; k--) {
                                delete subs[k].callback;
                                delete subs[k];
                            }
                            delete model.subscriptions[mqtt_topic];
                        }

                        if(pending.ack_callback) {
                            setTimeout(pending.ack_callback, 0, mqtt_topic, data.acks[k]);
                        }
                    }
                    if(pending.ack_callback) {
                        delete pending.ack_callback;
                    }
                }
            }

            // PING
            if(data.type == "pingreq" && data.from == "client") {
                // TODO: if broker doesn't answer then stop this worker
                self.postMessage({type: "pingreq"});
            }

            if(data.type == "pingresp" && data.from == "broker") {
                // TODO: Connection and broker are alive, we can stay alive
            }

            // Response topic handling
            if(data.type == "subscribe_response_handler" && data.from == "client") {
                model.response_handlers[data.topic] = data.handler;
                model.response_topic_nr++;
            }

            if(data.type == "remove_response_handler" && data.from == "client") {
                delete model.response_handlers[data.topic];
            }

        } else if(state.disconnected(model)) {
            if(data.type == "connect") {
                // console.log("worker - connect");
                // model.client_id = data.client_id;
                model.connected = false;
                model.connecting = true;
                self.postMessage({
                    type: "connect",
                    client_id: model.client_id,
                    will_topic: data.will_topic,
                    will_payload: data.will_payload
                });
            } else {
                // message before connect, queue?
                console.error("Message during disconnect state", data);
            }
        } else if(state.connecting(model)) {
            if(data.type == "connack" && data.from == "broker") {
                // assume reason_code == 0
                // register assigned client identifier?
                model.connecting = false;
                model.connected = true;
                setTimeout(self.connack_received, 0);
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
    actions.unsubscribe = client_cmd.bind(null, "unsubscribe");
    actions.publish = client_cmd.bind(null, "publish");
    actions.pingreq = client_cmd.bind(null, "pingreq");
    actions.subscribe_response_handler = client_cmd.bind(null, "subscribe_response_handler");
    actions.remove_response_handler = client_cmd.bind(null, "remove_response_handler");

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
        return state.connected(model);
    }

    self.close = function() {
        actions.close();
    }

    self.connect = function(willTopic, willPayload) {
        actions.connect({
            will_topic: willTopic,
            will_payload: willPayload
        });
    }

    self.subscribe = function(topics, callback, ack_callback) {
        let ts;

        if (typeof(topics) == "string") {
            ts = [
                {
                    topic: topics,
                    qos: 0,
                    retain_handling: 0,
                    retain_as_published: false,
                    no_local: false
                }
            ];
        } else {
            // Assume array with topic subscriptions
            ts = topics;
        }
        actions.subscribe({topics: ts, callback: callback, ack_callback: ack_callback});
    }

    self.unsubscribe = function(topics, callback, ack_callback) {
        let ts;

        if (typeof(topics) == "string") {
            ts = [ topics ];
        } else {
            ts = topics;
        }
        actions.unsubscribe({topics: ts, callback: callback, ack_callback: ack_callback});
    }

    self.publish = function(topic, payload, options) {
        actions.publish({topic: topic, payload: payload, options: options});
    }

    self.pingreq = function() {
        actions.pingreq();
    }

    self.disconnect = function() {
        actions.disconnect();
    }

    // Publish to a topic, return a promise for the response_topic publication
    self.call = function(topic, payload, options) {
        options = options || {};
        let timeout = options.timeout || 15000;
        var willRespond = new Promise(
            function(resolve, reject) {
                let response_topic = model.response_topic_prefix + model.response_topic_nr;
                let timer = setTimeout(function() {
                                actions.remove_response_handler({ topic: response_topic });
                                let reason = new Error("Timeout waiting for response on " + topic);
                                reject(reason);
                            }, timeout);
                let handler = {
                    handler: resolve,
                    timeout: timer
                };
                actions.subscribe_response_handler({ topic: response_topic, handler: handler });
                let pubdata = {
                    topic: topic,
                    payload: payload,
                    options: {
                        properties: {
                            response_topic: response_topic
                        }
                    }
                };
                actions.publish(pubdata);
            });
        return willRespond;
    }

    self.connack_received = function() {
        self.subscribe(model.response_topic_prefix + "+", self.response, self.on_connect);
    };

    self.abs_url = function(path) {
        return model.location.origin + path;
    }

    function init(e) {
        if(e.data[0] !== "init")
            throw("Worker init error. Wrong init message.");

        self.removeEventListener("message", init);
        self.addEventListener("message", actions.on_message);
        self.addEventListener("error", actions.on_error);

        model.client_id = e.data[1].wid;
        model.name = e.data[1].name || undefined;
        model.location = e.data[1].location;
        model.response_topic_prefix = "worker/" + model.client_id + "/response/";

        const url = e.data[1].url;
        const args = e.data[1].args;

        if(url) {
            importScripts(url);
        }

        if(self.worker_init) {
            worker_init.apply(null, args);
        }
    }

    self.addEventListener("message", init);
})(self);

