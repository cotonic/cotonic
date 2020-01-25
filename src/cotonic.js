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

/* Current cotonic version */
cotonic.VERSION = "1.0.0";

(function(cotonic) {

    /* Get the data-base-worker-src from the script tag that loads
     * cotonic on this page.
     */
    let BASE_WORKER_SRC = (function() {
        const currentScript = document.currentScript || (function() {
            const scripts = document.getElementsByTagName("script");
            return scripts[scripts.length - 1];
        })();
        if(currentScript && currentScript.getAttribute("data-base-worker-src")) {
            return currentScript.getAttribute("data-base-worker-src");
        } else {
            return "/lib/cotonic/cotonic-worker-bundle.js?v=1";
        }
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
        if(!BASE_WORKER_SRC){
            throw("Can't spawn worker, no data-base-worker-src attribute set.");
        }

        return spawn_named("", url, BASE_WORKER_SRC, args);
    }

    /**
     * Start a named worker - named workers are unique
     * Use "" or 'undefined' for a nameless worker.
     */
    function spawn_named(name, url, base, args) {
        // TODO: check if the name of the worker is unique (or empty).
        // Return the existing worker_id if already running.
        base = base || BASE_WORKER_SRC;
        if(!base) {
            throw("Can't spawn worker, no data-base-worker-src attribute set.");
        }
        const blob = new Blob(["importScripts(\"", ensure_hostname(base), "\");"]);
        const blobURL = window.URL.createObjectURL(blob);

        const worker_id = next_worker_id++;
        let worker = new Worker(blobURL);

        worker.postMessage(["init", {
            url: ensure_hostname(url),
            args: args,
            wid: worker_id,
            name: name,
            location: {
                origin: window.location.origin,
                protocol: window.location.protocol,
                hostname: window.location.hostname,
                host: window.location.host,
                pathname: window.location.pathname,
                search: window.location.search,
                hash: window.location.hash
            },
        }]);

        worker.name = name;
        worker.onmessage = message_from_worker.bind(this, worker_id);
        worker.onerror = error_from_worker.bind(this, worker_id);

        workers[worker_id] = worker;

        return worker_id;
    }

    function ensure_hostname(url) {
        if (!url.startsWith("http:") && !url.startsWith('https:')) {
            if (!url.startsWith("/")) {
                url = "/" + url;
            }
            url = window.location.protocol + "//" + window.location.host + url;
        }
        return url;
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

    /**
     * Terminate a web-worker
     */
    function exit(wid) {
        if(wid === 0) return;

        const worker = workers[wid];
        if(!worker) return;

        worker.terminate();
        delete workers[wid];
    }

    function receive(handler) {
        receive_handler = handler;
    }

    cotonic.set_worker_base_src = set_worker_base_src;

    cotonic.spawn = spawn;
    cotonic.spawn_named = spawn_named;
    cotonic.exit = exit;

    cotonic.send = send;
    cotonic.receive = receive;
}(cotonic));
