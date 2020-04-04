# COTONIC

*Infrastructure for your web page.*

Read the [documentation](https://cotonic.org/)

## What is Cotonic?

Cotonic is a JavaScript library.

Infrastructure for communication:

 * Publish and subscribe to a topic tree on your web page
 * Publish and subscribe between tabs in the same browser
 * Publish and subscribe between the page and a (MQTT)[http://mqtt.org/] server
 * Subscribe to topics on the page _and_ the server
 * Publish from the server to the page
 * Publish from the page to the server

Infrastructure for using Web Workers:

 * Start and stop Web Workers
 * Communicate with and between Web Workers using the topic tree
 * Use a Service Worker for seamless communication between pages

Building blocks for managing state and html:

 * Update HTML elements with new content, using incremental DOM updates
 * Reflect state in the attributes of html and body tags, use
   css to communicate to change the page according to the state

The great thing is that you can use the parts separately.

## Why do you need this?

Today's websites are build by multi-disciplinary teams. A lot of sites
also include services from other companies. All these components usually
run inside the same global calling context. This can lead to the following
problems.

  * **Privacy** problems. All JavaScript which is loaded on a page has
    access to all dom-elements on a page. This includes private information like
    names, date's, financial information and passwords.
  * **Isolation** problems. All JavaScript code on a page runs in the same
    execution context. They sometimes unintentionally share resources which
    can lead to crashes.

This is similar to having a computer without an operating system. In the
early days of computing every user had the sole use of the entire machine
for a specific time slot. But today's web pages mix the execution of code
from different sources in one execution context. In order to let things run
reliably we need proper isolation and resource sharing primitives which are 
usually provided by operating systems.

## How are we providing isolation?

By using modern web api's like web-workers we can truly isolate components.
By doing this a crash in one component can never affect other component.
With this architecture it possible to restart crashed components, and dynamically
load new versions. The use of true decoupling with makes it possible run components
on the server, another, or IoT device.

## How are we providing privacy?

We can encrypt all sensitive payloads between the server and the client. The
encryption uses public/private key pairs unique to the client.

## What is used for the client/server communication?

The client/server p2p communication uses MQTT v5. Internaly Cotonic uses a
topic tree similar to MQTT. All components use this tree for their communication.

There are special *bridge* topics for the communication with the server or other
clients. The *origin* server is always connected on *bridge/origin/*. Response
topics are mapped when packets pass through the bridge. In this way the server
and the client can communicate via topics.

## Supported Browsers

Cotonic depends on the Web Worker, so it is supported on IE11 and up.

## Dependencies:

https://github.com/google/incremental-DOM

## Want to help?

Do you want to help? We are in active development. All help is welcome. Feel free 
to ask questions or provide feedback.

## Development

Cotonic uses Web Workers and a Service Worker. Browsers only support Web Workers served from
https or http if you serve from _localhost_ or a _127.x.y.z_ address. This  means that you
can't do Web Worker development without a working http server. Luckily most Unix environments
have Python installed. In order to start start development you can run the start_dev script.

```
$ ./start_dev.sh
Serving HTTP on 127.0.0.1 port 6227 ...
127.0.0.1 - - [28/Jan/2018 07:57:27] "GET /test/ HTTP/1.1" 200 -
...
```

This will start a simple Python webserver which serves the current working directory, and
point your browser to the directory with tests.

## Software using Cotonic

Cotonic is integrated into the content management system (Zotonic)[http://zotonic.com/].

## Thanks

Big thanks to the (SIDN Fonds)[https://www.sidnfonds.nl] for supporting our development.

## TODO

Integration of encryption components and p2p communication using webrtc.

