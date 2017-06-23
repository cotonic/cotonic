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

### Connecting a CRDT to an input element

An input receives a CRDT if (and only if) that element publishes its changes.

    <input oninput="cotonic.publish()" />

The topic can be filled in automatically, and the published value defaults
to the CRDT, (some) event data, the input element's dataset, and some
information about the enclosed form.

Another way a CRDT is initialized is by publishing a new CRDT to the
input element's topic.

### Name of the input element's topic

The name of an input CRDT topic is derived from its placement in the DOM.

    form/form-name/input-name

And if not within a form:

    form/undefined/input-name

A topic can also be enforced:

    <input name="foo" data-cotonic-topic="some/topic" />

Or a base topic on the form:

    <form name="bar" data-cotonic-topic="hello/world" />

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
needs to be added:


    <form onsubmit="cotonic.publish()" ... > ... </form>

