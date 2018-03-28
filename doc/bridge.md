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
The routing-code is generated a-new for every clean start.

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
