
import { VERSION, config, ready, readyResolve, spawn, spawn_named, whereis } from "./cotonic.js";

import "./require_idom.js"; // Exports a global IncrementalDOM reference.

import * as idom from "./cotonic.idom.js";
import * as tokenizer from "./cotonic.tokenizer.js";
import * as ui from "./cotonic.ui.js";
import * as mqtt from "./cotonic.mqtt.js";
import * as broker from "./cotonic.broker.js";
import * as mqtt_packet from "./cotonic.mqtt_packet.js";
import * as mqtt_transport_ws from "./cotonic.mqtt_transport.ws.js";
import * as mqtt_session from "./cotonic.mqtt_session.js";
import * as mqtt_bridge from "./cotonic.mqtt_bridge.js";
import * as keyserver from "./cotonic.keyserver.js";

import "./cotonic.model.autofocus.js";
import "./cotonic.model.document.js";
import "./cotonic.model.lifecycle.js";
import "./cotonic.model.localStorage.js";
import "./cotonic.model.sessionStorage.js";
import "./cotonic.model.location.js";
import "./cotonic.model.serviceWorker.js";
import "./cotonic.model.sessionId.js";
import "./cotonic.model.ui.js";
import "./cotonic.model.window.js";

let cotonic = globalThis.cotonic || {};
if(!globalThis.cotonic) {
    globalThis.cotonic = cotonic;
}

cotonic.VERSION = VERSION;
cotonic.ready = ready;
cotonic.readyResolve = readyResolve;
cotonic.spawn = spawn;
cotonic.spawn_named = spawn_named;
cotonic.whereis = whereis;
        
cotonic.idom = idom;
cotonic.tokenizer = tokenizer;
cotonic.ui = ui;
cotonic.mqtt = mqtt;
cotonic.broker = broker;
cotonic.mqtt_packet = mqtt_packet;
cotonic.mqtt_transport = { ws: mqtt_transport_ws };
cotonic.mqtt_session = mqtt_session;
cotonic.mqtt_bridge = mqtt_bridge;
cotonic.keyserver = keyserver;

cotonic.ready.then(() => {
        window.dispatchEvent((new Event("cotonic-ready")));
});

// Resolve the cotonic.ready promise
cotonic.readyResolve();
