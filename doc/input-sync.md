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

A topic can also be enforced:

    <input name="foo" data-input-topic="some/topic" />

Or a base topic on the form:

    <form name="bar" data-input-topic="hello/world" />

The individual values will be placed under this topic, for example: `hello/world/foo`
(Unless the input defined its own topic, in that case that topic is used).

### Input-topic retained value

The retained value of an input-topic is the current CRDT.

## Input-topic post frequency

Posts of form changes are buffered, so rapid changes are combined
in a single topic post.

Posts of input changes are also buffered but for a shorter period.

In this way it is possible to subscribe to an input without being swamped.

If a form should be posted on submit then the `onsubmit` event handler
should be added:

    <form name="bar"