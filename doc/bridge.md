# MQTT bridges

The bridge relays messages between local topic tree and remote servers and clients.

The reponsibilities of the bridge include:

 * Relay messages from the local topic tree to remotes
 * Rewrite topics in the relayed messages
 * Receive messages from remotes, republish on the local topic tree
 * Manage the credentials/tokens for the remotes
 * Start connections with the remotes, using above credentials
 * Signing relayed messages, check signatures on received messages

## Bridging via topics

The client can publish and subscribe to topics like:

    bridge/origin/foo/bar

Where *origin* is the remote server where the current page originated from.

This topic is rewritten as `foo/bar` and relayed to the origin server.

The client itself can be reached via a special reply topic on the server.
The client-bridge subscribes to two topics:

    bridge/<client-id>/#
    bridge/<routing-code>/#

The routing code is returned in the MQTT `connack` properties as `cotonic-routing-code`.
If no routing code was returned, then the client-id bridge is used.
The routing-code is generated anew with every clean start.

This routing-code is used to prevent leaking the client-id to other clients.
The client-id based bridge is used for system messages, not originating from other clients.


## Security concerns

We have to add access permission checks for relaying messages to the client via the bridge.
Only an administrator level user can bridge from the server to any client-topic.

Other users or anonymous users can only bridge to two topics:

    public/#
    reply/#

The client workers can listen to these topics and know that they can receive information
from external servers or clients.

## Using WebRTC DataChannel

We are going to use WebRTC DataChannels for direct communication with other clients.
The server will be used to exchange the connection information between two clients.

If the clients can connect then a new WebRTC bridge is started where the name of the
bridge topic reflects the address of the remote client.


## Examples

Say we have clients C and D, and an originating server S.

### Example 1: publish a message from a client to a server

C wants to publish something to S.

    C: publish("bridge/origin/foo/bar", "Hello from C")

As the bridge on C is subscribed to `bridge/#` it will receive this message.
The bridge changes the topic from `bridge/origin/foo/bar` to `foo/bar` and then
publishes the message on S using the MQTT connection between C and S.

    Bridge C -> S: publish("foo/bar", "Hello from C")

### Example 2: client subscribes to topic on server

C wants to subscribe to a topic on S.

C subscribes on C to the topic `bridge/origin/foo/#`.
The routing code on C adds this subscription to C's topic tree, recognizes the `bridge/`
prefix and then calls the bridge module.

The bridge module (on C) rewrits the topic to `foo/#` and subscribes on S using the
MQTT connection between C and S.

On S some code publishes to `foo/a/b`. This matches the subscription topic, so the
publish message is sent (via the MQTT connection) to C. The bridge on C receives the
publication and rewrites the topic in the publish message to `bridge/origin/foo/a/b`.
After the topic is rewritten the message is published to the local topic tree.

To prevent a publish/subscribe loop the bridge will subscribe to the local C topic
`bridge/#` with a `no_local` flag. This prevents the bridge from receiving messages
its own messages sent to the bridge topic.

### Example 3: server publishes (unsollicited) message to client

The server S wants to publish a message to client C.

For S needs to know either C's client-id or C's routing-id. This is normally stored in the
`#context{}` when C makes requests (much like the session and page id with the old Zotonic).

Say the client-id is `HR7qGCihmnjD6UU4tJyB`, then the MQTT session on S is subscribed
to the topic `bridge/HR7qGCihmnjD6UU4tJyB/#`.

To send the message from S to C, the server S publishes a message to the local topic tree:

    S: publish("bridge/HR7qGCihmnjD6UU4tJyB/public/foo/bar", "Hello from S")

The MQTT session on S receives this publication and sends it to C via the MQTT connection.
On C the bridge receives the publication and rewrites the topic, after which it republishes
the message on C:

    bridge on C: publish("public/foo/bar", "Hello from S")


### Example 4: server subscribes to client topic

Server S wants to subscribe to a topic on C.

This can't be done directly, as C is the MQTT client and S is the MQTT server.
The client C might also want to restrict the topics S subscribes to.

To make this possible S subscribes to a special bridge topic on S:

    S: subscribe("$bridge/HR7qGCihmnjD6UU4tJyB/foo/bar")

The MQTT server code on S recognize the special `$bridge` and handles the message.
It performs the following steps:

 1. S looks up the session associated with `HR7qGCihmnjD6UU4tJyB`
 2. S forwards the subscribe request to C via the session:

        S: publish("bridge/HR7qGCihmnjD6UU4tJyB/bridge", OriginalSubscribeMessage)

 3. The bridge on C rewrites the topic to `bridge`, recognizes the topic and then
    processes the subscribe message.
 4. The bridge on C rewrites the topic in the original subscribe message to `foo/bar`
 5. The bridge on C subscribes to `foo/bar` on C (which will perform an access control check)

Now the subscription is established

If a message is published on C to `foo/bar`:

    C: publish("foo/bar", "This is on C")

Then:

 1. The bridge on C receives the publish message (due to its subscription to `foo/bar`)
 2. The bridge on C checks its administration, rewrites the topic to `$bridge/HR7qGCihmnjD6UU4tJyB/foo/bar`
    (which is the topic in the subscription made on S).
 3. The bridge publishes the message (using the QoS in the subscription) via the MQTT
    connection to S
 4. The session on S receives the message and publishes it on the rewritten topic on S

        S: publish("$bridge/HR7qGCihmnjD6UU4tJyB/foo/bar", "This is on C")

 5. This is received by the original subscriber

This subscription needs to be managed in the presence of disappearing sessions and subscribers.

On S we add logic so that:

 * if the session on S is killed then subscription on S is removed (maybe send a special message?)
 * if the subscriber on S is killed then (if there are not any other subscribers) the subscription
   on C is removed.

On C we add logic to the bridge, so that:

 * if the session with S is restarted, the subscription on C is removed


### Example 5: publish from client C to client D via S

A client can reach another client by publishing to the correct topics.
In this case C must be know the routing-id of D, assume it is `lDDujwS2CW4NclvvcP1c`.

In this case on C we publish a message:

    C: publish("bridge/origin/bridge/lDDujwS2CW4NclvvcP1c/public/foo/bar", "Hello from C")

The bridge on C rewrites the topic to `bridge/lDDujwS2CW4NclvvcP1c/public/foo/bar` and
forwards it to the origin server S.

On S the session publishes it to the topic `bridge/lDDujwS2CW4NclvvcP1c/public/foo/bar`.
Client D's session is subscribed to that topic and will forward the message to D.

On D the bridge code will rewrite the topic to `public/foo/bar` and publishes the message
to the local topic tree on D.

## A note about rewriting topics

If a publish topic is rewritten by a bridge, then it also rewrites the `response_topic` in the
publish message's properties.

If a client C receives a publish from S (at origin) then the rewrite of the respone topic
by the bridge on C will be:

    on bridge C: foo/bar
             --> bridge/origin/foo/bar

This ensures that the response is indeed relayed to the topic `foo/bar` on the origin server.

If C sends a message to D via S, the response topic rewrites will be:

    on bridge C: reply/my/topic
             --> bridge/HR7qGCihmnjD6UU4tJyB/reply/my/topic

Then the message is published on S. The session of D receives it and forwards it to D. The bridge on
D will once again rewrite the response topic:

    on bridge D: bridge/HR7qGCihmnjD6UU4tJyB/reply/my/topic
             --> bridge/origin/bridge/HR7qGCihmnjD6UU4tJyB/reply/my/topic

Now a publish to the reponse topic on D will correctly forward via S to client C.

