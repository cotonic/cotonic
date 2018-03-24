/**
 * Copyright 2017, 2018 The Cotonic Authors. All Rights Reserved.
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

    /* Trie implementation */
    const CHILDREN = 0;
    const VALUE = 1;
    
    function new_node(value) { return [null, value]; }

    function flush() {
        clients = {};
        root = new_node(null);
    }

    flush();

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
	
	v.push(thing);
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
	let index = v.indexOf(thing);
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

    /* ----- end trie ---- */
    
    /* We assume every message is for the broker. */
    cotonic.receive(function(data, wid) {
	if(!data.cmd) return;

	switch(data.cmd) {
	case "connect":
	    return handle_connect(wid, data);
	case "publish":
	    return handle_publish(wid, data);
	case "subscribe":
	    return handle_subscribe(wid, data);
	default:
	    console.error("Received unknown command", data.cmd);
	};
    });

    function handle_connect(wid, data) {
	// TODO: Start keep-alive timer
	clients[wid] = data;
	cotonic.send(wid, {cmd: "connack"});
    }

    function handle_subscribe(wid, data) {
        let subscription = {type: "worker", wid: wid};

	add(data.topic, subscription);
        cotonic.send(wid, {cmd: "suback", sub_id: data.id});

        const retained = get_matching_retained(data.topic);
        for(let i = 0; i < retained.length; i++) {
            publish_message(subscription, retained[i].topic, retained[i].retained.message);
        }
    }

    function handle_publish(wid, data) {
	publish(data.topic, data.message, data.options);
    }

    /** 
     * Subscribe from main page
     */
    function subscribe(topic, callback) {
        const subscription = {type: "page", topic: topic, callback: callback};
        const mqtt_topic = cotonic.mqtt.remove_named_wildcards(topic);

	add(mqtt_topic, subscription); 

        // TODO optimization possible. Only check all topics when the subscribe
        // contains a wildcard.
        const retained = get_matching_retained(mqtt_topic);
        for(let i = 0; i < retained.length; i++) {
            publish_message(subscription, retained[i].topic, retained[i].retained.message);
        }
    }

    /**
     * Publish from main page
     */
    function publish(topic, message, options) {
	const subscriptions = match(topic);

        if(options && options.retained) {
            retain(topic, message, options);
        }

	for(let i = 0; i < subscriptions.length; i++) {
            publish_message(subscriptions[i], topic, message);
	}
    }

    function publish_message(sub, topic, message) {
        if(sub.type === "worker") {
            cotonic.send(sub.wid, {cmd: "publish", topic: topic, msg: message})
        } else if(sub.type === "page") {
            const p = cotonic.mqtt.extract(sub.topic, topic);
            sub.callback(message, p);
        } else {
            console.error("Unkown subscription type", sub);
        }
    }

    function retain_key(topic) {
        return "c_retained$" + topic;
    }

    function retain(topic, message, options) {
        const key = retain_key(topic);
        
        if(message) {
            sessionStorage.setItem(key, JSON.stringify({
                message: message,
                options: options
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

    cotonic.broker = cotonic.broker || {};

    // For testing
    cotonic.broker._root = root;
    cotonic.broker._add = add;
    cotonic.broker._match = match;
    cotonic.broker._remove = remove;
    cotonic.broker._flush = flush;
    cotonic.broker._delete_all_retained = delete_all_retained;

    // External API
    cotonic.broker.publish = publish;
    cotonic.broker.subscribe = subscribe;
}(cotonic));
