# COTONIC

*An operating system for your web page.*

## Why do you need this?

Today's websites are build by multi-disciplinary teams. A lot of sites
also include services from other companies. All these components usually
run inside the same global calling context. This can lead to the following
problems.

  * **Privacy** problems. All javascript which is loaded on a page has
    access to all dom-elements on a page. This includes private information like
    names, date's, financial information and passwords. 
  * **Isolation** problems. All javascript code on a page runs in the same
    execution context. They sometimes unintentionally share resources which
    can lead to crashes.
	
This is similar to having a computer without an operating system. In the
early days of computing every user had the sole use of the entire machine
for a specific time slot. But today's web pages mix the execution of code
from different sources in one execution context. In order to let things run
reliably we need proper isolation and resource sharing primitives which are 
usually provided by operating systems.

## How are we going to provide isolation?

By using modern web api's like web-workers we can truly isolate components.
By doing this a crash in one component can never affect other component.
With this architecture it possible to restart crashed components, and dynamically
load new versions. The use of true decoupling with makes it possible run components
on the server, another, or IoT device.

## Supported Browsers

Cotonic depends on the Web Worker, so it is supported on IE10 and up.

## Dependencies:

https://github.com/google/incrementalDOM

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

cotonic.subscribe("~self", function(message, params) {
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



