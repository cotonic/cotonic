importScripts("/src/cotonic_global.js", "/src/cotonic.mqtt.js");

function initialize() {
    self.publish("connect-deps/init", true);
    return self.whenDependenciesProvided([]);
}

function depsProvided() {
    self.publish("connect-deps/done", true);
}

self.connect({name: "connect-resolve"})
    .then(initialize)
    .then(depsProvided);

