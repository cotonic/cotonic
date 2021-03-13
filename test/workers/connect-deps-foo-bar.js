importScripts("/src/polyfill_worker.js",
              "/src/cotonic.mqtt.js");

function initialize() {
    self.publish("connect-deps-foo-bar/init", true);

    return self.whenDependenciesProvided(["model/foo","model/bar"]);
}

function depsProvided() {
    self.publish("connect-deps-foo-bar/done", "deps-are-resolved");
}

self.connect({name: "connect-deps-foo-bar"})
    .then(initialize)
    .then(depsProvided);

