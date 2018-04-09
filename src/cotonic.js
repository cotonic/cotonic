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
    /* Get the data-base-worker-src from the script tag that loads
     * cotonic on this page.
     */
    let BASE_WORKER_SRC = (function() {
        const currentScript = document.currentScript || (function() {
            const scripts = document.getElementsByTagName("script");
            return scripts[scripts.length - 1];
        })();
        if(!currentScript) return null;

        return currentScript.getAttribute("data-base-worker-src")
    })();

    let next_worker_id = 1;
    let workers = {};
    let receive_handler = null;

    /**
     * Set the base worker src url programatically
     */
    function set_worker_base_src(url) {
        BASE_WORKER_SRC = url;
    }

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
    function spawn(url, args) {
        if(!BASE_WORKER_SRC)
            throw("Can't spawn worker, no data-base-worker-src attribute set.");

        const blob = new Blob(["importScripts(\"", BASE_WORKER_SRC, "\");"]);
        const blobURL = window.URL.createObjectURL(blob);

        const worker_id = next_worker_id++;
        let worker = new Worker(blobURL);

        worker.postMessage(["init", {
            url: url,
            args: args,
            wid: worker_id}]);

        worker.onmessage = message_from_worker.bind(this, worker_id);
        worker.onerror = error_from_worker.bind(this, worker_id);

        workers[worker_id] = worker;

        return worker_id;
    }

    /**
     * Send a message to a web-worker
     */
    function send(wid, message) {
        if(wid === 0) {
            setTimeout(function() { handler(message, wid) }, 0);
            return;
        }

        let worker = workers[wid];
        if(worker) {
            worker.postMessage(message);
        }
    }

    function receive(handler) {
        receive_handler = handler;
    }

    cotonic.set_worker_base_src = set_worker_base_src;

    cotonic.spawn = spawn;
    cotonic.send = send;
    cotonic.receive = receive;
}(cotonic));
