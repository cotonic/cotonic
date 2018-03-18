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
    const DB_NAME = "cotonic.keys";
    const DB_VERSION = 1;


    /* 
     * Open the database
     */
    function open(options) {
        let session = options.session;
        let indexedDB = window.indexedDB; 
        let req = indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = function(e) {
            let db = e.target.result;
            let store = db.createObjectStore("store", {autoIncrement: true});
            
            store.createIndex("by_session", "session", {unique: false});
            store.createIndex("by_created", "created", {unique: false});
            store.createIndex("by_name", ["session", "name"], {unique: true});
        }

        req.onsuccess = function(e) {
            let db = e.target.result;
            let tx = db.transaction("store", options.mode);
            let store = tx.objectStore("store");

            tx.onabort = options.onabort;
            tx.oncomplete = options.oncomplete;
            tx.onerror = options.onerror;

            let ops = {
                set: function(name, entry) {
                    store.put({
                        session: session,
                        name: name,
                        entry: entry,
                        created: new Date()});
                },

                get: function(name) {
                    let index = store.index("by_name");
                    let range = IDBKeyRange.only([session, name]);
                    let g = index.get([session, name]);

                    g.onsuccess = function(e) {
                        options.onget(name, e.target.result);
                    };

                    g.onerror = function(e) {
                        console.log(e)
                    };
                }
            };

            options.onsuccess(ops);
        }

        req.onerror = function(e) {
            console.log(e);
            if(options.onopenerror) options.onopenerror(e);
        }
    }


    /*
    function setEntry(session, name, entry) {
        let tx = db.transaction(["keys"], "write");
        tx.oncomplete = function(e) { console.log("complete", e); };
        tx.onerror = function(e) { console.log("error", e); };

        let keys = tx.objectStore("keys");

        keys.put({session: session, name: name, entry: entry, created: new Data()});
    }

    function getEntry(session, name) {
        let tx = db.transaction(["keys"], "read");

        tx.oncomplete = function(e) { console.log("complete", e); };
        tx.onerror = function(e) { console.log("error", e); };

        let keys = tx.objectStore("keys");
        let index = keys.index("by_name");

        index.get([session, name]).onsuccess = function(e) {
            console.log("got", e.target.result);
        }
    }
    */

    cotonic.keystore = cotonic.keystore || {};

    // External API
    cotonic.keystore.open = open;

})(cotonic);
