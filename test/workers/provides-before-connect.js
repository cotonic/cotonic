
importScripts("/src/cotonic.mqtt.js");

function initialize() {
    self.publish("provides-before-connect/done", true);
}

self.provides(["model/provides-before-connect"]);

self.connect({name: "provides-before-connect"})
    .then(initialize)

