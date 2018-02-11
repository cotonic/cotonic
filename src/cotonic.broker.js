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
    let clients = {};

    /* Trie implementation */
    const CHILDREN = 0;
    const VALUE = 1;
    
    function new_node(value) { return [null, value]; }

    let root = new_node(null);

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
	    console.log("Received unknown command", data.cmd);
	};
    })

    function handle_connect(wid, data) {
	// TODO: Start keep-alive timer
	clients[wid] = data;
	cotonic.send(wid, {cmd: "connack"});
    }

    function handle_subscribe(wid, data) {
	add(data.topic, {type: "worker", wid: wid});
    }

    function handle_publish(wid, data) {
	publish(data.topic, data.message);
    }

    /**
     * Publish from main page
     */
    function publish(topic, message) {
	let i = 0;
	const subscriptions = match(topic);

	if(subscriptions.length === 0) return;

	for(i = 0; i < subscriptions.length; i++) {
	    let sub = subscriptions[i];
	    switch(sub.type) {
	    case "worker":
		cotonic.send(sub.wid, {cmd: publish, topic: topic, msg: message});
		break;
	    case "page":
		let p = cotonic.mqtt.extract(sub.topic, topic);
		sub.callback(message, p);
		break;
	    default:
		console.log("Unknown subscription", sub);
	    }
	}
    }

    /** 
     * Subscribe from main page
     */
    function subscribe(topic, callback) {
        let mqtt_topic = topic;	// TODO, support topic descriptions as in cotonic.mqtt
	add(mqtt_topic, {type: "page", topic: topic, callback: callback});
    }

    cotonic.broker = cotonic.broker || {};

    // For testing
    cotonic.broker._root = root;
    cotonic.broker._add = add;
    cotonic.broker._match = match;
    cotonic.broker._remove = remove;

    // External API
    cotonic.broker.publish = publish;
    cotonic.broker.subscribe = subscribe;
}(cotonic));
