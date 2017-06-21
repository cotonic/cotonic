# Communication protocol between Web Workers and the page

In cotonic we use multiple processes:

 * The page process, which access to the DOM
 * Web Workers, one for every active component

The page thread communicates with the Web Workers via the `window.postMessage` API.
This document proposes the communication protocol.

## Communication is PubSub via a topic tree

Interaction and communcication to/with Components is via a topic tree.
Every component has its own topic, assigned by the main page process.

The postMessage API is used to parcel PubSub messages between the component and the
topic tree. The topic tree is managed by the main page process.

## Subscriptions for the Web Worker

The Web Worker keeps track of all its subscriptions and maps these to the callback
functions.

The administration consists of:

 * Topic (wild cards possible)
 * Callback function
 * Local subscription id (provided by the web worker)
 * Global subscription id (provided by the page process)
 * Status (subscribing, subscribed, unsubscribing)

The page process subscribes to the topic tree using the unique subscription id.
There is a separate table mapping the subscription id to the correct Web Worker.

If a topic is matched then the Web Worker is signaled using the unique subscription id.

## Async postMessage communication protocol

All communication is async.

We use a simple protocol for the communication:

    {
        "cmd": "some-command",
        (whatever is arguments)
    }

The reply has always a *status* field:

    {
        "cmd": "some-command",
        "status": "ok",
        (whatever results)
    }

The status `ok` means all went well.
Any other status signals a problem.

Commands from the worker to the page:

    { "cmd": "subscribe", "topic": "some/topic/foo/bar", "local-id": "..." }

    { "cmd": "unsubscribe", "global-id": "..." }

    { "cmd": "publish", "topic": "some/topic/foo/bar", "payload": { ... } }

    { "cmd": "stop" }

Commands from the page to the worker:

    { "cmd": "start", "topic": "component/..." }

    { "cmd": "subscribed", "topic": "some/topic/foo/bar", "local-id": "...", "global-id": "..." }

    { "cmd": "unsubscribed", "global-id": "..." }

    { "cmd": "published", "global-id": "...", "payload": { ... } }

    { "cmd": "stop" }

## Mounting or unmounting a component from the page

If a component is detected in HTML, or added to the DOM then the following steps are taken:

 * Initial HTML is added to the DOM
 * Web Worker for the component is started (if not already running)
 * Subscription for `"component/.../mount"` and `".../unmount"` are added
 * The newly found element-id, including its datasets and the inner-html is published to `".../mount"`
 * If the composer discovers that a component is removed from the DOM then the `".../unmount"` is called
   with the id of the removed element.

After a component has started, it needs to publish a message to `"components/state"`, with the payload:

    { "topic": "component/...", "state": "started" }

Same just before a component stops:

    { "topic": "component/...", "state": "stopped" }

The id of a component is its main communication topic.


## Binding a component to DOM events

The components are easily bound to Javascript events using attributes like *onclick*.
Example:

    <a href="" onclick="cotonic.pub('~/my/click')" data-foo="...">...</a>

The page will walk up in the DOM tree to find the nearest component to expand `~`.
Click event data and the element's dataset is sent published to the topic.

