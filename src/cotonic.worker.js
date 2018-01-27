/**
 * Copyright 2016, 2017 The Cotonic Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

 /**
  * Description of messages

  topic:

   message-cmd:
       CONNECT, CONNACK,

       PUBLISH,
       PUBACK,
       PUBREC,
       PUBREL,
       PUBCOMP,

       SUBSCRIBE,
       PUBCOMP,
       SUBSCRIBE,
       SUBACK,
       UNSUBSCRIBE,
       UNSUBACK,

       PINGREQ,
       PINGRESP,
       DISCONNECT

   message:
   {cmd:<message-cmd>,
      payload: <payload>

   connect-payload:
       {client_identifier: <id>,
            will_topic: <topic>,
            will_message: <payload>}
  */

"use strict";

/* Cotonic worker code */

(function(self) {
    /* disconnected, connecting, connected */
    var sub_id = 0;
    var subscriptions = {}; /* sub_id -> callback */

    /**
     * Worker states
     */

    /* The worker is not connected to the page */
    var disconnected = {
        onMessage: function(e) {},
        onError: function(e) {}
    }

    /* The worker send a connect message and is waiting for response */
    var connecting = {
        onMessage: function(e) {
            var cmd = e.data.cmd;

            if(cmd != "connack") {
                self.state = disconnected;
            }

            if(self.on_connect) self.on_connec();
        }
    }

    /* The worker is connected, we can subscribe and receive messages */
    var connected = {
        onMessage: function(e) {
            var cmd = e.data.cmd;

            if (cmd == "publish") {
                var sub_info = subscriptions[e.data.id];
                sub_info.callback(e.data.topic, e.data.payload);
                return;
            }

            if(cmd == "suback") {
                var sub_info = subscriptions[e.data.id];
                if(sub_info.sub_ack) {
                    sub_info.sub_ack();
                    sub_info.sub_ack = undefined;
                }
                return;
            }

            if(cmd == "disconnect") {
            }

        }
    }

    var state; /* disconnected, connecting, connected */

    function init(endpoint) {
        self.state = disconnected;

        endpoint.addEventListener("message", self.state.onMessage);
        endpoint.addEventListener("error", self.state.onError);
    }

    function _onError() {
    }

    var selfClose = self.close;

    self.close = function() {
        self.disconnect();
        selfClose();
    }

    self.connect = function(id, willTopic, willMessage) {
        if(state === disconnected) {

            /* */
            self.state = connecting;
            self.postMessage({cmd: "connect", id: id, willTopic: willTopic, willMessage: willMessage});

            /* connect timeout */
        } else {
            // wrong state
        }
    }

    self.is_connected = function() {
        return self.state === connected;
    }

    self.disconnect = function() {
        if(self.state !== connected) return;
    }

    self.publish = function(topic, payload) {
        if(!self.is_connected()) throw "not connected"

        self.postMessage({cmd: "publish", topic: topic, payload: payload});
    }

    self.subscribe = function(topic, callback, sub_ack) {
        if(!self.is_connected()) throw "not connected"

        var id = sub_id++;
        subscriptions[id] = {callback: callback, sub_ack: sub_ack};

        self.postMessage({cmd: "subscribe", topic: topic, id: id});
    }

    self.unsubscribe = function(topic, callback) {
    }

    init(self);
})(self);