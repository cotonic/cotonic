# Synchronizing input element states

## Problem

The state of input elements is separate from the attributes in the DOM.

We want to be able to re-sync the DOM without resetting the state
of input elements to their initial value.

## Solution

Decouple the state of the input elements from the DOM tree.

The state will be recorded and manipulated separately from the DOM updates.

 * use CRDT to record value of input element
 * connect CRDT with DOM element (in the DOM, so it is garbage collected)
 * oninput changes update the DOM-element-CRDT
 * components can subscribe to DOM-element-CRDTs (the updater always publishes)
 * components set state by publishing updated CRDT to the DOM-element-CRDT
 * on conflict, DOM state wins


### Input-topic naming

The name of an input CRDT topic is derived from its placement in the DOM.

    form/form-name/input-name

And if not within a form:

    form/undefined/input-name

### Input-topic retained value

The retained value of an input-topic is the current CRDT.
