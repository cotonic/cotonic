/**
 * A simple worker which does nothing but connecting to the page
 *
 * Used by 'index.html' to spawn an empty worker to allow users
 * to play with worker api calls in the console.
 */

"use strict"

// The arguments passed by the page are stored here.
let page_arguments = null;

self.worker_init = function() {
    page_arguments = arguments;
}

self.connect();
