
"use strict";

console.log("clock worker here");

self.on_connect = function() {
    console.log("connected");

    let date = new Date();

    self.publish("model/ui/insert/second", 
        {initialData: second_hand(date), inner: true, priority: 10});
    self.publish("model/ui/insert/minute",
        {inner: true, initialData: minute_hand(date), priority: 10});
    self.publish("model/ui/insert/hour",
        {inner: true, initialData: hour_hand(date), priority: 10});

    setInterval(function() {
        let date = new Date();

        self.publish("model/ui/update/second", second_hand(date));
        self.publish("model/ui/update/minute", minute_hand(date));
        self.publish("model/ui/update/hour", hour_hand(date));

    }, 1000);
};

self.connect("clock-worker");
console.log("called connect");

function second_hand(date) {
    const angle = date.getSeconds() * 6;

    // Return svg snippet
    return `<g transform="rotate(${angle})">
        <line stroke="crimson" opacity="0.7" stroke-linecap="round" stroke-width="2" y1="-20" y2="102"></line>

        <circle fill="crimson" opacity="0.7" r="4"></circle>
    </g>`;
}

function minute_hand(date) {
    const angle = date.getMinutes() * 6;

    return `<g transform="rotate(${angle})">
        <line stroke="steelblue" opacity="0.8" stroke-linecap="round" stroke-width="4" y2="93"></line>
        <circle fill="steelblue" opacity="0.8" r="6"></circle>
    </g>`;
}

function hour_hand(date) {
    const angle = (date.getHours() % 12) * 30 + date.getMinutes() / 2;

    return `<g transform="rotate(${angle})">
        <line opacity=".9" stroke="navy" stroke-linecap="round" stroke-width="5" y2="75"></line>
        <circle r="7" fill="navy" opacity="0.9"></circle>
    </g>`;
}

