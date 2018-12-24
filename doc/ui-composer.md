# UI Composer

The UI composer handles rendering the html snippets of all elements.


## `insertSorted(id, inner, initialData, priority)`

**Parameters**

  - `id` 
  - `inner` **[boolean]**
  - `initialData`
  - `priority` **[number]**

Insert a new element which has `id` into the ui composer. 

Elements with a low priority number are rendered before elements with a high number.
This allows for rendering nested components. The parent components will need to be
rendered before their containing elements.

### Example

```javascript
cotonic.ui.insertSorted("foo", false, "<div>foo</div>", 1000);
```

## `remove(id)`

**Parameters**

  - `id` 
 
Remove the element with `id` from the ui composer.

```javascript
cotonic.ui.remove("foo");
```

## `update(id, htmlOrTokens)`

Update the ui representation of element with `id`.

```javascript
cotonic.ui.update("foo", "<div>more foo</div>");
```

## `renderId(id)`

Render the element with id.

```javascript
cotonic.ui.renderId("foo");
```

## `renderElement(elt, id)`

Render the element with id in the given element.

```javascript
let elt = document.getElementById("someElement");

cotonic.ui.renderElement(elt, "foo");
```

## `render()`

Do a full render of all elements.

```javascript

cotonic.ui.render();
```

## on(topic, msg, event, options)

...

