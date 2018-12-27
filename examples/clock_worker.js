
"use strict";

console.log("Clock worker starting");

self.on_connect = function() {
    console.log("Clock worker connected");

    let date = new Date();

    self.publish("model/ui/insert/second", {inner: true, initialData: second_hand(date),  priority: 10});
    self.publish("model/ui/insert/minute", {inner: true, initialData: minute_hand(date), priority: 10});
    self.publish("model/ui/insert/hour", {inner: true, initialData: hour_hand(date), priority: 10});

    self.publish("model/ui/render");

    setInterval(function() {
        date = new Date();

        self.publish("model/ui/update/second", second_hand(date));
        self.publish("model/ui/update/minute", minute_hand(date));
        self.publish("model/ui/update/hour", hour_hand(date));

        self.publish("model/ui/render");
    }, 1000);
};

self.on_error = function(error) {
    console.log("Clock worker error", error);
}

self.connect();

console.log("Clock worker connecting....");

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
