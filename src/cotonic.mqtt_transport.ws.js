/**
 * Copyright 2018-2024 The Cotonic Authors. All Rights Reserved.
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

/*************************************************************************************************/
/********************************** Connections using Websocket **********************************/
/*************************************************************************************************/

const WS_CONTROLLER_PATH = '/mqtt-transport'; // Default controller for websocket connections etc.
const WS_CONNECT_DELAY = 20;                  // Wait 20msec before connecting via ws
const WS_PERIODIC_DELAY = 1000;               // Every second check the ws connection

import { encode, decode } from "./cotonic.mqtt_packet.js";
import { subscribe, unsubscribe } from "./cotonic.broker.js";

function newTransport( remote, mqttSession, options ) {
    return new ws(remote, mqttSession, options);
}

/**
 * Websocket connection.
 */
function ws ( remote, mqttSession, options ) {
    this.remoteUrl = undefined;
    this.remoteHost = undefined;
    this.session = mqttSession;
    this.socket = undefined;
    this.randomPing = undefined;
    this.backoff = 0;
    this.errorsSinceLastData = 0;
    this.awaitPong = false;
    this.isConnected = false;
    this.isForceClosed = false;
    this.data = undefined;

    const controller_path = options.controller_path || WS_CONTROLLER_PATH;
    const connect_delay = options.connect_delay || WS_CONNECT_DELAY;
    const periodic_delay = options.periodic_delay || WS_PERIODIC_DELAY;
    const protocol = options.protocol || ((document.location.protocol==='http:')?"ws":"wss");

    /**
     * Send a MQTT message to the other end. Encodes the message and
     * sends the data. Returns 'true' if able to send, 'false' when no
     * valid connection is available.
     * @todo: check socket.bufferedAmount to see if we are not sending
     *        too fast and should throttle
     */
    this.sendMessage = ( message ) => {
        if (isStateConnected()) {
            const b = encode( message );
            this.socket.send( b.buffer );
            if (message.type == 'disconnect') {
                this.closeConnection();
            }
            return true;
        } else {
            return false;
        }
    }

    /**
     * Name used to identify this transport.
     */
    this.name = () => {
        return "mqtt_transport.ws: " + this.remoteUrl;
    }

    /**
     * Force a close of this ws connection.
     */
    this.closeConnection = () => {
        if (isStateConnected() || isStateConnecting()) {
            this.socket.close();
            this.isConnected = false;
            this.isForceClosed = true;

            unsubscribe("model/lifecycle/event/state", {wid: this.name()});
        }
    }

    /**
     * Protocol error, close the connection and retry after backoff
     */
    this.closeReconnect = ( isNoBackOff ) => {
        if (isStateConnected() || isStateConnecting()) {
            this.socket.close();
            this.isConnected = false;
        }
        this.isForceClosed = false;
        if (isNoBackOff === true) {
            this.backoff = 0;
            connect();
        } else {
            setBackoff();
        }
    }

    /**
     * Ask to reopen the connection.
     */
    this.openConnection = () => {
        this.isForceClosed = false;
        connect();
    }


    /**
     * State functions. Checks if the connection is in a certain state.
     */
    const isStateConnected = () => {
        return !this.awaitPong
            && this.isConnected
            && this.socket
            && this.socket.readyState == 1;
    }

    const isStateConnecting = () => {
        return !this.isConnected
            || this.awaitPing
            || (this.socket && this.socket.readyState == 0);
    }

    const isStateClosed = () => {
        return !this.socket || this.socket.readyState == 3;
    }

    const isStateForceClosed = () => {
        return this.isForceClosed;
    }

    /**
     * Periodic state check. Checks if needs an action like connect.
     */
    const periodic = () => {
        if (isStateClosed() && !isStateForceClosed()) {
            if (this.backoff > 0) {
                this.backoff--;
            } else {
                connect();
            }
        }
    }

    const handleError = ( reason ) => {
        console.log("Closing websocket connection to "+this.remoteUrl+" due to "+reason);
        this.errorsSinceLastData++;
        if (isStateConnected()) {
            this.socket.close();
            this.isConnected = false;
        } else {
            this.isConnected = (this.socket.readyState == 1);
        }
        setBackoff();
        this.session.disconnected('ws', reason);
    }

    /**
     * Connect to the remote server.
     */
    const connect = () => {
        if (!isStateClosed()) {
            return false;
        }
        if (isStateForceClosed()) {
            return false
        }
        this.data = new Uint8Array(0);
        this.isConnected = false;
        this.awaitPong = true;
        this.socket = undefined;

        let callOnOpen = false;
        const onopen = () => {
            this.isConnected = true;
            if (this.socket.protocol == 'mqtt.cotonic.org') {
                // Send ping and await pong to check channel.
                this.randomPing = new Uint8Array([
                    255, 254, 42, Math.floor(Math.random()*100), Math.floor(Math.random()*100)
                ]);
                this.socket.send( this.randomPing.buffer );
                this.awaitPong = true;
            } else {
                this.awaitPong = false;
                this.session.connected('ws');
            }
        };

        if (globalThis.cotonic
            && globalThis.cotonic.bridgeSocket
            && globalThis.cotonic.bridgeSocket.url == this.remoteUrl) {
            switch (globalThis.cotonic.bridgeSocket.readyState) {
                case 0:
                    this.socket = cotonic.bridgeSocket;
                    break;
                case 1:
                    callOnOpen = true;
                    this.socket = cotonic.bridgeSocket;
                    break;
                default:
                    break;
            }
            globalThis.cotonic.bridgeSocket = undefined;
        }
        if (!this.socket) {
            // EMQ is erronously accepting any protocol starting with `mqtt`, so it accepts
            // 'mqtt.cotonic.org', which starts the extra handshake.
            // this.socket = new WebSocket( this.remoteUrl, [ "mqtt.cotonic.org", "mqtt" ] );
            this.socket = new WebSocket( this.remoteUrl, [ "mqtt" ] );
        }
        this.socket.binaryType = 'arraybuffer';
        this.socket.onopen = onopen;
        this.socket.onclose = function() {
            handleError('ws-close');
        };;
        this.socket.onerror = function() {
            handleError('ws-error');
        };;
        this.socket.onmessage = ( message ) => {
            if (message.data instanceof ArrayBuffer) {
                const data = new Uint8Array(message.data);

                if (this.awaitPong) {
                    if (equalData(data, this.randomPing)) {
                        this.awaitPong = false;
                        this.session.connected('ws');
                    } else {
                        handleError('ws-pongdata');
                    }
                } else {
                    receiveData(data);
                }
            }
        };
        if (callOnOpen) {
            onopen();
        }

        // Listen for ui state changes. Reset the backoff to allow quick reconnects
        // when a page is activated. 
        subscribe("model/lifecycle/event/state",
            (m) => {
                if(m.payload === "active") {
                    this.backoff = 0;
                }
            },
            {wid: this.name()}
        );

        return true;
    }

    function equalData( a, b ) {
        if (a.length == b.length) {
            for (let i = 0; i < a.length; i++) {
                if (a[i] != b[i]) {
                    return false;
                }
            }
            return true;
        } else {
            return false;
        }
    }

    const receiveData = ( rcvd ) => {
        if (this.data.length == 0) {
            this.data = rcvd;
        } else {
            let k = 0;
            const newdata = new Uint8Array(this.data.length, rcvd.length);
            for (let i = 0; i < this.data.length; i++) {
                newdata[k++] = this.data[i];
            }
            for (let i = 0; i < rcvd.length; i++) {
                newdata[k++] = rcvd[i];
            }
            this.data = newdata;
        }
        decodeReceivedData();
    }

    const decodeReceivedData = () => {
        let ok = true;
        while (ok && this.data.length > 0) {
            try {
                const result = decode(this.data);
                handleBackoff( result[0] );
                this.data = result[1];
                this.session.receiveMessage(result[0]);
            } catch (e) {
                if (e != 'incomplete_packet') {
                    handleError(e);
                }
                ok = false;
            }
        }
    }

    const setBackoff = () => {
        this.backoff = Math.min(30, this.errorsSinceLastData * this.errorsSinceLastData);
    }

    const handleBackoff = ( msg ) => {
        switch (msg.type) {
            case 'connack':
                if (msg.reason_code > 0) {
                    this.errorsSinceLastData++;
                }
                break;
            case 'disconnect':
                break;
            default:
                this.errorsSinceLastData = 0
                break;
        }
    }

    const init = () => {
        if (remote == 'origin') {
            this.remoteHost = document.location.host;
        } else {
            this.remoteHost = remote;
        }

        this.remoteUrl = protocol + "://" + this.remoteHost + controller_path;

        setTimeout(connect, connect_delay);
        setInterval(periodic, periodic_delay);

    }

    init();
}

export { newTransport };

