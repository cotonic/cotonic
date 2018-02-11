/**
 * Copyright 2018 The Cotonic Authors. All Rights Reserved.
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
    var next_worker_id = 1;
    var workers = {};
    var receive_handler = null;

    /**
     * Handle incoming messages from workers 
     */
    function message_from_worker(wid, msg) {
        var data = msg.data;

	if(receive_handler) {
	    receive_handler(data, wid);
	} else {
	    console.log("Unhandled message from worker", wid, msg);
	}
    }

    /**
     * Handle error from worker
     */
    function error_from_worker(wid, e) {
	// TODO, actually handle the error
	console.log("Error from worker", wid, e);
    }

    /**
     * Start a worker
     */
    function spawn(url) {
        var worker = new Worker(url);
        var worker_id = next_worker_id++;

        worker.onmessage = message_from_worker.bind(this, worker_id);
	worker.onerror = error_from_worker.bind(this, worker_id);
        workers[worker_id] = worker;

	console.log("spawned", url);

        return worker_id;
    }

    /**
     * Send a message to a web-worker
     */
    function send(wid, message) {
        var worker;

        if(wid === 0) {
	    setTimeout(function() { handler(message, wid) }, 0);
            return;
        }

        worker = workers[wid];
        if(worker) {
            worker.postMessage(message);
        }
    }

    function receive(handler) {
	receive_handler = handler;
    }

    cotonic.spawn = spawn;
    cotonic.send = send;
    cotonic.receive = receive;
}(cotonic));
