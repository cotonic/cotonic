

let calls = [ ];

function initialize() {
    calls.push("connect-resolved");
    self.publish("on-init-before-connect/done", calls);
}

self.on_init = function() {
    calls.push("on_init");
}

self.provides(["model/on-init-before-connect"]);

self.connect({name: "on-init-before-connect"})
    .then(initialize)

