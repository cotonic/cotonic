# Synchronizing input element states

Solution direction:

 * use CRDT to record value
 * connect CRDT with DOM element
 * record changes by connecting oninput
 * optionally publish changes via topic to components
 * on conflict, UI state wins
 
