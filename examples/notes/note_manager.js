/*
 * Note manager, manages notes on the screen.
 */

"use strict";

console.log("Note manager starting");

function request(topic, timeout) {
    return new Promise(
        function(resolve, reject) {
            const resp_topic = "nm/response"
            let timeout_ref;

            function response_handler(msg, bindings) {
                try {
                    resolve(msg, bindings);
                } finally {
                    if(timeout_ref !== undefined) {
                        clearTimeout(timeout_ref)
                        timeout_ref = undefined;
                    }
                    self.unsubscribe(resp_topic, response_handler);
                }
            }

            self.subscribe(resp_topic, response_handler);

            timeout_ref = setTimeout(
                function() {
                    try {
                        reject("timeout");
                    } finally {
                        self.unsubscribe(resp_topic, response_handler);
                    }
                },
                timeout);

            self.publish("model/localStorage/get/notes", undefined, {
                properties: {
                    response_topic: resp_topic
                }});
        });
}

self.on_connect = function() {
    console.log("Note manager connected");

    self.subscribe("id/add-note/click",
        function() {
            console.log("Adding note");
        })

    request("model/localStorage/get/notes", 1000)
        .then(
            function(msg, bindings) {
                console.log("request-then", msg, bindings);
            })
        .catch(
            function(err) {
                console.log("request-catch", err);
            })

        /*
    self.publish("model/localStorage/get/notes", undefined, {
        properties: {
            response_topic: "note-manager/response"
        }});
        */
}

self.on_error = function(error) {
    console.log("Note manager error", error);
}

self.connect();



