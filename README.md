# COTONIC

## What is Cotonic?

Cotonic is a modern, cooperative, independent, component framework. A tool to organize client side components in robust 
independently operating units.

## How?

By using modern web api's like web workers we can truly isolate components from each other. By doing this a crash in one
component can't affect other components. This architecture makes it possible to restart crashed components, or dynamically
load new versions. The use of true decoupling with pubsub makes it possible to run components on the server, another 
browser, or IoT device.

## Supported Browsers

Cotonic depends on the Web Worker, so it is supported on IE10 and up.

## Dependencies:

https://github.com/google/incrementalDOM, https://github.com/davedoesdev/qlobber

## Usage

The main page

```javascript
// Not finalized yet, but something like this

var my_component_topic = cotonic.spawn('component.js')
cotonic.publish(my_component_topic, {do: "something", target: "x123"});

// The component publishes ui updates to ui composer. The ui composer caches html fragements
// and uses incrementalDOM efficiently update the existing dom tree.
```

A component

```javascript
importScript('cotonic.worker.js'); // Load the worker part of the library.

function something(target) {
    cotonic.publish("~pagesession/ui/update", {target: target, htmlsoup: "<span>Soup</span>"});
}

cotonic.subscribe("~self", function(topic, message) {
    if(message.do == "something"))
        something(message.target);
});

```

## Want to help?

Do you want to help? We are in the early stages of development. All help is welcome. Feel free 
to ask questions or provide feedback.

## Development

Cotonic uses web-workers. Browsers only support web-workers served from http or https. This 
means that you can't do web-worker development without a working http server. Luckily most
unix environments have python installed. In order to start start development you can run 
the start_dev script.

```
$ ./start_dev.sh
Serving HTTP on 127.0.0.1 port 6227 ...
127.0.0.1 - - [28/Jan/2018 07:57:27] "GET /test/ HTTP/1.1" 200 -
...
```

This will start a simple python webserver which serves the current working directory, and
point your browser to the directory with tests.

## TODO

* Design Worker <-> Page postMessage protocol. Needs to support worker starts, stops, restarts, code upgrades, 
  error handling and relay pub/sub messages.



