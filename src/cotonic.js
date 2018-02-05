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

    /**
     * Handle incoming messages from workers 
     */
    function message_from_worker(wid, msg) {
        var m = msg.data;

	// TODO, 
        console.log(m);
    }

    /**
     * Start a worker
     */
    function spawn(url) {
        var worker = new Worker(url);
        var worker_id = next_worker_id++;

        worker.onmessage = message_from_worker.bind(this, worker_id);
        workers[worker_id] = worker;

        return worker_id;
    }

    /**
     * Send a message to a web-worker
     */
    function send(wid, message) {
        var worker;

        if(wid == 0) {
            // It is a message for me, (should go to message handler?) 
            console.log("main received:", message)
            return;
        }

        worker = workers[wid];
        if(worker) {
            worker.postMessage(message);
        }
    }

    cotonic.spawn = spawn;
    cotonic.send = send;
}(cotonic));
