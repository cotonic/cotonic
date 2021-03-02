importScripts("/src/polyfill_worker.js",
              "/src/cotonic.mqtt.js");

function init() {
    self.publish("connect-resolve/done", true);
}

self.connect({name: "connect-resolve"}).then(init);

