# Synchronizing input element states

Solution direction:

 * use CRDT to record value
 * connect CRDT with DOM element
 * record input changes by updating CRDT
 * CRDT changes are always published
 * components set state by publishing updated CRDT to a topic
 * components can subscribe to CRDTs
 * on conflict, UI state wins
 
To decide: name of topic.

Proposal: name of input, within component topic

`component/.../form/.../<input-name>`

