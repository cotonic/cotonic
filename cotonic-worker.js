(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/cotonic.mqtt.js
  var cotonic_mqtt_exports = {};
  __export(cotonic_mqtt_exports, {
    exec: () => exec,
    extract: () => extract,
    fill: () => fill,
    matches: () => matches,
    remove_named_wildcards: () => remove_named_wildcards
  });
  var SEPARATOR = "/";
  var SINGLE = "+";
  var ALL = "#";
  function exec(pattern, topic) {
    return matches(pattern, topic) ? extract(pattern, topic) : null;
  }
  function matches(pattern, topic) {
    const patternSegments = pattern.split(SEPARATOR);
    const topicSegments = topic.split(SEPARATOR);
    const patternLength = patternSegments.length;
    const topicLength = topicSegments.length;
    const lastIndex = patternLength - 1;
    for (let i = 0; i < patternLength; i++) {
      const currentPattern = patternSegments[i];
      const patternChar = currentPattern[0];
      const currentTopic = topicSegments[i];
      if (!currentTopic && !currentPattern)
        continue;
      if (!currentTopic && currentPattern !== ALL)
        return false;
      if (patternChar === ALL)
        return i === lastIndex;
      if (patternChar !== SINGLE && currentPattern !== currentTopic)
        return false;
    }
    return patternLength === topicLength;
  }
  function fill(pattern, params) {
    const patternSegments = pattern.split(SEPARATOR);
    const patternLength = patternSegments.length;
    const result = [];
    for (let i = 0; i < patternLength; i++) {
      const currentPattern = patternSegments[i];
      const patternChar = currentPattern[0];
      const patternParam = currentPattern.slice(1);
      const paramValue = params[patternParam];
      if (patternChar === ALL) {
        if (paramValue !== void 0)
          result.push([].concat(paramValue).join(SEPARATOR));
        break;
      } else if (patternChar === SINGLE)
        result.push("" + paramValue);
      else
        result.push(currentPattern);
    }
    return result.join(SEPARATOR);
  }
  function extract(pattern, topic) {
    const params = {};
    const patternSegments = pattern.split(SEPARATOR);
    const topicSegments = topic.split(SEPARATOR);
    const patternLength = patternSegments.length;
    for (let i = 0; i < patternLength; i++) {
      const currentPattern = patternSegments[i];
      const patternChar = currentPattern[0];
      if (currentPattern.length === 1)
        continue;
      if (patternChar === ALL) {
        params[currentPattern.slice(1)] = topicSegments.slice(i);
        break;
      } else if (patternChar === SINGLE) {
        params[currentPattern.slice(1)] = topicSegments[i];
      }
    }
    return params;
  }
  function remove_named_wildcards(pattern) {
    const patternSegments = pattern.split(SEPARATOR);
    const patternLength = patternSegments.length;
    const mqttPattern = [];
    for (let i = 0; i < patternLength; i++) {
      const currentPattern = patternSegments[i];
      const patternChar = currentPattern[0];
      if (patternChar === ALL || patternChar == SINGLE) {
        mqttPattern.push(patternChar);
      } else {
        mqttPattern.push(currentPattern);
      }
    }
    return mqttPattern.join(SEPARATOR);
  }

  // src/cotonic.worker.js
  var model = {
    client_id: void 0,
    // Set to the wid
    name: void 0,
    // Name if named spawn
    init_args: void 0,
    // Arguments provided on init
    response_topic_prefix: void 0,
    response_topic_nr: 1,
    response_handlers: {},
    // response_topic -> { timeout, handler }
    is_importing: false,
    message_queue: [],
    connected: false,
    connecting: false,
    connect_accept: void 0,
    connect_reject: void 0,
    packet_id: 1,
    subscriptions: {},
    // topic -> [callback]
    pending_acks: {},
    // sub-id -> callback
    // Tracking functionality provided by the worker
    published_provides: [],
    // Already published provides.
    unpublished_provides: [],
    // Pending provides, will be published when the worker connects.
    // Tracking dependencies needed by the worker
    is_tracking_dependencies: false,
    // Flag to indicate the worker is subscribed to the dep tracking topics.
    resolved_dependencies: [],
    // List with resolved dependencies. 
    waiting_on_dependency: {},
    // name -> list of waiting promises. 
    waiting_on_dependency_count: 0
    // number of waiting promises. 
  };
  model.handleImportDone = function(isImportDone) {
    if (!isImportDone)
      return;
    if (!model.is_importing)
      return;
    model.is_importing = false;
    if (self.on_init) {
      self.on_init.apply(null, [model.init_args]);
    }
    while (model.message_queue.length > 0) {
      const msg = model.message_queue.shift();
      setTimeout(() => {
        model.present(msg);
      }, 0);
    }
  };
  model.handleProvides = function(provides) {
    if (provides === void 0)
      return;
    const is_connected = state.connected(model);
    for (let i = 0; i < provides.length; i++) {
      if (is_connected) {
        model.publishProvide(provides[i]);
      } else {
        model.unpublished_provides.push(provides[i]);
      }
    }
  };
  model.handleWhenDependencyProvided = function(name, resolve) {
    if (name === void 0)
      return;
    if (model.resolved_dependencies.includes(name)) {
      resolve(model.init_args);
      return;
    }
    if (state.connected(model)) {
      if (model.waiting_on_dependency_count > 0 && !model.is_tracking_dependencies) {
        model.startTrackingDependencies();
      }
    }
    let waiters = model.waiting_on_dependency[name];
    if (waiters === void 0) {
      waiters = [];
      model.waiting_on_dependency[name] = waiters;
    }
    waiters.push(resolve);
    model.waiting_on_dependency_count += 1;
  };
  model.handleDependencyProvided = function(name, is_provided) {
    if (name === void 0 || !is_provided)
      return;
    const waiters = model.waiting_on_dependency[name];
    if (waiters !== void 0) {
      for (let i = 0; i < waiters.length; i++) {
        waiters[i]();
        model.waiting_on_dependency_count -= 1;
      }
      delete model.waiting_on_dependency[name];
    }
    if (!model.resolved_dependencies.includes(name)) {
      model.resolved_dependencies.push(name);
    }
  };
  model.publishProvide = function(provide) {
    if (state.isProvidePublished(provide, model))
      return;
    if (provide.match(/^model\//)) {
      self.publish(provide + "/event/ping", "pong", { retain: true });
    } else {
      self.publish("worker/" + provide + "/event/ping", "pong", { retain: true });
    }
    model.published_provides.push(provide);
  };
  model.startTrackingDependencies = function() {
    self.subscribe(
      "model/+model/event/ping",
      function(msg, bindings) {
        actions.model_ping({ model: bindings.model, payload: msg.payload });
      }
    );
    self.subscribe(
      "worker/+worker/event/ping",
      function(msg, bindings) {
        actions.worker_ping({ worker: bindings.worker, payload: msg.payload });
      }
    );
    self.subscribe(
      "$bridge/origin/status",
      function(msg) {
        actions.bridge_origin_status(msg.payload);
      }
    );
    model.is_tracking_dependencies = true;
  };
  model.present = function(data) {
    model.handleImportDone(data.import_done);
    if (model.is_importing) {
      model.message_queue.push(data);
      return;
    }
    model.handleProvides(data.provides);
    model.handleWhenDependencyProvided(data.when_dependency_provided, data.resolve);
    model.handleDependencyProvided(data.provided, data.is_provided);
    if (state.connected(model)) {
      if (data.type === "publish") {
        if (data.from == "client") {
          let options = data.options || {};
          let msg = {
            type: "publish",
            topic: data.topic,
            payload: data.payload,
            qos: options.qos || 0,
            retain: options.retain || false,
            properties: options.properties || {}
          };
          self.postMessage(msg);
        } else {
          if (typeof model.response_handlers[data.topic] === "object") {
            try {
              clearTimeout(model.response_handlers[data.topic].timeout);
              model.response_handlers[data.topic].handler(data);
              delete model.response_handlers[data.topic];
            } catch (e) {
              console.error("Error during callback of: " + data.topic, e);
            }
          } else {
            for (let pattern in model.subscriptions) {
              if (matches(pattern, data.topic)) {
                let subs = model.subscriptions[pattern];
                for (let i = 0; i < subs.length; i++) {
                  let subscription = subs[i];
                  try {
                    subscription.callback(
                      data,
                      extract(
                        subscription.topic,
                        data.topic
                      )
                    );
                  } catch (e) {
                    console.error("Error during callback of: " + pattern, e);
                  }
                }
              }
            }
          }
        }
      }
      if (data.type === "subscribe" && data.from === "client") {
        let new_subs = [];
        let new_topics = [];
        let packet_id = model.packet_id++;
        for (let k = 0; k < data.topics.length; k++) {
          let t = data.topics[k];
          let mqtt_topic = remove_named_wildcards(t.topic);
          if (model.subscriptions[mqtt_topic]) {
            let subs = model.subscriptions[mqtt_topic];
            subs.push({ topic: t.topic, callback: data.callback });
            if (data.ack_callback) {
              setTimeout(data.ack_callback, 0);
            }
          } else {
            let newsub = {
              topic: mqtt_topic,
              qos: t.qos || 0,
              retain_handling: t.retain_handling || 0,
              retain_as_published: t.retain_as_published || false,
              no_local: t.no_local || false
            };
            new_subs.push(newsub);
            new_topics.push(t.topic);
          }
        }
        if (new_topics.length > 0) {
          self.postMessage({ type: "subscribe", topics: new_subs, packet_id });
          data.subs = new_subs;
          data.topics = new_topics;
          model.pending_acks[packet_id] = data;
        }
      }
      if (data.type === "suback" && data.from === "broker") {
        let pending = model.pending_acks[data.packet_id];
        if (pending) {
          delete model.pending_acks[data.packet_id];
          for (let k = 0; k < pending.topics.length; k++) {
            let subreq = pending.subs[k];
            let mqtt_topic = subreq.topic;
            if (model.subscriptions[mqtt_topic] === void 0) {
              model.subscriptions[mqtt_topic] = [];
            }
            if (data.acks[k] < 128) {
              model.subscriptions[mqtt_topic].push({
                topic: pending.topics[k],
                sub: subreq,
                callback: pending.callback
              });
            }
            if (pending.ack_callback) {
              setTimeout(pending.ack_callback, 0, mqtt_topic, data.acks[k], subreq);
            }
          }
          if (pending.ack_callback) {
            delete pending.ack_callback;
          }
        }
      }
      if (data.type === "unsubscribe" && data.from === "client") {
        let packet_id = model.packet_id++;
        let mqtt_topics = [];
        for (let k = 0; k < data.topics.length; k++) {
          let t = data.topics[k];
          let mqtt_topic = remove_named_wildcards(t);
          mqtt_topics.push(mqtt_topic);
        }
        self.postMessage({ type: "unsubscribe", topics: mqtt_topics, packet_id });
        data.mqtt_topics = mqtt_topics;
        model.pending_acks[packet_id] = data;
      }
      if (data.type === "unsuback" && data.from === "broker") {
        let pending = model.pending_acks[data.packet_id];
        if (pending) {
          delete model.pending_acks[data.packet_id];
          for (let i = 0; i < pending.mqtt_topics.length; i++) {
            let mqtt_topic = pending.mqtt_topics[i];
            if (data.acks[i] < 128) {
              let subs = model.subscriptions[mqtt_topic];
              for (let k = subs.length - 1; k >= 0; k--) {
                delete subs[k].callback;
                delete subs[k];
              }
              delete model.subscriptions[mqtt_topic];
            }
            if (pending.ack_callback) {
              setTimeout(pending.ack_callback, 0, mqtt_topic, data.acks[i]);
            }
          }
          if (pending.ack_callback) {
            delete pending.ack_callback;
          }
        }
      }
      if (data.type === "pingreq" && data.from === "client") {
        self.postMessage({ type: "pingreq" });
      }
      if (data.type === "pingresp" && data.from === "broker") {
      }
      if (data.type === "subscribe_response_handler" && data.from === "client") {
        model.response_handlers[data.topic] = data.handler;
        model.response_topic_nr++;
      }
      if (data.type === "remove_response_handler" && data.from === "client") {
        delete model.response_handlers[data.topic];
      }
    } else if (state.disconnected(model)) {
      if (data.type === "connect") {
        model.connected = false;
        model.connecting = true;
        model.connect_accept = data.connect_accept;
        model.connect_reject = data.connect_reject;
        self.postMessage({
          type: "connect",
          client_id: model.client_id,
          will_topic: data.will_topic,
          will_payload: data.will_payload
        });
      }
    } else if (state.connecting(model)) {
      const accept = model.connect_accept;
      const reject = model.connect_reject;
      model.connect_accept = void 0;
      model.connect_reject = void 0;
      if (data.type == "connack" && data.from == "broker") {
        model.connecting = false;
        model.connected = true;
        model.handleProvides(model.unpublished_provides);
        model.unpublished_provides = [];
        if (model.waiting_on_dependency_count > 0 && !model.is_tracking_dependencies) {
          model.startTrackingDependencies();
        }
        self.subscribe(
          model.response_topic_prefix + "+",
          self.response,
          () => {
            accept(model.init_args);
          }
        );
      } else if (data.connect_timeout) {
        model.connected = false;
        model.connecting = false;
        if (reject) {
          reject("connect_timeout");
        }
      }
    } else {
    }
    state.render(model);
  };
  var view = {};
  view.display = function() {
  };
  var state = { view };
  state.representation = function() {
    let representation;
    state.view.display(representation);
  };
  state.nextAction = function(model2) {
    if (state.connecting(model2)) {
      actions.connect_timeout({}, model2.present);
    }
  };
  state.render = function(model2) {
    state.representation(model2);
    state.nextAction(model2);
  };
  model.state = state;
  state.disconnected = function(model2) {
    return !model2.connected && !model2.connecting;
  };
  state.connected = function(model2) {
    return model2.connected && !model2.connecting;
  };
  state.connecting = function(model2) {
    return !model2.connected && model2.connecting;
  };
  state.isProvidePublished = function(provides, model2) {
    return model2.published_provides.includes(provides);
  };
  var actions = {};
  function client_cmd(type, data, present) {
    present = present || model.present;
    data.from = "client";
    data.type = type;
    present(data);
  }
  actions.on_message = function(e) {
    let data = e.data;
    if (data.type) {
      data.from = "broker";
      model.present(e.data);
    }
  };
  actions.on_error = function() {
  };
  actions.import_done = function(e) {
    model.present({ import_done: true });
  };
  actions.import_failed = function(e) {
    console.error("Spawn import failed:", e);
  };
  actions.disconnect = client_cmd.bind(null, "disconnect");
  actions.connect = client_cmd.bind(null, "connect");
  actions.subscribe = client_cmd.bind(null, "subscribe");
  actions.unsubscribe = client_cmd.bind(null, "unsubscribe");
  actions.publish = client_cmd.bind(null, "publish");
  actions.pingreq = client_cmd.bind(null, "pingreq");
  actions.subscribe_response_handler = client_cmd.bind(null, "subscribe_response_handler");
  actions.remove_response_handler = client_cmd.bind(null, "remove_response_handler");
  actions.connect_timeout = function(data, present) {
    present = present || model.present;
    let d = data, p = present;
    setTimeout(function() {
      d.connect_timeout = true;
      p(d);
    }, 1e3);
  };
  actions.model_ping = function(data) {
    model.present({
      is_provided: data.payload === "pong",
      provided: "model/" + data.model
    });
  };
  actions.worker_ping = function(data) {
    model.present({
      is_provided: data.payload === "pong",
      provided: "worker/" + data.worker
    });
  };
  actions.bridge_origin_status = function(data) {
    model.present({
      is_provided: data.is_connected || false,
      provided: "bridge/origin"
    });
  };
  actions.when_dependency_provided = function(name) {
    return new Promise(function(resolve) {
      model.present({
        when_dependency_provided: name,
        resolve
      });
    });
  };
  actions.provides = function(provides) {
    model.present({
      provides
    });
  };
  self.is_connected = function() {
    return state.connected(model);
  };
  self.connect = function(options) {
    options = options || {};
    if (self.on_connect)
      console.error("Using self.on_connect is no longer supported. Please use the returned promise");
    if (self.on_error)
      console.error("Using on_error is no longer supported. Please use the returned promise");
    let depsPromise;
    if (options.depends) {
      depsPromise = self.whenDependenciesProvided(options.depends);
    }
    const connectPromise = new Promise(
      function(accept, reject) {
        options.connect_accept = accept;
        options.connect_reject = reject;
        actions.connect(options);
      }
    );
    if (depsPromise)
      return Promise.all([connectPromise, depsPromise]);
    return Promise.all([connectPromise]);
  };
  self.subscribe = function(topics, callback, ack_callback) {
    let ts;
    if (typeof topics == "string") {
      ts = [
        {
          topic: topics,
          qos: 0,
          retain_handling: 0,
          retain_as_published: false,
          no_local: false
        }
      ];
    } else {
      ts = topics;
    }
    actions.subscribe({ topics: ts, callback, ack_callback });
  };
  self.unsubscribe = function(topics, callback, ack_callback) {
    let ts;
    if (typeof topics == "string") {
      ts = [topics];
    } else {
      ts = topics;
    }
    actions.unsubscribe({ topics: ts, callback, ack_callback });
  };
  self.publish = function(topic, payload, options) {
    actions.publish({ topic, payload, options });
  };
  self.pingreq = function() {
    actions.pingreq({});
  };
  self.disconnect = function() {
    actions.disconnect({});
  };
  self.call = function(topic, payload, options) {
    options = options || {};
    if (options.qos === void 0)
      options.qos = 1;
    const timeout = options.timeout || 15e3;
    const willRespond = new Promise(
      function(resolve, reject) {
        let response_topic = model.response_topic_prefix + model.response_topic_nr;
        let timer = setTimeout(function() {
          actions.remove_response_handler({ topic: response_topic });
          let reason = new Error("Worker timeout waiting for response on " + topic);
          reject(reason);
        }, timeout);
        const handler = {
          handler: resolve,
          timeout: timer
        };
        actions.subscribe_response_handler({ topic: response_topic, handler });
        options.properties = options.properties || {};
        options.properties.response_topic = response_topic;
        const pubdata = {
          topic,
          payload,
          options
        };
        actions.publish(pubdata);
      }
    );
    return willRespond;
  };
  self.abs_url = function(path) {
    return model.location.origin + path;
  };
  self.whenDependencyProvided = function(dependency) {
    return actions.when_dependency_provided(dependency);
  };
  self.whenDependenciesProvided = function(dependencies) {
    const promises = [];
    for (let i = 0; i < dependencies.length; i++) {
      promises.push(actions.when_dependency_provided(dependencies[i]));
    }
    return Promise.all(promises);
  };
  self.provides = function(provides) {
    actions.provides(provides);
  };
  function handle_init(e) {
    if (e.data[0] !== "init")
      throw "Worker handle_init error. Wrong init message.";
    self.removeEventListener("message", handle_init);
    model.client_id = e.data[1].wid;
    model.name = e.data[1].name || void 0;
    model.location = e.data[1].location;
    model.response_topic_prefix = "worker/" + model.client_id + "/response/";
    model.init_args = e.data[1].args;
    const url = e.data[1].url;
    model.is_importing = true;
    if (url) {
      import(url).then(actions.import_done).catch(actions.import_failed);
    } else {
      setTimeout(actions.import_done, 0);
    }
    self.addEventListener("message", actions.on_message);
    self.addEventListener("error", actions.on_error);
  }
  self.addEventListener("message", handle_init);

  // src/index-worker-bundle.js
  var cotonic = {};
  cotonic.mqtt = cotonic_mqtt_exports;
  globalThis.cotonic = cotonic;
})();
/**
 * @preserve
 * Copyright 2016-2023 The Cotonic Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
