/*
 * Note process, manages a single note on the screen.
 */

"use strict";

console.log("Note process starting");

self.on_connect = function() {
    console.log("Note process connected");
}

self.on_error = function(error) {
    console.log("Note process error", error);
}

self.connect();


