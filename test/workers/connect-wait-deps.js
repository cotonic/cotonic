importScripts("/src/polyfill_worker.js",
              "/src/cotonic.mqtt.js");

function init() {
    self.publish("connect-wait-deps/done", true);
}

self.connect({name: "connect-wait-deps",
              provides: [ "model/connect-wait-deps" ],
              depends: [ "model/a", "model/b" ]}).then(init);

