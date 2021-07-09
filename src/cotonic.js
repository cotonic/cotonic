/**
 * Copyright 2018-2021 The Cotonic Authors. All Rights Reserved.
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
cotonic.VERSION = "1.0.7";

(function(cotonic) {
    cotonic.config = cotonic.config || {};

    /* Get the data-base-worker-src from the script tag that loads
     * cotonic on this page.
     */
    (function() {
        const currentScript = document.currentScript || (function() {
            const scripts = document.getElementsByTagName("script");
            return scripts[scripts.length - 1];
        })();

        if(currentScript && currentScript.getAttribute("data-base-worker-src")) {
            load_config_defaults({base_worker_src:
                currentScript.getAttribute("data-base-worker-src")});
        } else {
            load_config_defaults({base_worker_src:
                "/lib/cotonic/cotonic-worker-bundle.js?v=1"})
        }
    })();

    let next_worker_id = 1;
    let workers = {};
    let named_worker_ids = {};
    let receive_handler = null;

    /**
     * Load config defaults into the cotonic.config object. Modules
     * can call this function to add their default config settings
     */
    function load_config_defaults(options) {
        for(let key in options) {
            if(!cotonic.config.hasOwnProperty(key)) {
                cotonic.config[key] = options[key];
            }
        }
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
        if(!cotonic.config.base_worker_src){
            throw("Can't spawn worker, no data-base-worker-src attribute set.");
        }
        return spawn_named("", url, cotonic.config.base_worker_src, args);
    }

    /**
     * Start a named worker - named workers are unique
     * Use "" or 'undefined' for a nameless worker.
     */
    function spawn_named(name, url, base, args) {
        // Return the existing worker_id if already running.
        if (name && named_worker_ids[name]) {
            return named_worker_ids[name];
        }
        base = base || cotonic.config.base_worker_src;
        if(!base) {
            throw("Can't spawn worker, no data-base-worker-src attribute set.");
        }
        const worker_id = next_worker_id++;
        const worker = new Worker(base, {name: name?name:worker_id.toString()});

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
        if (name) {
            named_worker_ids[name] = worker_id;
        }
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

        if (worker.name) {
            delete named_worker_ids[worker.name];
        }
        worker.terminate();
        delete workers[wid];
    }

    /**
     * Lookup the wid of a named worker
     */
    function whereis(name) {
        if (name && named_worker_ids[name]) {
            return named_worker_ids[name];
        }
        return undefined;
    }

    function receive(handler) {
        receive_handler = handler;
    }

    /**
     * Clean the sessionStorage on open of new window.
     * Keep keys that are prefixed with "persist-".
     */
    function cleanupSessionStorage() {
        if (!window.name || window.name == "null") {
            window.name = makeid(32);
        }
        if (sessionStorage.getItem('windowName') != window.name) {
            let keys = Object.keys(sessionStorage);
            for (let i in keys) {
                let k = keys[i];
                if (!k.match(/^persist-/)) {
                    sessionStorage.removeItem(k);
                }
            }
        }
        sessionStorage.setItem('windowName', window.name);
    }

    /**
     * Generate a random id of length characters
     */
    function makeid(length) {
        let result     = '';
        let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let len        = characters.length;
        for (let i = 0; i < length; i++ ) {
            result += characters.charAt(Math.floor(Math.random() * len));
        }
        return result;
    }

    if (!cotonic.ready) {
        cotonic.ready = new Promise(function(resolve) { cotonic.readyResolve = resolve; });
    }

    cleanupSessionStorage();

    cotonic.load_config_defaults = load_config_defaults;

    cotonic.spawn = spawn;
    cotonic.spawn_named = spawn_named;
    cotonic.whereis = whereis;
    cotonic.exit = exit;

    cotonic.send = send;
    cotonic.receive = receive;
}(cotonic));
