
"use strict";

console.log("clock worker here");

importScripts("../src/cotonic.worker.js");

self.on_connect = function() {
    console.log("connected");

    let date = new Date();
    self.publish("ui/insert", {id: "second", inner: true, snippet: second_hand(date),  priority: 10});
    self.publish("ui/insert", {id: "minute", inner: true, snippet: minute_hand(date), priority: 10});
    self.publish("ui/insert", {id: "hour", inner: true, snippet: hour_hand(date), priority: 10});
    self.publish("ui/render");

    setInterval(function() {
        let date = new Date();
        self.publish("ui/update", {id: "second", snippet: second_hand(date)});
        self.publish("ui/update", {id: "minute", snippet: minute_hand(date)});
        self.publish("ui/update", {id: "hour", snippet: hour_hand(date)});
        self.publish("ui/render");
    }, 1000);
};

self.connect("clock-worker");

function second_hand(date) {
    const angle = date.getSeconds() * 6;

    // Return svg snippet
    return `<g transform="rotate(${angle})">
        <line stroke="red" stroke-linecap="round" stroke-width="2" y1="-20" y2="102"></line>
        <circle fill="blue" r="4"></circle>
    </g>`;
}

function minute_hand(date) {
    const angle = date.getMinutes() * 6;

    return `<g transform="rotate(${angle})">
        <line opacity=".9" stroke="green" stroke-linecap="round" stroke-width="4" y2="93"></line>
        <circle fill="red" r="6"></circle>
    </g>`;
}

function hour_hand(date) {
    const angle = (date.getHours() % 12) * 30 + date.getMinutes() / 2;

    return `<g transform="rotate(${angle})">
        <line opacity=".5" stroke="blue" stroke-linecap="round" stroke-width="5" y2="75"></line>
        <circle r="7"></circle>
    </g>`;
}
