/*
 *
 */

const cotonic = {};

import * as mqtt from "./cotonic.mqtt.js";
cotonic.mqtt = mqtt;

import "./cotonic.worker.js";

globalThis.cotonic = cotonic;
