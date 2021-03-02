
console.log("on_connect_on_depends");

importScripts("/src/polyfill_worker.js",
              "/src/cotonic.mqtt.js");

self.on_depends_provided = function() {
    self.publish("on_connect_on_depends_order/called", {
        callback: "on_depends_provided"}
    );

    // This callback should be called after init.
    console.log("done");
    self.publish("on_connect_on_depends_order/done");
}

function init() {
    self.publish("on_connect_on_depends_order/called", {
        callback: "init"});
}

self.connect({name: "on_connect_on_depends_order"}).then(init);

