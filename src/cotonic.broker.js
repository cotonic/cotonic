/**
 * Copyright 2017-2019 The Cotonic Authors. All Rights Reserved.
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
    let clients;
    let root;
    let response_nr = 0;

    /* Trie implementation */
    const CHILDREN = 0;
    const VALUE = 1;

    function new_node(value) { return [null, value]; }

    function flush() {
        clients = {};
        root = new_node(null);
    }

    function add(topic, thing) {
        const path = topic.split("/");

        let i = 0;
        let current = root;

        for(i = 0; i < path.length; i++) {
            let children = current[CHILDREN];
            if(children === null) {
                children = current[CHILDREN] = {};
            }

            if(!children.hasOwnProperty(path[i])) {
                children[path[i]] = new_node(null);
            }

            current = children[path[i]];
        }

        let v = current[VALUE];
        if(v === null) {
            v = current[VALUE] = [];
        }

        let index = indexOfSubscription(v, thing);
        if(index > -1) {
            v.splice(index, 1);
        }
        v.push(thing);
        return v;
    }

    function match(topic) {
        const path = topic.split("/");
        let matches = [];

        collect_matches(path, root, matches);

        return matches;
    }

    function collect_matches(path, trie, matches) {
        if(trie === undefined) return;

        if(path.length === 0) {
            if(trie[VALUE] !== null) {
                matches.push.apply(matches, trie[VALUE])
                return;
            }
        }

        let children = trie[CHILDREN];
        if(children === null) return;

        let sub_path = path.slice(1);

        collect_matches(sub_path, children[path[0]], matches);
        collect_matches(sub_path, children["+"], matches);
        collect_matches([], children["#"], matches);
    }

    function remove(topic, thing) {
        const path = topic.split("/");
        let current = root;
        let i = 0;
        let visited = [current];

        for(i = 0; i < path.length; i++) {
            let children = current[CHILDREN];
            if(children === null) {
                return;
            }

            if(!children.hasOwnProperty(path[i])) {
                return;
            }

            current = children[path[i]];
            visited.unshift(current);
        }

        /* Remove the node, and check for empty nodes along the path */
        let v = current[VALUE];
        let index = indexOfSubscription(v, thing);
        if(index > -1) {
            v.splice(index, 1);

            if(v.length === 0) {
                current[VALUE] = null;
                path.reverse();
                for(i = 0; i < visited.length - 1; i++) {
                    let v = visited[i];

                    if(v[CHILDREN] === null && v[VALUE] === null) {
                        let v1 = visited[i+1];
                        delete v1[CHILDREN][path[i]];
                        if(Object.keys(v1[CHILDREN]).length == 0) {
                            v1[CHILDREN] = null;
                        }
                        continue;
                    }
                    return;
                }
            }
        }
    }

    function indexOfSubscription( v, thing ) {
        let index = v.indexOf(thing);
        if (index == -1) {
            for(index = v.length-1; index >= 0; index--) {
                let sub = v[index];
                if (thing.type == sub.type && sub.wid && sub.wid === thing.wid) {
                    return index;
                }
            }
        }
        return index;
    }

    /**
     * Find all subscribers "below" a certain topic
     * Used by the bridge to collect all subcriptions after a session restart
     */
    function find_subscriptions_below(topic) {
        const path = topic.split("/");
        let subs = [];
        collect_subscribers(path, root, subs);
        return subs;
    }

    function collect_subscribers(path, trie, subs) {
        if(trie === undefined) return;

        if(path.length === 0 && trie[VALUE] !== null) {
            subs.push.apply(subs, trie[VALUE])
        }

        let children = trie[CHILDREN];
        if(children === null) return;

        if (path.length > 0) {
            let sub_path = path.slice(1);

            collect_subscribers(sub_path, children[path[0]], subs);
            collect_subscribers(sub_path, children["+"], subs);
            collect_subscribers([], children["#"], subs);
        } else {
            for (let m in children) {
                collect_subscribers(path, children[m], subs);
            }
        }
    }

    /* ----- end trie ---- */


    /* We assume every message is for the broker. */
    cotonic.receive(function(data, wid) {
        if(!data.type) return;

        switch(data.type) {
            case "connect":
                return handle_connect(wid, data);
            case "publish":
                return handle_publish(wid, data);
            case "subscribe":
                return handle_subscribe(wid, data);
            case "unsubscribe":
                return handle_unsubscribe(wid, data);
            case "pingreq":
                return handle_pingreq(wid, data);
            default:
                console.error("Received unknown command", data);
        };
    });

    function handle_connect(wid, data) {
        // TODO: Start keep-alive timer for will handling if pingreq missing
        if (data.client_id !== wid) {
            console.error("Wrong client_id in connect from " + wid, data);
        }
        clients[wid] = data;
        cotonic.send(wid, {type: "connack", reason_code: 0});
    }

    function handle_subscribe(wid, data) {
        let result = subscribe_subscriber({type: "worker", wid: wid}, data);
        cotonic.send(wid, {type: "suback", packet_id: data.packet_id, acks: result.acks});
        send_retained(result.retained);
    }

    function send_retained( retained ) {
        for(let i = 0; i < retained.length; i++) {
            const r = retained[i];
            for (let j = 0; j < r.retained.length; j++) {
                publish_subscriber(r.subscription, r.retained[j].retained.message, r.subscription.wid);
            }
        }
    }

    function handle_unsubscribe(wid, data) {
        let acks = unsubscribe_subscriber({type: "worker", wid: wid}, data);
        cotonic.send(wid, {type: "unsuback", packet_id: data.packet_id, acks: acks});
    }

    function handle_publish(wid, data) {
        publish_mqtt_message(data, { wid: wid });
    }

    function handle_pingreq(wid, data) {
        // TODO: reset keep-alive timer
        cotonic.send(wid, {type: "pingresp"});
    }

    /**
     * Subscribe from main page
     */
    function subscribe(topics, callback, options) {
        options = options || {};
        let subtopics = [];

        if (typeof topics === "string") {
            topics = [ topics ];
        }

        for (let k = 0; k < topics.length; k++) {
            if (typeof topics[k] === "string") {
                subtopics.push({
                    topic: topics[k],
                    qos: options.qos || 0,
                    retain_handling: options.retain_handling || 0,
                    retain_as_published: options.retain_as_published || false,
                    no_local: options.no_local || false
                });
            } else {
                subtopics.push(topics[k]);
            }
        }
        const msg = {
            type: "subscribe",
            topics: subtopics,
            properties: options.properties || {}
        };
        return subscribe_subscriber({type: "page", wid: options.wid, callback: callback}, msg);
    }


    function subscribe_subscriber(subscription, msg) {
        let bridge_topics = {};
        let acks = [];
        let retained = [];
        for(let k = 0; k < msg.topics.length; k++) {
            const t = msg.topics[k];
            const mqtt_topic = cotonic.mqtt.remove_named_wildcards(t.topic);
            subscription.sub = t;
            subscription.topic = t.topic;

            let allSubs = add(mqtt_topic, subscription);
            acks.push(0);

            if(t.retain_handling < 2) {
                // TODO optimization possible. Only check all topics when the subscribe
                // contains a wildcard.
                const rs = get_matching_retained(mqtt_topic);
                if (rs.length > 0) {
                    retained.push({
                        subscription: subscription,
                        retained: rs
                    })
                }
            }

            // Collect bridge topics per bridge
            let m = mqtt_topic.match(/^bridge\/([^\/]+)\/.*/);
            if (m !== null && m[1] != "+") {
                if (bridge_topics[ m[1] ] === undefined) {
                    bridge_topics[ m[1] ] = [];
                }
                bridge_topics[ m[1] ].push({ topic: mqtt_topic, subs: allSubs});
            }
        }

        // Relay bridge topics to the bridges
        // Forward the "best" (qos, retain_handling) subscription (assume it is changed)
        for(let b in bridge_topics) {
            let topics = [];
            for (let i = 0; i < bridge_topics[b].length; i++) {
                let merged = mergeSubscriptions(bridge_topics[b][i].subs);
                merged.topic = bridge_topics[b][i].topic;
                topics.push(merged);
            }
            let sub = {
                type: "subscribe",
                topics: topics,
                properties: msg.properties || {}
            };
            publish("$bridge/" + b + "/control", sub);
        }
        return { acks: acks, retained: retained };
    }

    function mergeSubscriptions( subs ) {
        var best = Object.assign({}, subs[0].sub);
        for (let i = 1; i < subs.length; i++) {
            let s = subs[i].sub;
            best.qos = Math.max(best.qos, s.qos);
            best.retain_handling = Math.min(best.retain_handling, s.retain_handling);
            best.retain_as_published = best.retain_as_published || s.retain_as_published;
            best.no_local = best.no_local && s.no_local;
        }
        return best;
    }

    /**
      * Unsubscribe
      */
    function unsubscribe( topics, options ) {
        options = options | {wid: 0};
        if (typeof topics === "string") {
            topics = [ topics ];
        }
        unsubscribe_subscriber({type: "page", wid: options.wid}, { topics: topics });
    }

    function unsubscribe_subscriber(sub, msg) {
        let bridge_topics = {};
        let acks = [];

        for (let i = 0; i < msg.topics.length; i++) {
            remove(msg.topics[i], sub);
            acks.push(0);

            // Collect bridge topics per bridge
            const mqtt_topic = cotonic.mqtt.remove_named_wildcards(msg.topics[i]);
            let m = mqtt_topic.match(/^bridge\/([^\/]+)\/.*/);
            if (m !== null && m[1] != "+") {
                if (bridge_topics[ m[1] ] === undefined) {
                    bridge_topics[ m[1] ] = [];
                }
                bridge_topics[ m[1] ].push(mqtt_topic);
            }
        }

        // Relay bridge topics to the bridges
        for(let b in bridge_topics) {
            let unsub = {
                type: "unsubscribe",
                topics: bridge_topics[b],
                properties: msg.properties || {}
            };
            publish("$bridge/" + b + "/control", unsub);
        }
        return acks;
    }

    /**
     * Publish from main page
     */
    function publish(topic, payload, options) {
        options = options || {};
        let msg = {
            type: "publish",
            topic: topic,
            payload: payload,
            qos: options.qos || 0,
            retain: options.retain || false,
            properties: options.properties || {}
        };
        publish_mqtt_message(msg, options);
    }

    function publish_mqtt_message(msg, options) {
        const subscriptions = match(msg.topic);
        if(msg.retain) {
            retain(msg);
        }

        const wid = options ? options.wid : undefined;
        for(let i = 0; i < subscriptions.length; i++) {
            publish_subscriber(subscriptions[i], msg, wid);
        }
    }

    function publish_subscriber(sub, mqttmsg, wid) {
        if (wid && sub.wid && sub.wid === wid && sub.sub.no_local) {
            return;
        }

        if(sub.type === "worker") {
            cotonic.send(sub.wid, mqttmsg)
        } else if(sub.type === "page") {
            sub.callback(mqttmsg, cotonic.mqtt.extract(sub.topic, mqttmsg.topic), { topic: sub.topic, wid: sub.wid });
        } else {
            console.error("Unkown subscription type", sub);
        }
    }

    function retain_key(topic) {
        return "c_retained$" + topic;
    }

    function retain(message) {
        const key = retain_key(message.topic);

        if(message.payload !== undefined && message.payload !== null && message.payload !== "") {
            sessionStorage.setItem(key, JSON.stringify({
                message: message
            }));
        } else {
            sessionStorage.removeItem(key);
        }
    }

    function get_matching_retained(topic) {
        const prefix = "c_retained$";
        let matching = [];

        for(let i = 0; i < sessionStorage.length; i++) {
            let key = sessionStorage.key(i);

            if(key.substring(0, prefix.length) !== prefix) {
                continue;
            }

            const retained_topic = key.substring(prefix.length);
            if(!cotonic.mqtt.matches(topic, retained_topic)) {
                continue;
            }

            const retained = get_retained(retained_topic);
            if(retained !== null)
                matching.push({topic: topic, retained: retained});
        }

        return matching;
    }

    function get_retained(topic) {
        const key = retain_key(topic);
        const item = sessionStorage.getItem(key);
        if(item === null) {
            return null;
        }

        const Obj = JSON.parse(item);
        if(!Obj.message) {
            sessionStorage.removeItem(key);
            return null;
        }

        return Obj;
    }

    function delete_all_retained() {
        const prefix = "c_retained$";

        for(let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if(key.substring(0, prefix.length) !== prefix) {
                continue;
            }
            sessionStorage.removeItem(key);
        }
    }

    // Call a topic, return a promise for the response
    function call(topic, payload, options) {
        options = options || {};
        payload = payload || null;
        let timeout = options.timeout || 15000;
        var willRespond = new Promise(
            function(resolve, reject) {
                let resp_topic = response_topic();
                let wid = "wid-" + Math.random();

                let timer = setTimeout(function() {
                    unsubscribe(resp_topic, { wid: wid });
                    let reason = new Error("Timeout waiting for response on " + topic);
                    reject(reason);
                }, timeout);

                subscribe(resp_topic, function(msg) {
                    clearTimeout(timer);
                    unsubscribe(resp_topic, { wid: wid });
                    resolve(msg);
                }, { wid: wid });

                options.properties = options.properties || {};
                options.properties.response_topic = resp_topic;
                publish(topic, payload, options);
            });
        return willRespond;
    }

    function response_topic() {
        return "reply/page-" + (response_nr++) + "-" + Math.random();
    }


    // Start fresh
    flush();
    delete_all_retained();

    cotonic.broker = cotonic.broker || {};

    // For testing
    cotonic.broker._root = root;
    cotonic.broker._add = add;
    cotonic.broker._remove = remove;
    cotonic.broker._flush = flush;
    cotonic.broker._delete_all_retained = delete_all_retained;

    // External API
    cotonic.broker.find_subscriptions_below = find_subscriptions_below;
    cotonic.broker.match = match;
    cotonic.broker.publish = publish;
    cotonic.broker.subscribe = subscribe;
    cotonic.broker.unsubscribe = unsubscribe;
    cotonic.broker.call = call;

    // Bridge API for relaying publish messages
    cotonic.broker.publish_mqtt_message = publish_mqtt_message;
}(cotonic));
