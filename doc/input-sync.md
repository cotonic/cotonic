# Synchronizing input element states

Solution direction:

 * use CRDT to record value
 * connect CRDT with DOM element
 * record changes by connecting oninput
 * components publish state by posting a CRDT to a topic
 * components can subscribe to CRDTs
 * on conflict, UI state wins
 
To decide: name of topic.
Proposal: id or name of input, within component topic
`~/input/crdt/<name-or-id>`

If generated id, then id is not used.
