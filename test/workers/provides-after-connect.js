
importScripts("/src/cotonic_global.js", "/src/cotonic.mqtt.js");

function initialize() {
    self.provides(["model/provides-after-connect"]);

    self.publish("provides-after-connect/done", true);
}

self.connect({name: "provides-after-connect"})
    .then(initialize)

