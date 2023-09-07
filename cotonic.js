(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // lib/incremental-dom-cjs.js
  var require_incremental_dom_cjs = __commonJS({
    "lib/incremental-dom-cjs.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var keyAttributeName = "key";
      function getKeyAttributeName() {
        return keyAttributeName;
      }
      function setKeyAttributeName(name) {
        keyAttributeName = name;
      }
      var inAttributes = false;
      var inSkip = false;
      var inPatch = false;
      function assert(val) {
        if (!val) {
          throw new Error("Expected value to be defined");
        }
        return val;
      }
      function assertInPatch(functionName) {
        if (!inPatch) {
          throw new Error("Cannot call " + functionName + "() unless in patch.");
        }
      }
      function assertNoUnclosedTags(openElement, root2) {
        if (openElement === root2) {
          return;
        }
        let currentElement2 = openElement;
        const openTags = [];
        while (currentElement2 && currentElement2 !== root2) {
          openTags.push(currentElement2.nodeName.toLowerCase());
          currentElement2 = currentElement2.parentNode;
        }
        throw new Error("One or more tags were not closed:\n" + openTags.join("\n"));
      }
      function assertPatchOuterHasParentNode(parent) {
        if (!parent) {
          console.warn("patchOuter requires the node have a parent if there is a key.");
        }
      }
      function assertNotInAttributes(functionName) {
        if (inAttributes) {
          throw new Error(functionName + "() can not be called between elementOpenStart() and elementOpenEnd().");
        }
      }
      function assertNotInSkip(functionName) {
        if (inSkip) {
          throw new Error(functionName + "() may not be called inside an element that has called skip().");
        }
      }
      function assertInAttributes(functionName) {
        if (!inAttributes) {
          throw new Error(functionName + "() can only be called after calling elementOpenStart().");
        }
      }
      function assertVirtualAttributesClosed() {
        if (inAttributes) {
          throw new Error("elementOpenEnd() must be called after calling elementOpenStart().");
        }
      }
      function assertCloseMatchesOpenTag(currentNameOrCtor, nameOrCtor) {
        if (currentNameOrCtor !== nameOrCtor) {
          throw new Error('Received a call to close "' + nameOrCtor + '" but "' + currentNameOrCtor + '" was open.');
        }
      }
      function assertNoChildrenDeclaredYet(functionName, previousNode) {
        if (previousNode !== null) {
          throw new Error(functionName + "() must come before any child declarations inside the current element.");
        }
      }
      function assertPatchElementNoExtras(maybeStartNode, maybeCurrentNode, expectedNextNode, expectedPrevNode) {
        const startNode = assert(maybeStartNode);
        const currentNode2 = assert(maybeCurrentNode);
        const wasUpdated = currentNode2.nextSibling === expectedNextNode && currentNode2.previousSibling === expectedPrevNode;
        const wasChanged = currentNode2.nextSibling === startNode.nextSibling && currentNode2.previousSibling === expectedPrevNode;
        const wasRemoved = currentNode2 === startNode;
        if (!wasUpdated && !wasChanged && !wasRemoved) {
          throw new Error("There must be exactly one top level call corresponding to the patched element.");
        }
      }
      function updatePatchContext(newContext) {
        inPatch = newContext != null;
      }
      function setInAttributes(value2) {
        const previous = inAttributes;
        inAttributes = value2;
        return previous;
      }
      function setInSkip(value2) {
        const previous = inSkip;
        inSkip = value2;
        return previous;
      }
      var hasOwnProperty = Object.prototype.hasOwnProperty;
      function Blank() {
      }
      Blank.prototype = /* @__PURE__ */ Object.create(null);
      function has(map, property) {
        return hasOwnProperty.call(map, property);
      }
      function createMap() {
        return new Blank();
      }
      function truncateArray(arr, length) {
        while (arr.length > length) {
          arr.pop();
        }
      }
      function createArray(initialAllocationSize) {
        const arr = new Array(initialAllocationSize);
        truncateArray(arr, 0);
        return arr;
      }
      var symbols = {
        default: "__default"
      };
      function getNamespace(name) {
        if (name.lastIndexOf("xml:", 0) === 0) {
          return "http://www.w3.org/XML/1998/namespace";
        }
        if (name.lastIndexOf("xlink:", 0) === 0) {
          return "http://www.w3.org/1999/xlink";
        }
        return null;
      }
      function applyAttr(el, name, value2) {
        if (value2 == null) {
          el.removeAttribute(name);
        } else {
          const attrNS = getNamespace(name);
          if (attrNS) {
            el.setAttributeNS(attrNS, name, String(value2));
          } else {
            el.setAttribute(name, String(value2));
          }
        }
      }
      function applyProp(el, name, value2) {
        el[name] = value2;
      }
      function setStyleValue(style, prop, value2) {
        if (prop.indexOf("-") >= 0) {
          style.setProperty(prop, value2);
        } else {
          style[prop] = value2;
        }
      }
      function applyStyle(el, name, style) {
        assert("style" in el);
        const elStyle = el.style;
        if (typeof style === "string") {
          elStyle.cssText = style;
        } else {
          elStyle.cssText = "";
          for (const prop in style) {
            if (has(style, prop)) {
              setStyleValue(elStyle, prop, style[prop]);
            }
          }
        }
      }
      function applyAttributeTyped(el, name, value2) {
        const type = typeof value2;
        if (type === "object" || type === "function") {
          applyProp(el, name, value2);
        } else {
          applyAttr(el, name, value2);
        }
      }
      var attributes = createMap();
      attributes[symbols.default] = applyAttributeTyped;
      attributes["style"] = applyStyle;
      function updateAttribute(el, name, value2) {
        const mutator = attributes[name] || attributes[symbols.default];
        mutator(el, name, value2);
      }
      var notifications = {
        nodesCreated: null,
        nodesDeleted: null
      };
      var Context = class {
        constructor() {
          this.created = [];
          this.deleted = [];
        }
        markCreated(node) {
          this.created.push(node);
        }
        markDeleted(node) {
          this.deleted.push(node);
        }
        /**
         * Notifies about nodes that were created during the patch operation.
         */
        notifyChanges() {
          if (notifications.nodesCreated && this.created.length > 0) {
            notifications.nodesCreated(this.created);
          }
          if (notifications.nodesDeleted && this.deleted.length > 0) {
            notifications.nodesDeleted(this.deleted);
          }
        }
      };
      function isDocumentRoot(node) {
        return node.nodeType === 11 || node.nodeType === 9;
      }
      function isElement(node) {
        return node.nodeType === 1;
      }
      function getAncestry(node, root2) {
        const ancestry = [];
        let cur = node;
        while (cur !== root2) {
          const n = assert(cur);
          ancestry.push(n);
          cur = n.parentNode;
        }
        return ancestry;
      }
      var getRootNode = typeof Node !== "undefined" && Node.prototype.getRootNode || function() {
        let cur = this;
        let prev = cur;
        while (cur) {
          prev = cur;
          cur = cur.parentNode;
        }
        return prev;
      };
      function getActiveElement(node) {
        const root2 = getRootNode.call(node);
        return isDocumentRoot(root2) ? root2.activeElement : null;
      }
      function getFocusedPath(node, root2) {
        const activeElement = getActiveElement(node);
        if (!activeElement || !node.contains(activeElement)) {
          return [];
        }
        return getAncestry(activeElement, root2);
      }
      function moveBefore(parentNode, node, referenceNode) {
        const insertReferenceNode = node.nextSibling;
        let cur = referenceNode;
        while (cur !== null && cur !== node) {
          const next = cur.nextSibling;
          parentNode.insertBefore(cur, insertReferenceNode);
          cur = next;
        }
      }
      var NodeData = class {
        constructor(nameOrCtor, key2, text2) {
          this._attrsArr = null;
          this.staticsApplied = false;
          this.nameOrCtor = nameOrCtor;
          this.key = key2;
          this.text = text2;
        }
        hasEmptyAttrsArr() {
          const attrs = this._attrsArr;
          return !attrs || !attrs.length;
        }
        getAttrsArr(length) {
          return this._attrsArr || (this._attrsArr = createArray(length));
        }
      };
      function initData(node, nameOrCtor, key2, text2) {
        const data = new NodeData(nameOrCtor, key2, text2);
        node["__incrementalDOMData"] = data;
        return data;
      }
      function isDataInitialized(node) {
        return Boolean(node["__incrementalDOMData"]);
      }
      function recordAttributes(node, data) {
        const attributes2 = node.attributes;
        const length = attributes2.length;
        if (!length) {
          return;
        }
        const attrsArr = data.getAttrsArr(length);
        for (let i = 0, j = 0; i < length; i += 1, j += 2) {
          const attr2 = attributes2[i];
          const name = attr2.name;
          const value2 = attr2.value;
          attrsArr[j] = name;
          attrsArr[j + 1] = value2;
        }
      }
      function importSingleNode(node, fallbackKey) {
        if (node["__incrementalDOMData"]) {
          return node["__incrementalDOMData"];
        }
        const nodeName = isElement(node) ? node.localName : node.nodeName;
        const keyAttrName = getKeyAttributeName();
        const keyAttr = isElement(node) && keyAttrName != null ? node.getAttribute(keyAttrName) : null;
        const key2 = isElement(node) ? keyAttr || fallbackKey : null;
        const data = initData(node, nodeName, key2);
        if (isElement(node)) {
          recordAttributes(node, data);
        }
        return data;
      }
      function importNode(node) {
        importSingleNode(node);
        for (let child = node.firstChild; child; child = child.nextSibling) {
          importNode(child);
        }
      }
      function getData(node, fallbackKey) {
        return importSingleNode(node, fallbackKey);
      }
      function getKey(node) {
        assert(node["__incrementalDOMData"]);
        return getData(node).key;
      }
      function clearCache(node) {
        node["__incrementalDOMData"] = null;
        for (let child = node.firstChild; child; child = child.nextSibling) {
          clearCache(child);
        }
      }
      function getNamespaceForTag(tag, parent) {
        if (tag === "svg") {
          return "http://www.w3.org/2000/svg";
        }
        if (tag === "math") {
          return "http://www.w3.org/1998/Math/MathML";
        }
        if (parent == null) {
          return null;
        }
        if (getData(parent).nameOrCtor === "foreignObject") {
          return null;
        }
        return parent.namespaceURI;
      }
      function createElement(doc2, parent, nameOrCtor, key2) {
        let el;
        if (typeof nameOrCtor === "function") {
          el = new nameOrCtor();
        } else {
          const namespace = getNamespaceForTag(nameOrCtor, parent);
          if (namespace) {
            el = doc2.createElementNS(namespace, nameOrCtor);
          } else {
            el = doc2.createElement(nameOrCtor);
          }
        }
        initData(el, nameOrCtor, key2);
        return el;
      }
      function createText(doc2) {
        const node = doc2.createTextNode("");
        initData(node, "#text", null);
        return node;
      }
      function defaultMatchFn(matchNode, nameOrCtor, expectedNameOrCtor, key2, expectedKey) {
        return nameOrCtor == expectedNameOrCtor && key2 == expectedKey;
      }
      var context = null;
      var currentNode = null;
      var currentParent = null;
      var doc = null;
      var focusPath = [];
      var matchFn = defaultMatchFn;
      var argsBuilder = [];
      var attrsBuilder = [];
      function getArgsBuilder() {
        return argsBuilder;
      }
      function getAttrsBuilder() {
        return attrsBuilder;
      }
      function matches2(matchNode, nameOrCtor, key2) {
        const data = getData(matchNode, key2);
        return matchFn(matchNode, nameOrCtor, data.nameOrCtor, key2, data.key);
      }
      function getMatchingNode(matchNode, nameOrCtor, key2) {
        if (!matchNode) {
          return null;
        }
        let cur = matchNode;
        do {
          if (matches2(cur, nameOrCtor, key2)) {
            return cur;
          }
        } while (key2 && (cur = cur.nextSibling));
        return null;
      }
      function clearUnvisitedDOM(maybeParentNode, startNode, endNode) {
        const parentNode = maybeParentNode;
        let child = startNode;
        while (child !== endNode) {
          const next = child.nextSibling;
          parentNode.removeChild(child);
          context.markDeleted(child);
          child = next;
        }
      }
      function getNextNode() {
        if (currentNode) {
          return currentNode.nextSibling;
        } else {
          return currentParent.firstChild;
        }
      }
      function enterNode() {
        currentParent = currentNode;
        currentNode = null;
      }
      function exitNode() {
        clearUnvisitedDOM(currentParent, getNextNode(), null);
        currentNode = currentParent;
        currentParent = currentParent.parentNode;
      }
      function nextNode() {
        currentNode = getNextNode();
      }
      function createNode(nameOrCtor, key2) {
        let node;
        if (nameOrCtor === "#text") {
          node = createText(doc);
        } else {
          node = createElement(doc, currentParent, nameOrCtor, key2);
        }
        context.markCreated(node);
        return node;
      }
      function alignWithDOM(nameOrCtor, key2) {
        nextNode();
        const existingNode = getMatchingNode(currentNode, nameOrCtor, key2);
        const node = existingNode || createNode(nameOrCtor, key2);
        if (node === currentNode) {
          return;
        }
        if (focusPath.indexOf(node) >= 0) {
          moveBefore(currentParent, node, currentNode);
        } else {
          currentParent.insertBefore(node, currentNode);
        }
        currentNode = node;
      }
      function open(nameOrCtor, key2) {
        alignWithDOM(nameOrCtor, key2);
        enterNode();
        return currentParent;
      }
      function close() {
        {
          setInSkip(false);
        }
        exitNode();
        return currentNode;
      }
      function text() {
        alignWithDOM("#text", null);
        return currentNode;
      }
      function currentElement() {
        {
          assertInPatch("currentElement");
          assertNotInAttributes("currentElement");
        }
        return currentParent;
      }
      function currentPointer() {
        {
          assertInPatch("currentPointer");
          assertNotInAttributes("currentPointer");
        }
        return getNextNode();
      }
      function skip() {
        {
          assertNoChildrenDeclaredYet("skip", currentNode);
          setInSkip(true);
        }
        currentNode = currentParent.lastChild;
      }
      function createPatcher(run, patchConfig = {}) {
        const { matches: matches3 = defaultMatchFn } = patchConfig;
        const f = (node, fn, data) => {
          const prevContext = context;
          const prevDoc = doc;
          const prevFocusPath = focusPath;
          const prevArgsBuilder = argsBuilder;
          const prevAttrsBuilder = attrsBuilder;
          const prevCurrentNode = currentNode;
          const prevCurrentParent = currentParent;
          const prevMatchFn = matchFn;
          let previousInAttributes = false;
          let previousInSkip = false;
          doc = node.ownerDocument;
          context = new Context();
          matchFn = matches3;
          argsBuilder = [];
          attrsBuilder = [];
          currentNode = null;
          currentParent = node.parentNode;
          focusPath = getFocusedPath(node, currentParent);
          {
            previousInAttributes = setInAttributes(false);
            previousInSkip = setInSkip(false);
            updatePatchContext(context);
          }
          try {
            const retVal = run(node, fn, data);
            {
              assertVirtualAttributesClosed();
            }
            return retVal;
          } finally {
            context.notifyChanges();
            doc = prevDoc;
            context = prevContext;
            matchFn = prevMatchFn;
            argsBuilder = prevArgsBuilder;
            attrsBuilder = prevAttrsBuilder;
            currentNode = prevCurrentNode;
            currentParent = prevCurrentParent;
            focusPath = prevFocusPath;
            {
              setInAttributes(previousInAttributes);
              setInSkip(previousInSkip);
              updatePatchContext(context);
            }
          }
        };
        return f;
      }
      function createPatchInner(patchConfig) {
        return createPatcher((node, fn, data) => {
          currentNode = node;
          enterNode();
          fn(data);
          exitNode();
          {
            assertNoUnclosedTags(currentNode, node);
          }
          return node;
        }, patchConfig);
      }
      function createPatchOuter(patchConfig) {
        return createPatcher((node, fn, data) => {
          const startNode = { nextSibling: node };
          let expectedNextNode = null;
          let expectedPrevNode = null;
          {
            expectedNextNode = node.nextSibling;
            expectedPrevNode = node.previousSibling;
          }
          currentNode = startNode;
          fn(data);
          {
            assertPatchOuterHasParentNode(currentParent);
            assertPatchElementNoExtras(startNode, currentNode, expectedNextNode, expectedPrevNode);
          }
          if (currentParent) {
            clearUnvisitedDOM(currentParent, getNextNode(), node.nextSibling);
          }
          return startNode === currentNode ? null : currentNode;
        }, patchConfig);
      }
      var patchInner2 = createPatchInner();
      var patchOuter2 = createPatchOuter();
      var buffer = [];
      var bufferStart = 0;
      function queueChange(fn, a, b, c) {
        buffer.push(fn);
        buffer.push(a);
        buffer.push(b);
        buffer.push(c);
      }
      function flush2() {
        const start = bufferStart;
        const end = buffer.length;
        bufferStart = end;
        for (let i = start; i < end; i += 4) {
          const fn = buffer[i];
          fn(buffer[i + 1], buffer[i + 2], buffer[i + 3]);
        }
        bufferStart = start;
        truncateArray(buffer, start);
      }
      var prevValuesMap = createMap();
      function calculateDiff(prev, next, updateCtx, updateFn) {
        const isNew = !prev.length;
        let i = 0;
        for (; i < next.length; i += 2) {
          const name = next[i];
          if (isNew) {
            prev[i] = name;
          } else if (prev[i] !== name) {
            break;
          }
          const value2 = next[i + 1];
          if (isNew || prev[i + 1] !== value2) {
            prev[i + 1] = value2;
            queueChange(updateFn, updateCtx, name, value2);
          }
        }
        if (i < next.length || i < prev.length) {
          const startIndex = i;
          for (i = startIndex; i < prev.length; i += 2) {
            prevValuesMap[prev[i]] = prev[i + 1];
          }
          for (i = startIndex; i < next.length; i += 2) {
            const name = next[i];
            const value2 = next[i + 1];
            if (prevValuesMap[name] !== value2) {
              queueChange(updateFn, updateCtx, name, value2);
            }
            prev[i] = name;
            prev[i + 1] = value2;
            delete prevValuesMap[name];
          }
          truncateArray(prev, next.length);
          for (const name in prevValuesMap) {
            queueChange(updateFn, updateCtx, name, void 0);
            delete prevValuesMap[name];
          }
        }
        flush2();
      }
      var ATTRIBUTES_OFFSET = 3;
      var prevAttrsMap = createMap();
      function diffAttrs(element, data) {
        const attrsBuilder2 = getAttrsBuilder();
        const prevAttrsArr = data.getAttrsArr(attrsBuilder2.length);
        calculateDiff(prevAttrsArr, attrsBuilder2, element, updateAttribute);
        truncateArray(attrsBuilder2, 0);
      }
      function diffStatics(node, data, statics) {
        if (data.staticsApplied) {
          return;
        }
        data.staticsApplied = true;
        if (!statics || !statics.length) {
          return;
        }
        if (data.hasEmptyAttrsArr()) {
          for (let i = 0; i < statics.length; i += 2) {
            updateAttribute(node, statics[i], statics[i + 1]);
          }
          return;
        }
        for (let i = 0; i < statics.length; i += 2) {
          prevAttrsMap[statics[i]] = i + 1;
        }
        const attrsArr = data.getAttrsArr(0);
        let j = 0;
        for (let i = 0; i < attrsArr.length; i += 2) {
          const name = attrsArr[i];
          const value2 = attrsArr[i + 1];
          const staticsIndex = prevAttrsMap[name];
          if (staticsIndex) {
            if (statics[staticsIndex] === value2) {
              delete prevAttrsMap[name];
            }
            continue;
          }
          attrsArr[j] = name;
          attrsArr[j + 1] = value2;
          j += 2;
        }
        truncateArray(attrsArr, j);
        for (const name in prevAttrsMap) {
          updateAttribute(node, name, statics[prevAttrsMap[name]]);
          delete prevAttrsMap[name];
        }
      }
      function elementOpenStart(nameOrCtor, key2, statics) {
        const argsBuilder2 = getArgsBuilder();
        {
          assertNotInAttributes("elementOpenStart");
          setInAttributes(true);
        }
        argsBuilder2[0] = nameOrCtor;
        argsBuilder2[1] = key2;
        argsBuilder2[2] = statics;
      }
      function key(key2) {
        const argsBuilder2 = getArgsBuilder();
        {
          assertInAttributes("key");
          assert(argsBuilder2);
        }
        argsBuilder2[1] = key2;
      }
      function attr(name, value2) {
        const attrsBuilder2 = getAttrsBuilder();
        {
          assertInPatch("attr");
        }
        attrsBuilder2.push(name);
        attrsBuilder2.push(value2);
      }
      function elementOpenEnd() {
        const argsBuilder2 = getArgsBuilder();
        {
          assertInAttributes("elementOpenEnd");
          setInAttributes(false);
        }
        const node = open(argsBuilder2[0], argsBuilder2[1]);
        const data = getData(node);
        diffStatics(node, data, argsBuilder2[2]);
        diffAttrs(node, data);
        truncateArray(argsBuilder2, 0);
        return node;
      }
      function elementOpen(nameOrCtor, key2, statics, ...varArgs) {
        {
          assertNotInAttributes("elementOpen");
          assertNotInSkip("elementOpen");
        }
        elementOpenStart(nameOrCtor, key2, statics);
        for (let i = ATTRIBUTES_OFFSET; i < arguments.length; i += 2) {
          attr(arguments[i], arguments[i + 1]);
        }
        return elementOpenEnd();
      }
      function applyAttrs() {
        const node = currentElement();
        const data = getData(node);
        diffAttrs(node, data);
      }
      function applyStatics(statics) {
        const node = currentElement();
        const data = getData(node);
        diffStatics(node, data, statics);
      }
      function elementClose(nameOrCtor) {
        {
          assertNotInAttributes("elementClose");
        }
        const node = close();
        {
          assertCloseMatchesOpenTag(getData(node).nameOrCtor, nameOrCtor);
        }
        return node;
      }
      function elementVoid(nameOrCtor, key2, statics, ...varArgs) {
        elementOpen.apply(null, arguments);
        return elementClose(nameOrCtor);
      }
      function text$1(value2, ...varArgs) {
        {
          assertNotInAttributes("text");
          assertNotInSkip("text");
        }
        const node = text();
        const data = getData(node);
        if (data.text !== value2) {
          data.text = value2;
          let formatted = value2;
          for (let i = 1; i < arguments.length; i += 1) {
            const fn = arguments[i];
            formatted = fn(formatted);
          }
          if (node.data !== formatted) {
            node.data = formatted;
          }
        }
        return node;
      }
      exports.applyAttr = applyAttr;
      exports.applyProp = applyProp;
      exports.attributes = attributes;
      exports.alignWithDOM = alignWithDOM;
      exports.close = close;
      exports.createPatchInner = createPatchInner;
      exports.createPatchOuter = createPatchOuter;
      exports.currentElement = currentElement;
      exports.currentPointer = currentPointer;
      exports.open = open;
      exports.patch = patchInner2;
      exports.patchInner = patchInner2;
      exports.patchOuter = patchOuter2;
      exports.skip = skip;
      exports.skipNode = nextNode;
      exports.setKeyAttributeName = setKeyAttributeName;
      exports.clearCache = clearCache;
      exports.getKey = getKey;
      exports.importNode = importNode;
      exports.isDataInitialized = isDataInitialized;
      exports.notifications = notifications;
      exports.symbols = symbols;
      exports.applyAttrs = applyAttrs;
      exports.applyStatics = applyStatics;
      exports.attr = attr;
      exports.elementClose = elementClose;
      exports.elementOpen = elementOpen;
      exports.elementOpenEnd = elementOpenEnd;
      exports.elementOpenStart = elementOpenStart;
      exports.elementVoid = elementVoid;
      exports.key = key;
      exports.text = text$1;
    }
  });

  // src/cotonic.mqtt.js
  var cotonic_mqtt_exports = {};
  __export(cotonic_mqtt_exports, {
    exec: () => exec,
    extract: () => extract,
    fill: () => fill,
    matches: () => matches,
    remove_named_wildcards: () => remove_named_wildcards
  });
  var SEPARATOR = "/";
  var SINGLE = "+";
  var ALL = "#";
  function exec(pattern, topic) {
    return matches(pattern, topic) ? extract(pattern, topic) : null;
  }
  function matches(pattern, topic) {
    var patternSegments = pattern.split(SEPARATOR);
    var topicSegments = topic.split(SEPARATOR);
    var patternLength = patternSegments.length;
    var topicLength = topicSegments.length;
    var lastIndex = patternLength - 1;
    for (var i = 0; i < patternLength; i++) {
      var currentPattern = patternSegments[i];
      var patternChar = currentPattern[0];
      var currentTopic = topicSegments[i];
      if (!currentTopic && !currentPattern)
        continue;
      if (!currentTopic && currentPattern !== ALL)
        return false;
      if (patternChar === ALL)
        return i === lastIndex;
      if (patternChar !== SINGLE && currentPattern !== currentTopic)
        return false;
    }
    return patternLength === topicLength;
  }
  function fill(pattern, params) {
    var patternSegments = pattern.split(SEPARATOR);
    var patternLength = patternSegments.length;
    var result = [];
    for (var i = 0; i < patternLength; i++) {
      var currentPattern = patternSegments[i];
      var patternChar = currentPattern[0];
      var patternParam = currentPattern.slice(1);
      var paramValue = params[patternParam];
      if (patternChar === ALL) {
        if (paramValue !== void 0)
          result.push([].concat(paramValue).join(SEPARATOR));
        break;
      } else if (patternChar === SINGLE)
        result.push("" + paramValue);
      else
        result.push(currentPattern);
    }
    return result.join(SEPARATOR);
  }
  function extract(pattern, topic) {
    var params = {};
    var patternSegments = pattern.split(SEPARATOR);
    var topicSegments = topic.split(SEPARATOR);
    var patternLength = patternSegments.length;
    for (var i = 0; i < patternLength; i++) {
      var currentPattern = patternSegments[i];
      var patternChar = currentPattern[0];
      if (currentPattern.length === 1)
        continue;
      if (patternChar === ALL) {
        params[currentPattern.slice(1)] = topicSegments.slice(i);
        break;
      } else if (patternChar === SINGLE) {
        params[currentPattern.slice(1)] = topicSegments[i];
      }
    }
    return params;
  }
  function remove_named_wildcards(pattern) {
    var patternSegments = pattern.split(SEPARATOR);
    var patternLength = patternSegments.length;
    var mqttPattern = [];
    for (var i = 0; i < patternLength; i++) {
      var currentPattern = patternSegments[i];
      var patternChar = currentPattern[0];
      if (patternChar === ALL || patternChar == SINGLE) {
        mqttPattern.push(patternChar);
      } else {
        mqttPattern.push(currentPattern);
      }
    }
    return mqttPattern.join(SEPARATOR);
  }

  // src/cotonic.tokenizer.js
  var cotonic_tokenizer_exports = {};
  __export(cotonic_tokenizer_exports, {
    charref: () => charref,
    tokens: () => tokens
  });
  var TAB = 9;
  var NEWLINE = 10;
  var SPACE = 32;
  var RETURN = 13;
  var DASH = 45;
  var LT = 60;
  var GT = 62;
  var SLASH = 47;
  var UNDERSCORE = 95;
  var AMPERSAND = 38;
  var EQUALS = 61;
  var QUESTION_MARK = 63;
  var COLON = 59;
  var QUOTE = 34;
  var SQUOTE = 39;
  var CHAR_A = 65;
  var CHAR_Z = 90;
  var CHAR_a = 97;
  var CHAR_z = 122;
  var DONE = 0;
  var SCRIPT = 1;
  var TEXTAREA = 2;
  var NORMAL = 3;
  function TokenBuilder(acc) {
    function addKey(token, attributes) {
      for (let i = 0; i < attributes.length; i = i + 2) {
        if (attributes[i] === "key") {
          token.key = attributes[i + 1];
          break;
        }
      }
    }
    this.elementOpen = function(tag, attributes) {
      const t = { type: "open", tag, attributes };
      addKey(t, attributes);
      acc.push(t);
    };
    this.elementVoid = function(tag, attributes) {
      const t = { type: "void", tag, attributes };
      addKey(t, attributes);
      acc.push(t);
    };
    this.elementClose = function(tag) {
      acc.push({ type: "close", tag });
    };
    this.processingInstruction = function(tag, attributes) {
      acc.push({ type: "pi", tag, attributes });
    };
    this.doctype = function(attributes) {
      acc.push({ type: "doctype", attributes });
    };
    this.comment = function(data) {
      acc.push({ type: "comment", data });
    };
    this.text = function(data) {
      acc.push({ type: "text", data });
    };
    this.result = acc;
  }
  function Decoder(builder) {
    this.line = 1;
    this.column = 1;
    this.offset = 0;
    this.builder = builder;
    this.adv_col = function(n) {
      this.column = this.column + n;
      this.offset = this.offset + n;
      return this;
    };
    this.inc_col = function() {
      this.column += 1;
      this.offset += 1;
      return this;
    };
    this.inc_line = function() {
      this.line += 1;
      this.column = 1;
      this.offset += 1;
      return this;
    };
    this.inc_char = function(c) {
      if (c === NEWLINE) {
        this.inc_line();
      } else {
        this.inc_col();
      }
      return this;
    };
  }
  var tokens = function(data, tokenBuilder) {
    if (tokenBuilder === void 0) {
      tokenBuilder = new TokenBuilder([]);
    }
    let decoder2 = new Decoder(tokenBuilder);
    tokens3(data, tokenBuilder, decoder2);
    return tokenBuilder.result;
  };
  function tokens3(data, builder, decoder2) {
    let cont = true;
    while (cont) {
      if (data.length <= decoder2.offset) {
        return;
      }
      let rv = tokenize(data, builder, decoder2);
      if (rv === DONE) {
        return;
      } else if (rv === NORMAL) {
        continue;
      } else if (rv === SCRIPT) {
        tokenize_script(data, decoder2);
      } else if (rv === TEXTAREA) {
        tokenize_textarea(data, decoder2);
      } else {
        throw "internal_error";
      }
    }
  }
  function tokenize(data, builder, d) {
    let tag, attributes, text_data, has_slash, c0, c1, c2, c3, c4, c5, c6, c7, c8;
    c0 = data.charAt(d.offset);
    if (c0 === void 0)
      return DONE;
    c1 = data.charAt(d.offset + 1);
    c2 = data.charAt(d.offset + 2);
    c3 = data.charAt(d.offset + 3);
    if (c0 === "<" && c1 === "!" && c2 === "-" && c3 === "-")
      return tokenize_comment(data, d.adv_col(4));
    c4 = data.charAt(d.offset + 4);
    c5 = data.charAt(d.offset + 5);
    c6 = data.charAt(d.offset + 6);
    c7 = data.charAt(d.offset + 7);
    c8 = data.charAt(d.offset + 8);
    if (c0 === "<" && c1 === "!" && c2 === "D" && c3 === "O" && c4 === "C" && c5 === "T" && c6 === "Y" && c7 === "P" && c8 === "E")
      return tokenize_doctype(data, d.adv_col(10));
    if (c0 === "<" && c1 === "!" && c2 === "d" && c3 === "o" && c4 === "c" && c5 === "t" && c6 === "y" && c7 === "p" && c8 === "e")
      return tokenize_doctype(data, d.adv_col(10));
    if (c0 === "<" && c1 === "!" && c2 === "[" && c3 === "C" && c4 === "D" && c5 === "A" && c6 === "T" && c7 === "A" && c8 === "[")
      return tokenize_cdata(data, d.adv_col(9));
    if (c0 === "<" && c1 === "?") {
      tag = tokenize_literal(data, d.adv_col(2), "tag");
      attributes = tokenize_attributes(data, d);
      find_qgt(data, d);
      d.builder.processingInstruction(tag.value, attributes.value);
      return NORMAL;
    }
    if (c0 === "&") {
      text_data = tokenize_charref(data, d.inc_col());
      builder.text(text_data.value);
      return NORMAL;
    }
    if (c0 === "<" && c1 === "/") {
      tag = tokenize_literal(data, d.adv_col(2), "tag");
      has_slash = find_gt(data, d);
      builder.elementClose(tag.value);
      return NORMAL;
    }
    if (c0 === "<" && (is_whitespace(data.codePointAt(d.offset + 1)) || !is_start_literal_safe(data.codePointAt(d.offset + 1)))) {
      text_data = tokenize_data(data, d.inc_col(1));
      builder.text("<" + text_data.value);
      return NORMAL;
    }
    if (c0 === "<") {
      tag = tokenize_literal(data, d.inc_col(), "tag");
      attributes = tokenize_attributes(data, d);
      has_slash = find_gt(data, d);
      if (has_slash.value || is_singleton(tag.value)) {
        builder.elementVoid(tag.value, attributes.value);
      } else {
        builder.elementOpen(tag.value, attributes.value);
      }
      if (tag.value === "textarea")
        return TEXTAREA;
      if (tag.value === "script")
        return SCRIPT;
      return NORMAL;
    }
    text_data = tokenize_data(data, d);
    builder.text(text_data.value);
    return NORMAL;
  }
  function tokenize_textarea(data, d) {
    let cont = true, offsetStart = d.offset, lt, slash, n;
    while (cont) {
      lt = data.codePointAt(d.offset);
      if (lt === void 0) {
        if (offsetStart !== d.offset)
          d.builder.text(data.slice(offsetStart, d.offset));
        return;
      }
      lookahead: {
        if (lt !== LT)
          break lookahead;
        slash = data.codePointAt(d.offset + 1);
        if (slash !== SLASH)
          break lookahead;
        n = data[d.offset + 2];
        if (!(n === "t" || n === "T"))
          break lookahead;
        n = data[d.offset + 3];
        if (!(n === "e" || n === "E"))
          break lookahead;
        n = data[d.offset + 4];
        if (!(n === "x" || n === "X"))
          break lookahead;
        n = data[d.offset + 5];
        if (!(n === "t" || n === "T"))
          break lookahead;
        n = data[d.offset + 6];
        if (!(n === "a" || n === "A"))
          break lookahead;
        n = data[d.offset + 7];
        if (!(n === "r" || n === "R"))
          break lookahead;
        n = data[d.offset + 8];
        if (!(n === "e" || n === "E"))
          break lookahead;
        n = data[d.offset + 9];
        if (!(n === "a" || n === "A"))
          break lookahead;
        n = data.codePointAt(d.offset + 10);
        if (is_probable_close(n)) {
          if (offsetStart !== d.offset)
            d.builder.text(data.slice(offsetStart, d.offset));
          return;
        }
      }
      d.inc_char(lt);
    }
  }
  function tokenize_script(data, d) {
    let cont = true, offsetStart = d.offset, lt, slash, n;
    while (cont) {
      lt = data.codePointAt(d.offset);
      if (lt === void 0) {
        if (offsetStart !== d.offset)
          d.builder.text(data.slice(offsetStart, d.offset));
        return;
      }
      lookahead: {
        if (lt !== LT)
          break lookahead;
        slash = data.codePointAt(d.offset + 1);
        if (slash !== SLASH)
          break lookahead;
        n = data[d.offset + 2];
        if (!(n === "s" || n === "S"))
          break lookahead;
        n = data[d.offset + 3];
        if (!(n === "c" || n === "C"))
          break lookahead;
        n = data[d.offset + 4];
        if (!(n === "r" || n === "R"))
          break lookahead;
        n = data[d.offset + 5];
        if (!(n === "i" || n === "I"))
          break lookahead;
        n = data[d.offset + 6];
        if (!(n === "p" || n === "P"))
          break lookahead;
        n = data[d.offset + 7];
        if (!(n === "t" || n === "T"))
          break lookahead;
        n = data.codePointAt(d.offset + 8);
        if (is_probable_close(n)) {
          if (offsetStart !== d.offset)
            d.builder.text(data.slice(offsetStart, d.offset));
          return;
        }
      }
      d.inc_char(lt);
    }
  }
  function tokenize_doctype(data, d) {
    let c, acc = [], word, cont = true;
    while (cont) {
      c = data.codePointAt(d.offset);
      if (c === void 0 || c === GT) {
        if (c === GT)
          d.inc_col();
        d.builder.doctype(acc);
        return NORMAL;
      }
      if (is_whitespace(c)) {
        d.inc_char(c);
        continue;
      }
      word = tokenize_word_or_literal(data, d);
      acc.push(word.value);
    }
  }
  function tokenize_comment(data, d) {
    let offsetStart = d.offset, cont = true;
    while (cont) {
      let c1 = data.codePointAt(d.offset);
      let c2 = data.codePointAt(d.offset + 1);
      let c3 = data.codePointAt(d.offset + 2);
      if (c1 === DASH && c2 === DASH && c3 === GT) {
        d.builder.comment(data.slice(offsetStart, d.offset));
        d.adv_col(3);
        return NORMAL;
      }
      if (c1 === void 0) {
        d.builder.comment(data.slice(offsetStart, d.offset));
        return NORMAL;
      }
      d.inc_col(c1);
    }
  }
  function tokenize_cdata() {
    throw "Not implemented";
  }
  function tokenize_word_or_literal(data, d) {
    let c = data.codePointAt(d.offset);
    if (c === QUOTE || c === SQUOTE)
      return tokenize_word(data, c, d.inc_col());
    if (!is_whitespace(c)) {
      return tokenize_literal(data, d, "tag");
    }
    throw "inconsistent";
  }
  function tokenize_word(data, quote, d) {
    let acc = [], i = 0, cont = true;
    while (cont) {
      let c = data.codePointAt(d.offset);
      if (c === void 0) {
        return value(acc.join(""), d);
      }
      if (c === quote) {
        d.inc_col();
        return value(acc.join(""), d);
      }
      if (c === AMPERSAND) {
        let charref2 = tokenize_charref(data, d.inc_col());
        acc[i++] = charref2.value;
      }
      acc[i++] = data[d.offset];
      d.inc_char(c);
    }
  }
  function tokenize_data(data, d) {
    let offsetStart = d.offset, cont = true;
    while (cont) {
      let c = data.codePointAt(d.offset);
      if (c === void 0 || c === LT || c === AMPERSAND) {
        return value(data.slice(offsetStart, d.offset), d);
      }
      d.inc_char(c);
    }
  }
  function tokenize_literal(data, d, type) {
    let literal = [], i = 0, cont = true, c = data.codePointAt(d.offset);
    if (c === GT || c === SLASH || c === EQUALS) {
      return value(data.charAt(d.offset), d.inc_col());
    }
    while (cont) {
      c = data.codePointAt(d.offset);
      if (c === AMPERSAND) {
        charref = tokenize_charref(data, d.inc_col());
        literal[i++] = charref.value;
        continue;
      }
      if (c !== void 0) {
        if (!(is_whitespace(c) || c === GT || c === SLASH || c === EQUALS)) {
          literal[i++] = data[d.offset];
          d.inc_col();
          continue;
        }
      }
      literal = literal.join("");
      if (type === "tag") {
        literal = tokenize_tag(literal);
      } else if (type === "attribute") {
        literal = tokenize_attribute_name(literal);
      }
      return value(literal, d);
    }
  }
  function tokenize_attributes(data, d) {
    let cont = true, attributes = [], attribute, attribute_value;
    while (cont) {
      let c = data.codePointAt(d.offset);
      if (c === void 0)
        return value(attributes, d);
      if (c === GT || c === SLASH)
        return value(attributes, d);
      if (c === QUESTION_MARK && data.codePointAt(d.offset + 1) === GT) {
        return value(attributes, d);
      }
      if (is_whitespace(c)) {
        d.inc_char(c);
        continue;
      }
      attribute = tokenize_literal(data, d, "attributes");
      attribute_value = tokenize_attr_value(attribute.value, data, d);
      attributes.push(tokenize_attribute_name(attribute.value));
      attributes.push(attribute_value.value);
    }
  }
  function find_gt(data, d) {
    let has_slash = false, c, cont = true;
    while (cont) {
      c = data.codePointAt(d.offset);
      if (c === SLASH) {
        has_slash = true;
        d.inc_col();
        continue;
      }
      if (c === GT) {
        return value(has_slash, d.inc_col());
      }
      if (c === void 0) {
        return value(has_slash, d);
      }
      d.inc_char(c);
    }
  }
  function find_qgt(data, d) {
    let cont = true, offsetStart = d.offset, c1, c2;
    while (cont) {
      c1 = data.codePointAt(d.offset);
      if (c1 === void 0) {
        value(data.slice(offsetStart, d.offset), d);
      }
      c2 = data.codePointAt(d.offset + 1);
      if (c1 === QUESTION_MARK && c2 === GT) {
        return value(data.slice(offsetStart, d.offset), d.adv_col(2));
      }
      if (c1 === GT) {
        d.inc_col();
        continue;
      }
      if (c1 === SLASH && c2 === GT) {
        d.adv_col(2);
        continue;
      }
      throw "internal_error";
    }
  }
  function tokenize_attr_value(key, data, d) {
    let c;
    skip_whitespace(data, d);
    c = data.codePointAt(d.offset);
    if (c === EQUALS) {
      return tokenize_quoted_or_unquoted_attr_value(data, d.inc_col());
    }
    return value(key, d);
  }
  function tokenize_quoted_or_unquoted_attr_value(data, d) {
    let c;
    c = data.codePointAt(d.offset);
    if (c === void 0)
      return value("", d);
    if (c === QUOTE || c === SQUOTE) {
      return tokenize_quoted_attr_value(data, c, d.inc_col());
    }
    return tokenize_unquoted_attr_value(data, d);
  }
  function tokenize_quoted_attr_value(data, start_quote, d) {
    let v = [], i = 0, cont = true;
    while (cont) {
      let c = data.codePointAt(d.offset);
      if (c === void 0) {
        return value(v.join(""), d);
      }
      if (c === AMPERSAND) {
        let charref2 = tokenize_charref(data, d.inc_col());
        v[i++] = charref2.value;
        continue;
      }
      if (c === start_quote) {
        return value(v.join(""), d.inc_col());
      }
      v[i++] = data[d.offset];
      d.inc_char(c);
    }
  }
  function tokenize_unquoted_attr_value(data, d) {
    let v = [], i = 0, cont = true;
    while (cont) {
      let c = data.codePointAt(d.offset);
      if (c === void 0) {
        return value(v.join(""), d);
      }
      if (c === AMPERSAND) {
        let charref2 = tokenize_charref(data, d.inc_col());
        v[i++] = charref2.value;
        continue;
      }
      if (c === SLASH) {
        return value(v.join(""), d);
      }
      if (is_probable_close(c)) {
        return value(v.join(""), d);
      }
      v[i++] = data[d.offset];
      d.inc_col();
    }
  }
  function tokenize_tag(tag) {
    let ltag = tag.toLowerCase();
    if (is_html_tag(ltag))
      return ltag;
    return tag;
  }
  function tokenize_attribute_name(name) {
    let lname = name.toLowerCase();
    if (is_html_attr(lname))
      return lname;
    return name;
  }
  function tokenize_charref(data, d) {
    let column = d.column, line = d.line, offset = d.offset;
    try {
      return tokenize_charref1(data, d);
    } catch (err) {
      if (err !== "invalid_charref")
        throw err;
      d.offset = offset;
      d.line = line;
      d.column = column;
      return value("&", d);
    }
  }
  function tokenize_charref1(data, d) {
    let cont = true, offsetStart = d.offset, u;
    while (cont) {
      let c = data.codePointAt(d.offset);
      if (c === void 0)
        throw "invalid_charref";
      if (is_whitespace(c) || c === QUOTE || c === SQUOTE || c === SLASH || c === LT || c === GT || c === AMPERSAND) {
        u = charref(data.slice(offsetStart, d.offset));
        if (u === null) {
          u = data.slice(offsetStart - 1, d.offset);
        }
        return value(u, d);
      }
      if (c === COLON) {
        u = charref(data.slice(offsetStart, d.offset));
        if (u === null) {
          throw "invalid_charref";
        } else {
          return value(u, d.inc_col());
        }
      }
      d.inc_col();
    }
  }
  function is_probable_close(c) {
    if (c === GT)
      return true;
    return is_whitespace(c);
  }
  function skip_whitespace(data, d) {
    let cont = true;
    while (cont) {
      let c = data.codePointAt(d.offset);
      if (is_whitespace(c)) {
        d.inc_char(c);
      }
      cont = false;
    }
  }
  function is_whitespace(c) {
    return c === SPACE || c === NEWLINE || c === TAB || c === RETURN;
  }
  function is_start_literal_safe(c) {
    return c >= CHAR_A && c <= CHAR_Z || c >= CHAR_a && c <= CHAR_z || c === UNDERSCORE;
  }
  function is_html_tag(tag) {
    return html_tags.hasOwnProperty(tag);
  }
  function is_html_attr(name) {
    return html_attrs.hasOwnProperty(name);
  }
  function is_singleton(tag) {
    let v = html_tags[tag];
    if (v === void 0)
      return false;
    return v;
  }
  function value(val, line, column, offset) {
    return { value: val, line, column, offset };
  }
  var html_tags = {
    // A
    a: false,
    abbr: false,
    acronym: false,
    address: false,
    applet: false,
    area: true,
    article: false,
    aside: false,
    audio: false,
    // B 
    b: false,
    base: true,
    basefont: false,
    bdi: false,
    bdo: false,
    bgsound: false,
    big: false,
    blink: false,
    blockquote: false,
    body: false,
    br: true,
    button: false,
    // C
    canvas: false,
    caption: false,
    center: false,
    cite: false,
    code: false,
    col: true,
    colgroup: false,
    command: true,
    content: false,
    // D
    data: false,
    datalist: false,
    dd: false,
    decorator: false,
    del: false,
    details: false,
    dfn: false,
    dir: false,
    div: false,
    dl: false,
    dt: false,
    // E
    element: true,
    em: false,
    embed: true,
    // F
    fieldset: false,
    figcaption: false,
    figure: false,
    font: false,
    footer: false,
    form: false,
    frame: false,
    frameset: false,
    // G H
    h1: false,
    h2: false,
    h3: false,
    h4: false,
    h5: false,
    h6: false,
    head: false,
    header: false,
    hgroup: false,
    hr: true,
    html: false,
    // I
    i: false,
    iframe: false,
    img: true,
    input: true,
    ins: false,
    isindex: false,
    // J K
    kbd: false,
    keygen: false,
    // L
    label: false,
    legend: false,
    li: false,
    link: true,
    listing: false,
    // M
    main: false,
    map: false,
    mark: false,
    marquee: false,
    menu: false,
    menuitem: false,
    meta: true,
    meter: false,
    // N
    nav: false,
    nobr: false,
    noframes: false,
    noscript: false,
    // O
    object: false,
    ol: false,
    optgroup: false,
    option: false,
    output: false,
    // P
    p: false,
    param: true,
    plaintext: false,
    pre: false,
    progress: false,
    // Q
    q: false,
    // S
    s: false,
    samp: false,
    script: false,
    selection: false,
    select: false,
    shadow: false,
    small: false,
    source: true,
    spacer: false,
    span: false,
    strike: false,
    strong: false,
    style: false,
    sub: false,
    summary: false,
    sup: false,
    // T
    table: false,
    tbody: false,
    td: false,
    template: false,
    textarea: false,
    tfoot: false,
    th: false,
    thead: false,
    time: false,
    title: false,
    tr: false,
    track: false,
    tt: false,
    // U
    u: false,
    ul: false,
    // V
    "var": false,
    video: false,
    // W
    wbr: true,
    // X Y Z
    xmp: false
  };
  var html_attrs = {
    accept: true,
    "accept-charset": true,
    accesskey: true,
    action: true,
    align: true,
    alt: true,
    async: true,
    autocomplete: true,
    autofocus: true,
    autoplay: true,
    bgcolor: true,
    border: true,
    buffered: true,
    challenge: true,
    charset: true,
    checked: true,
    cite: true,
    code: true,
    codebase: true,
    color: true,
    cols: true,
    colspan: true,
    content: true,
    contenteditable: true,
    contextmenu: true,
    controls: true,
    coords: true,
    data: true,
    // data-* handled elsewhere
    datetime: true,
    default: true,
    defer: true,
    dir: true,
    dirname: true,
    disabled: true,
    download: true,
    draggable: true,
    dropzone: true,
    enctype: true,
    "for": true,
    form: true,
    headers: true,
    height: true,
    hidden: true,
    high: true,
    href: true,
    hreflang: true,
    "http-equiv": true,
    icon: true,
    id: true,
    ismap: true,
    itemprop: true,
    keytype: true,
    kind: true,
    label: true,
    lang: true,
    language: true,
    list: true,
    loop: true,
    low: true,
    manifest: true,
    max: true,
    maxlength: true,
    media: true,
    method: true,
    min: true,
    multiple: true,
    name: true,
    novalidate: true,
    open: true,
    optimum: true,
    pattern: true,
    ping: true,
    placeholder: true,
    poster: true,
    preload: true,
    pubdate: true,
    radiogroup: true,
    readonly: true,
    rel: true,
    required: true,
    reversed: true,
    rows: true,
    rowspan: true,
    sandbox: true,
    spellcheck: true,
    scope: true,
    scoped: true,
    seamless: true,
    selected: true,
    shape: true,
    size: true,
    sizes: true,
    span: true,
    src: true,
    srcdoc: true,
    srclang: true,
    start: true,
    step: true,
    style: true,
    summary: true,
    tabindex: true,
    target: true,
    title: true,
    type: true,
    usemap: true,
    value: true,
    width: true,
    wrap: true
  };
  var charref = function() {
    let element = document.createElement("div");
    const cache = {};
    return function(raw) {
      let d = cache[raw];
      if (d !== void 0)
        return d;
      if (raw.slice(-1) === ";") {
        element.innerHTML = "&" + raw;
      } else {
        element.innerHTML = "&" + raw + ";";
      }
      d = element.textContent;
      element.innerHTML = "";
      if (Array.from(d).length !== 1) {
        d = null;
      }
      cache[raw] = d;
      return d;
    };
  }();

  // src/cotonic.keyserver.js
  var cotonic_keyserver_exports = {};
  __export(cotonic_keyserver_exports, {
    DIRECT: () => DIRECT,
    PUBLISH: () => PUBLISH,
    SESSION_KEY: () => SESSION_KEY,
    SUBSCRIBE: () => SUBSCRIBE,
    TICKETS: () => TICKETS,
    decodeSecurePublish: () => decodeSecurePublish,
    decryptResponse: () => decryptResponse,
    decryptSecurePublish: () => decryptSecurePublish,
    encodeSecurePublish: () => encodeSecurePublish,
    encryptConnectMessage: () => encryptConnectMessage,
    encryptRequest: () => encryptRequest,
    encryptSecurePublish: () => encryptSecurePublish,
    generateKey: () => generateKey,
    publicEncKey: () => publicEncKey,
    randomIV: () => randomIV,
    randomNonce: () => randomNonce,
    toBigUnsignedInt: () => toBigUnsignedInt
  });
  var KEY_BYTES = 32;
  var IV_BYTES = 16;
  var KEY_ID_BYTES = 4;
  var NONCE_BYTES = 8;
  var AES_GCM_TAG_SIZE = 16;
  var V1 = 49;
  var HELLO = 72;
  var PUBLISH = 80;
  var SUBSCRIBE = 83;
  var DIRECT = 68;
  var TICKETS = 84;
  var SESSION_KEY = 75;
  var SECURE_PUBLISH = 69;
  var textEncoder = new TextEncoder("utf-8");
  var textDecoder = new TextDecoder("utf-8");
  function randomNonce() {
    let nonce = new Uint8Array(NONCE_BYTES);
    crypto.getRandomValues(nonce);
    return nonce;
  }
  function randomIV() {
    let iv = new Uint8Array(IV_BYTES);
    crypto.getRandomValues(iv);
    return iv;
  }
  function generateKey() {
    return crypto.subtle.generateKey(
      { name: "AES-GCM", length: KEY_BYTES * 8 },
      true,
      ["encrypt", "decrypt"]
    );
  }
  function publicEncKey() {
    return crypto.subtle.importKey(
      "jwk",
      keyserver_public_encrypt_key,
      { name: "RSA-OAEP", hash: { name: "SHA-256" } },
      false,
      ["encrypt"]
    );
  }
  function exportKey(key) {
    return crypto.subtle.exportKey("raw", key);
  }
  function encodeHelloMessage(id, encodedKey, encodedNonce) {
    const encodedId = textEncoder.encode(id);
    const eKey = new Uint8Array(encodedKey);
    let msg = new Uint8Array(2 + KEY_BYTES + NONCE_BYTES + encodedId.length);
    msg[0] = V1;
    msg[1] = HELLO;
    msg.set(encodedKey, 2);
    msg.set(encodedNonce, 2 + KEY_BYTES);
    msg.set(encodedId, 2 + KEY_BYTES + NONCE_BYTES);
    return msg;
  }
  function encryptConnectMessage(id, key, nonce, pubServerEncKey) {
    return exportKey(key).then(function(encodedKey) {
      const msg = encodeHelloMessage(id, encodedKey, nonce);
      return crypto.subtle.encrypt({ name: "RSA-OAEP" }, pubServerEncKey, msg);
    });
  }
  function encodePublish(request) {
    const topic = textEncoder.encode(request.topic);
    let msg = new Uint8Array(1 + topic.length);
    msg[0] = PUBLISH;
    msg.set(topic, 1);
    return msg;
  }
  function encodeSubscribe(request) {
    const topic = textEncoder.encode(request.topic);
    let msg = new Uint8Array(1 + KEY_ID_BYTES + topic.length);
    msg[0] = SUBSCRIBE;
    msg.set(request.keyId, 1);
    msg.set(topic, 1 + KEY_ID_BYTES);
    return msg;
  }
  function encodeDirect(request) {
    const otherId = textEncoder.encode(request.otherId);
    let msg = new Uint8Array(1 + otherId.length);
    msg[0] = DIRECT;
    msg.set(otherId, 1);
    return msg;
  }
  function encodeRequest(request) {
    switch (request.type) {
      case PUBLISH:
        return encodePublish(request);
      case SUBSCRIBE:
        return encodeSubscribe(request);
      case DIRECT:
        return encodeDirect(request);
      default:
        throw new Error("Unknown request");
    }
  }
  function encryptRequest(id, nonce, request, key, iv) {
    const encId = textEncoder.encode(id);
    let req = encodeRequest(request);
    let msg = new Uint8Array(1 + NONCE_BYTES + req.length);
    msg[0] = V1;
    msg.set(nonce, 1);
    msg.set(req, 1 + NONCE_BYTES);
    return crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: encId,
        tagLength: AES_GCM_TAG_SIZE * 8
      },
      key,
      msg
    );
  }
  function decryptResponse(id, nonce, response, key, iv) {
    const encId = textEncoder.encode(id);
    return crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: encId,
        tagLength: AES_GCM_TAG_SIZE * 8
      },
      key,
      response
    ).then(function(plain) {
      return decodeResponse(plain);
    });
  }
  function decodeResponse(data) {
    const d = new Uint8Array(data);
    if (d[0] != V1)
      throw new Error("Unexpected message");
    const nonce = d.slice(1, NONCE_BYTES + 1);
    let result = { nonce };
    const PAYLOAD = NONCE_BYTES + 1;
    switch (d[PAYLOAD]) {
      case PUBLISH:
        result.payload = {
          type: PUBLISH,
          topic: textDecoder.decode(d.slice(PAYLOAD + 1))
        };
        break;
      case DIRECT:
        result.payload = {
          type: DIRECT,
          otherId: textDecoder.decode(d.slice(PAYLOAD + 1))
        };
        break;
      case SUBSCRIBE:
        result.payload = {
          type: SUBSCRIBE,
          keyId: d.slice(PAYLOAD + 1, PAYLOAD + KEY_ID_BYTES + 1),
          topic: textDecoder.decode(d.slice(PAYLOAD + KEY_ID_BYTES + 1))
        };
        break;
      case TICKETS:
        const ticketASize = payload[PAYLOAD + 1];
        const ticketBSize = payload[ticketASize + PAYLOAD + 2];
        const ticketA = payload.slice(PAYLOAD + 2, ticketASize + PAYLOAD + 2);
        const ticketB = payload.slice(ticketASize + PAYLOAD + 3, ticketASize + PAYLOAD + 3 + ticketBSize);
        result.payload = { type: TICKETS, ticketA, ticketB };
        break;
      case SESSION_KEY:
        const key_id = payload.slice(PAYLOAD + 1, PAYLOAD + KEY_ID_BYTES + 1);
        const key_data = payload.slice(
          PAYLOAD + KEY_ID_BYTES + 1,
          PAYLOAD + KEY_ID_BYTES + KEY_BYTES + 1
        );
        const timestamp = toBigUnsignedInt(
          64,
          payload.slice(
            PAYLOAD + KEY_ID_BYTES + KEY_BYTES + 1,
            PAYLOAD + KEY_ID_BYTES + KEY_BYTES + 1 + 8
          )
        );
        const lifetime = toBigUnsignedInt(
          16,
          payload.slice(
            PAYLOAD + KEY_ID_BYTES + KEY_BYTES + 1 + 8,
            PAYLOAD + KEY_ID_BYTES + KEY_BYTES + 1 + 8 + 2
          )
        );
        result.payload = { type: SESSION_KEY, keyId: key_id, timestamp: toDate(timestamp), lifetime };
        break;
      default:
        throw new Error("Unknown payload type");
    }
    return result;
  }
  function encryptSecurePublish(message, keyId, key) {
    const iv = randomIV();
    const alg = {
      name: "AES-GCM",
      iv,
      additionalData: keyId,
      tagLength: AES_GCM_TAG_SIZE * 8
    };
    return crypto.subtle.encrypt(alg, key, message).then(function(cipherText) {
      return encodeSecurePublish(iv, new Uint8Array(cipherText));
    });
  }
  function encodeSecurePublish(iv, cipherText) {
    let msg = new Uint8Array(2 + iv.length + cipherText.length);
    msg[0] = V1;
    msg[1] = SECURE_PUBLISH;
    msg.set(iv, 2);
    msg.set(cipherText, 2 + iv.length);
    return msg;
  }
  function decodeSecurePublish(data) {
    if (data[0] != V1)
      throw new Error("Unknown message");
    if (data[1] != SECURE_PUBLISH)
      throw new Error("Wrong message type");
    let iv = data.slice(2, IV_BYTES + 2);
    let message = data.slice(IV_BYTES + 2);
    return { type: SECURE_PUBLISH, iv, message };
  }
  function decryptSecurePublish(message, keyId, key) {
    const d = decodeSecurePublish(message);
    const alg = {
      name: "AES-GCM",
      iv: d.iv,
      additionalData: keyId,
      tagLength: AES_GCM_TAG_SIZE * 8
    };
    return crypto.subtle.decrypt(alg, key, d.message);
  }
  function toDate(t) {
    let d = /* @__PURE__ */ new Date();
    d.setTime(t);
    return d;
  }
  function toBigUnsignedInt(bits, buf) {
    if (bits % 8 != 0)
      throw new Error("Bits must be a multiple of 8");
    const nrBytes = bits / 8;
    let lshift = bits - 8;
    let r = 0;
    if (buf.length < nrBytes)
      throw new Error("Buffer too small to convert.");
    for (let i = 0; i < nrBytes; i++) {
      r += buf[i] * Math.pow(2, lshift);
      lshift -= 8;
    }
    return r;
  }

  // src/cotonic.js
  var VERSION = "1.4.1";
  var config = globalThis.cotonic && globalThis.cotonic.config ? globalThis.cotonic.config : {};
  (function() {
    const currentScript = document.currentScript;
    if (currentScript && currentScript.getAttribute("data-base-worker-src")) {
      load_config_defaults({ base_worker_src: currentScript.getAttribute("data-base-worker-src") });
    }
  })();
  var next_worker_id = 1;
  var workers = {};
  var named_worker_ids = {};
  var receive_handler = null;
  function load_config_defaults(options) {
    for (let key in options) {
      if (!config.hasOwnProperty(key)) {
        config[key] = options[key];
      }
    }
  }
  function message_from_worker(wid, msg) {
    var data = msg.data;
    if (receive_handler) {
      receive_handler(data, wid);
    } else {
      console.log("Unhandled message from worker", wid, msg);
    }
  }
  function error_from_worker(wid, e) {
    console.log("Error from worker", wid, e);
  }
  function spawn(url, args) {
    if (!config.base_worker_src) {
      throw "Can't spawn worker, no data-base-worker-src attribute set.";
    }
    return spawn_named("", url, config.base_worker_src, args);
  }
  function spawn_named(name, url, base, args) {
    if (name && named_worker_ids[name]) {
      return named_worker_ids[name];
    }
    base = base || config.base_worker_src;
    if (!base) {
      throw "Can't spawn worker, no data-base-worker-src attribute set.";
    }
    const worker_id = next_worker_id++;
    const worker = new Worker(base, {
      name: name ? name : worker_id.toString(),
      type: "module"
    });
    worker.postMessage(["init", {
      url: ensure_hostname(url),
      args,
      wid: worker_id,
      name,
      location: {
        origin: window.location.origin,
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        host: window.location.host,
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash
      }
    }]);
    worker.name = name;
    worker.onmessage = message_from_worker.bind(this, worker_id);
    worker.onerror = error_from_worker.bind(this, worker_id);
    workers[worker_id] = worker;
    if (name) {
      named_worker_ids[name] = worker_id;
    }
    return worker_id;
  }
  function ensure_hostname(url) {
    if (!url.startsWith("http:") && !url.startsWith("https:")) {
      if (!url.startsWith("/")) {
        url = "/" + url;
      }
      url = window.location.protocol + "//" + window.location.host + url;
    }
    return url;
  }
  function send(wid, message) {
    if (wid === 0) {
      setTimeout(() => {
        handler(message, wid);
      }, 0);
      return;
    }
    const worker = workers[wid];
    if (worker) {
      worker.postMessage(message);
    }
  }
  function whereis(name) {
    if (name && named_worker_ids[name]) {
      return named_worker_ids[name];
    }
    return void 0;
  }
  function receive(handler2) {
    receive_handler = handler2;
  }
  function cleanupSessionStorage() {
    if (!window.name || window.name == "null") {
      window.name = makeid(32);
    }
    if (sessionStorage.getItem("windowName") != window.name) {
      let keys = Object.keys(sessionStorage);
      for (let i in keys) {
        let k = keys[i];
        if (!k.match(/^persist-/)) {
          sessionStorage.removeItem(k);
        }
      }
    }
    sessionStorage.setItem("windowName", window.name);
  }
  function makeid(length) {
    let result = "";
    let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let len = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * len));
    }
    return result;
  }
  var ready;
  var readyResolve;
  if (globalThis.cotonic && globalThis.cotonic.ready) {
    ready = cotonic.ready;
    readyResolve = cotonic.readyResolve;
  } else {
    ready = new Promise((resolve) => {
      readyResolve = resolve;
    });
  }
  cleanupSessionStorage();

  // src/require_idom.js
  var IncrementalDOM2 = require_incremental_dom_cjs();
  globalThis.IncrementalDOM = IncrementalDOM2;

  // src/cotonic.idom.js
  var cotonic_idom_exports = {};
  __export(cotonic_idom_exports, {
    patchInner: () => patchInner,
    patchOuter: () => patchOuter
  });
  var idom = IncrementalDOM;
  function render(tokens2) {
    function renderToken(token) {
      switch (token.type) {
        case "text":
          return idom.text(token.data);
        case "open":
          return idom.elementOpen.apply(null, [token.tag, token.hasOwnProperty("key") ? token.key : null, null].concat(token.attributes));
        case "void":
          return voidNode(token);
        case "close":
          return closeNode(token);
      }
    }
    for (let i = 0; i < tokens2.length; i++) {
      renderToken(tokens2[i]);
    }
  }
  function closeNode(token) {
    const currentTag = idom.currentElement().tagName;
    if (currentTag.toLowerCase() != token.tag.toLowerCase()) {
      return;
    }
    return idom.elementClose(token.tag);
  }
  function voidNode(token) {
    if (token.tag === "cotonic-idom-skip") {
      return skipNode(token);
    }
    return idom.elementVoid.apply(null, [token.tag, token.hasOwnProperty("key") ? token.key : null, null].concat(token.attributes));
  }
  function skipNode(token) {
    const currentPointer = idom.currentPointer();
    let id;
    for (let i = 0; i < token.attributes.length; i = i + 2) {
      if (token.attributes[i] === "id") {
        id = token.attributes[i + 1];
        break;
      }
    }
    if (!id) {
      throw "No id attribute found in cotonic-idom-skip node";
    }
    if (!currentPointer || currentPointer.id !== id) {
      let tag = "div", attributes = [];
      for (let i = 0; i < token.attributes.length; i = i + 2) {
        if (token.attributes[i] === "tag") {
          tag = token.attributes[i + 1];
        } else {
          attributes.push(token.attributes[i]);
          attributes.push(token.attributes[i + 1]);
        }
      }
      return idom.elementVoid.apply(null, [tag, token.hasOwnProperty("key") ? token.key : null, null].concat(attributes));
    }
    idom.skipNode();
  }
  function patch(patch2, element, HTMLorTokens) {
    let tokens2;
    if (Array.isArray(HTMLorTokens)) {
      tokens2 = HTMLorTokens;
    } else {
      tokens2 = tokens(HTMLorTokens);
    }
    patch2(element, function() {
      render(tokens2);
    });
  }
  var patchInner = patch.bind(void 0, idom.patch);
  var patchOuter = patch.bind(void 0, idom.patchOuter);

  // src/cotonic.broker.js
  var cotonic_broker_exports = {};
  __export(cotonic_broker_exports, {
    call: () => call,
    find_subscriptions_below: () => find_subscriptions_below,
    initialize: () => initialize,
    match: () => match,
    publish: () => publish,
    publish_mqtt_message: () => publish_mqtt_message,
    subscribe: () => subscribe,
    unsubscribe: () => unsubscribe
  });
  var clients;
  var root;
  var response_nr = 0;
  var promised = {};
  var CHILDREN = 0;
  var VALUE = 1;
  var retained_prefix;
  function new_node(value2) {
    return [null, value2];
  }
  function flush() {
    clients = {};
    root = new_node(null);
  }
  function add(topic, thing) {
    const path = topic.split("/");
    let i = 0;
    let current = root;
    for (i = 0; i < path.length; i++) {
      let children = current[CHILDREN];
      if (children === null) {
        children = current[CHILDREN] = {};
      }
      if (!children.hasOwnProperty(path[i])) {
        children[path[i]] = new_node(null);
      }
      current = children[path[i]];
    }
    let v = current[VALUE];
    if (v === null) {
      v = current[VALUE] = [];
    }
    let index = indexOfSubscription(v, thing);
    if (index > -1) {
      v.splice(index, 1);
    }
    v.push(thing);
    return v;
  }
  function match(topic) {
    const path = topic.split("/");
    const matches2 = [];
    collect_matches(path, root, matches2);
    return matches2;
  }
  function collect_matches(path, trie, matches2) {
    if (trie === void 0)
      return;
    if (path.length === 0) {
      if (trie[VALUE] !== null) {
        matches2.push.apply(matches2, trie[VALUE]);
        return;
      }
    }
    const children = trie[CHILDREN];
    if (children === null)
      return;
    const sub_path = path.slice(1);
    switch (path[0]) {
      case "+":
        throw Error("match on single level wildcard not possible");
      case "#":
        throw Error("match on wildcard not possible");
      default:
        collect_matches(sub_path, children[path[0]], matches2);
        collect_matches(sub_path, children["+"], matches2);
        collect_matches([], children["#"], matches2);
    }
  }
  function remove(topic, thing) {
    const path = topic.split("/");
    let current = root;
    let i = 0;
    let visited = [current];
    for (i = 0; i < path.length; i++) {
      let children = current[CHILDREN];
      if (children === null) {
        return;
      }
      if (!children.hasOwnProperty(path[i])) {
        return;
      }
      current = children[path[i]];
      visited.unshift(current);
    }
    let v = current[VALUE];
    let index = indexOfSubscription(v, thing);
    if (index > -1) {
      v.splice(index, 1);
      if (v.length === 0) {
        current[VALUE] = null;
        path.reverse();
        for (i = 0; i < visited.length - 1; i++) {
          let v2 = visited[i];
          if (v2[CHILDREN] === null && v2[VALUE] === null) {
            let v1 = visited[i + 1];
            delete v1[CHILDREN][path[i]];
            if (Object.keys(v1[CHILDREN]).length == 0) {
              v1[CHILDREN] = null;
            }
            continue;
          }
          return;
        }
      }
    }
  }
  function indexOfSubscription(v, thing) {
    let index = v.indexOf(thing);
    if (index === -1 && thing.wid !== null) {
      for (index = v.length - 1; index >= 0; index--) {
        const sub = v[index];
        if (thing.type === sub.type && sub.wid === thing.wid) {
          return index;
        }
      }
    }
    return index;
  }
  function find_subscriptions_below(topic) {
    const path = topic.split("/");
    let subs = [];
    collect_subscribers(path, root, subs);
    return subs;
  }
  function collect_subscribers(path, trie, subs) {
    if (trie === void 0)
      return;
    if (path.length === 0 && trie[VALUE] !== null) {
      subs.push.apply(subs, trie[VALUE]);
    }
    let children = trie[CHILDREN];
    if (children === null)
      return;
    if (path.length > 0) {
      let sub_path = path.slice(1);
      collect_subscribers(sub_path, children[path[0]], subs);
      collect_subscribers(sub_path, children["+"], subs);
      collect_subscribers([], children["#"], subs);
    } else {
      for (let m in children) {
        collect_subscribers(path, children[m], subs);
      }
    }
  }
  receive(function(data, wid) {
    if (!data.type)
      return;
    switch (data.type) {
      case "connect":
        return handle_connect(wid, data);
      case "publish":
        return handle_publish(wid, data);
      case "subscribe":
        return handle_subscribe(wid, data);
      case "unsubscribe":
        return handle_unsubscribe(wid, data);
      case "pingreq":
        return handle_pingreq(wid, data);
      default:
        if (window.console)
          window.console.error("Received unknown command", data);
    }
  });
  function handle_connect(wid, data) {
    if (data.client_id !== wid) {
      if (window.console)
        window.console.error("Wrong client_id in connect from " + wid, data);
    }
    clients[wid] = data;
    send(wid, { type: "connack", reason_code: 0 });
  }
  function handle_subscribe(wid, data) {
    let result = subscribe_subscriber({ type: "worker", wid }, data);
    send(wid, { type: "suback", packet_id: data.packet_id, acks: result.acks });
    send_retained(result.retained);
  }
  function send_retained(retained) {
    for (let i = 0; i < retained.length; i++) {
      const r = retained[i];
      for (let j = 0; j < r.retained.length; j++) {
        publish_subscriber(r.subscription, r.retained[j].retained.message, r.subscription.wid);
      }
    }
  }
  function handle_unsubscribe(wid, data) {
    let acks = unsubscribe_subscriber({ type: "worker", wid }, data);
    send(wid, { type: "unsuback", packet_id: data.packet_id, acks });
  }
  function handle_publish(wid, data) {
    publish_mqtt_message(data, { wid });
  }
  function handle_pingreq(wid) {
    send(wid, { type: "pingresp" });
  }
  function send_promised(topics) {
    for (let k in topics) {
      const pattern = topics[k];
      for (let p in promised) {
        if (matches(pattern, p)) {
          for (let m in promised[p]) {
            let msg = promised[p][m];
            publish_mqtt_message(msg.message, msg.options);
          }
          delete promised[p];
        }
      }
    }
  }
  function subscribe(topics, callback, options) {
    options = options || {};
    if (options.wid === void 0)
      options.wid = null;
    let subtopics = [];
    if (typeof topics === "string") {
      topics = [topics];
    }
    for (let k = 0; k < topics.length; k++) {
      if (typeof topics[k] === "string") {
        subtopics.push({
          topic: topics[k],
          qos: options.qos || 0,
          retain_handling: options.retain_handling || 0,
          retain_as_published: options.retain_as_published || false,
          no_local: options.no_local || false
        });
      } else {
        subtopics.push(topics[k]);
      }
    }
    const msg = {
      type: "subscribe",
      topics: subtopics,
      properties: options.properties || {}
    };
    const result = subscribe_subscriber({ type: "page", wid: options.wid, callback }, msg);
    send_retained(result.retained);
    window.setTimeout(send_promised, 0, topics);
    return result.acks;
  }
  function subscribe_subscriber(subscription, msg) {
    let bridge_topics = {};
    let acks = [];
    let retained = [];
    for (let k = 0; k < msg.topics.length; k++) {
      const t = msg.topics[k];
      const mqtt_topic = remove_named_wildcards(t.topic);
      subscription.sub = t;
      subscription.topic = t.topic;
      let allSubs = add(mqtt_topic, subscription);
      acks.push(0);
      if (t.retain_handling < 2) {
        const rs = get_matching_retained(mqtt_topic);
        if (rs.length > 0) {
          retained.push({
            subscription,
            retained: rs
          });
        }
      }
      let m = mqtt_topic.match(/^bridge\/([^\/]+)\/.*/);
      if (m !== null && m[1] != "+") {
        if (bridge_topics[m[1]] === void 0) {
          bridge_topics[m[1]] = [];
        }
        bridge_topics[m[1]].push({ topic: mqtt_topic, subs: allSubs });
      }
    }
    for (let b in bridge_topics) {
      let topics = [];
      for (let i = 0; i < bridge_topics[b].length; i++) {
        let merged = mergeSubscriptions(bridge_topics[b][i].subs);
        merged.topic = bridge_topics[b][i].topic;
        topics.push(merged);
      }
      let sub = {
        type: "subscribe",
        topics,
        properties: msg.properties || {}
      };
      publish("$bridge/" + b + "/control", sub);
    }
    return { acks, retained };
  }
  function mergeSubscriptions(subs) {
    var best = Object.assign({}, subs[0].sub);
    for (let i = 1; i < subs.length; i++) {
      let s = subs[i].sub;
      best.qos = Math.max(best.qos, s.qos);
      best.retain_handling = Math.min(best.retain_handling, s.retain_handling);
      best.retain_as_published = best.retain_as_published || s.retain_as_published;
      best.no_local = best.no_local && s.no_local;
    }
    return best;
  }
  function unsubscribe(topics, options) {
    options = options || {};
    if (options.wid === void 0) {
      console.error("Cotonic unsubscribe without wid", topics, options);
    } else {
      if (typeof topics === "string") {
        topics = [topics];
      }
      unsubscribe_subscriber({ type: "page", wid: options.wid }, { topics });
    }
  }
  function unsubscribe_subscriber(sub, msg) {
    let bridge_topics = {};
    let acks = [];
    for (let i = 0; i < msg.topics.length; i++) {
      remove(msg.topics[i], sub);
      acks.push(0);
      const mqtt_topic = remove_named_wildcards(msg.topics[i]);
      let m = mqtt_topic.match(/^bridge\/([^\/]+)\/.*/);
      if (m !== null && m[1] != "+") {
        if (bridge_topics[m[1]] === void 0) {
          bridge_topics[m[1]] = [];
        }
        bridge_topics[m[1]].push(mqtt_topic);
      }
    }
    for (let b in bridge_topics) {
      let unsub = {
        type: "unsubscribe",
        topics: bridge_topics[b],
        properties: msg.properties || {}
      };
      publish("$bridge/" + b + "/control", unsub);
    }
    return acks;
  }
  function publish(topic, payload2, options) {
    options = options || {};
    let msg = {
      type: "publish",
      topic,
      payload: payload2,
      qos: options.qos || 0,
      retain: options.retain || false,
      properties: options.properties || {}
    };
    publish_mqtt_message(msg, options);
  }
  function publish_mqtt_message(msg, options) {
    let isPromised = false;
    if (msg.topic.indexOf("$promised/") == 0) {
      isPromised = true;
      msg.topic = msg.topic.substr("$promised/".length);
    }
    const subscriptions = match(msg.topic);
    const wid = options ? options.wid : void 0;
    const subscriptionsCount = subscriptions.length;
    if (msg.retain) {
      retain(msg);
    }
    if (subscriptionsCount == 0 && isPromised) {
      if (!promised[msg.topic]) {
        promised[msg.topic] = [];
      }
      promised[msg.topic].push({ message: msg, options });
    } else {
      for (let i = 0; i < subscriptionsCount; i++) {
        publish_subscriber(subscriptions[i], msg, wid);
      }
    }
  }
  function publish_subscriber(sub, mqttmsg, wid) {
    if (wid && sub.wid && sub.wid === wid && sub.sub.no_local) {
      return;
    }
    if (sub.type === "worker") {
      send(sub.wid, mqttmsg);
    } else if (sub.type === "page") {
      sub.callback(mqttmsg, extract(sub.topic, mqttmsg.topic), { topic: sub.topic, wid: sub.wid });
    } else {
      if (window.console)
        window.console.error("Unknown subscription type", sub);
    }
  }
  function retain_key(topic) {
    return `${retained_prefix}${topic}`;
  }
  function retain(message) {
    const key = retain_key(message.topic);
    if (message.payload !== void 0 && message.payload !== null && message.payload !== "") {
      sessionStorage.setItem(key, JSON.stringify({
        message
      }));
    } else {
      sessionStorage.removeItem(key);
    }
  }
  function get_matching_retained(topic) {
    let matching = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      let key = sessionStorage.key(i);
      if (key.substring(0, retained_prefix.length) !== retained_prefix) {
        continue;
      }
      const retained_topic = key.substring(retained_prefix.length);
      if (!matches(topic, retained_topic)) {
        continue;
      }
      const retained = get_retained(retained_topic);
      if (retained !== null)
        matching.push({ topic, retained });
    }
    return matching;
  }
  function get_retained(topic) {
    const key = retain_key(topic);
    const item = sessionStorage.getItem(key);
    if (item === null) {
      return null;
    }
    const Obj = JSON.parse(item);
    if (!Obj.message) {
      sessionStorage.removeItem(key);
      return null;
    }
    return Obj;
  }
  function delete_all_retained() {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key.substring(0, retained_prefix.length) !== retained_prefix) {
        continue;
      }
      sessionStorage.removeItem(key);
    }
  }
  function call(topic, payload2, options) {
    options = options || {};
    payload2 = payload2 || null;
    if (options.qos === void 0)
      options.qos = 1;
    let timeout = options.timeout || 15e3;
    let willRespond = new Promise(
      function(resolve, reject) {
        let resp_topic = response_topic();
        let wid = "wid-" + Math.random();
        let timer = setTimeout(function() {
          unsubscribe(resp_topic, { wid });
          let reason = new Error("Timeout waiting for response on " + topic);
          reject(reason);
        }, timeout);
        subscribe(resp_topic, function(msg) {
          clearTimeout(timer);
          unsubscribe(resp_topic, { wid });
          resolve(msg);
        }, { wid });
        options.properties = options.properties || {};
        options.properties.response_topic = resp_topic;
        publish(topic, payload2, options);
      }
    );
    return willRespond;
  }
  function response_topic() {
    return "reply/page-" + response_nr++ + "-" + Math.random();
  }
  function initialize(options) {
    var _a, _b, _c;
    retained_prefix = (_a = options == null ? void 0 : options.retained_prefix) != null ? _a : "c_retained$";
    if ((_b = options == null ? void 0 : options.flush) != null ? _b : true) {
      flush();
    }
    if ((_c = options == null ? void 0 : options.delete_all_retained) != null ? _c : true) {
      delete_all_retained();
    }
  }

  // src/default_broker_init.js
  initialize();

  // src/cotonic.ui.js
  var cotonic_ui_exports = {};
  __export(cotonic_ui_exports, {
    get: () => get,
    insert: () => insert,
    on: () => on,
    remove: () => remove2,
    render: () => render2,
    renderId: () => renderId,
    update: () => update,
    updateStateClass: () => updateStateClass,
    updateStateData: () => updateStateData
  });
  var state = {};
  var order = [];
  var stateData = {};
  var stateClass = {};
  var animationFrameRequestId;
  function insert(id, mode, initialData, priority) {
    if (mode === true) {
      mode = "inner";
    } else if (mode === false) {
      mode = "outer";
    }
    state[id] = {
      id,
      mode,
      data: initialData,
      dirty: true
    };
    insertSorted(
      order,
      { id, priority },
      function(a, b) {
        return a.priority < b.priority;
      }
    );
    publish("model/ui/event/insert/" + id, initialData);
  }
  function get(id) {
    return state[id];
  }
  function insertSorted(arr, item, compare) {
    let min = 0;
    let max = arr.length;
    let index = Math.floor((min + max) / 2);
    while (max > min) {
      if (compare(item, arr[index]) < 0) {
        max = index;
      } else {
        min = index + 1;
      }
      index = Math.floor((min + max) / 2);
    }
    arr.splice(index, 0, item);
    requestRender();
  }
  function remove2(id) {
    delete state[id];
    for (let i = 0; i < order.length; i++) {
      if (order.id != id) {
        continue;
      }
      delete order[i];
    }
    publish("model/ui/event/delete/" + id, void 0);
  }
  function update(id, htmlOrTokens) {
    let currentState = state[id];
    if (!currentState) {
      return;
    }
    currentState.data = htmlOrTokens;
    currentState.dirty = true;
    requestRender();
  }
  function renderId(id) {
    const elt = document.getElementById(id);
    if (elt === null) {
      return false;
    }
    return renderElement(elt, id);
  }
  function initializeShadowRoot(elt, mode) {
    if (elt.shadowRoot)
      return elt.shadowRoot;
    if (mode === "shadow-closed") {
      mode = "closed";
    } else {
      mode = "open";
    }
    return elt.attachShadow({ mode });
  }
  function renderElement(elt, id) {
    const s = state[id];
    if (s === void 0 || s.data === void 0 || s.dirty === false) {
      return;
    }
    switch (s.mode) {
      case "inner":
        patchInner(elt, s.data);
        break;
      case "outer":
        patchOuter(elt, s.data);
        break;
      case "shadow":
      case "shadow-open":
      case "shadow-closed":
        if (!s.shadowRoot) {
          s.shadowRoot = initializeShadowRoot(elt, s.mode);
          publish("model/ui/event/new-shadow-root/" + id, { id, shadow_root: s.shadowRoot });
        }
        patchInner(s.shadowRoot, s.data);
    }
    s.dirty = false;
    return true;
  }
  function render2() {
    const updated_ids = [];
    for (let i = 0; i < order.length; i++) {
      if (renderId(order[i].id)) {
        updated_ids.push(order[i].id);
      }
    }
    setTimeout(
      function() {
        for (let i = 0; i < updated_ids.length; i++) {
          publish("model/ui/event/dom-updated/" + updated_ids[i], { id: updated_ids[i] });
        }
      },
      0
    );
  }
  function on(topic, msg, event, options) {
    options = options || {};
    const payload2 = {
      message: msg,
      event: event ? cloneableEvent(event) : void 0,
      value: event ? eventTargetValue(event) : void 0,
      data: event ? eventDataAttributes(event) : void 0
    };
    const pubopts = {
      qos: typeof options.qos == "number" ? options.qos : 0
    };
    if (options.response_topic) {
      call(topic, payload2, pubopts).then(function(resp) {
        publish(options.response_topic, resp.payload, pubopts);
      });
    } else {
      publish(topic, payload2, pubopts);
    }
    if (typeof event.type == "string") {
      switch (options.cancel) {
        case false:
          break;
        case "preventDefault":
          if (event.cancelable) {
            event.preventDefault();
          }
          break;
        case true:
        default:
          if (event.cancelable) {
            event.preventDefault();
          }
          event.stopPropagation();
          break;
      }
    }
    return false;
  }
  function cloneableEvent(e) {
    return {
      eventName: e.constructor.name,
      altKey: e.altKey,
      bubbles: e.bubbles,
      button: e.button,
      buttons: e.buttons,
      cancelBubble: e.cancelBubble,
      cancelable: e.cancelable,
      clientX: e.clientX,
      clientY: e.clientY,
      composed: e.composed,
      ctrlKey: e.ctrlKey,
      currentTargetId: e.currentTarget ? e.currentTarget.id : null,
      defaultPrevented: e.defaultPrevented,
      detail: e.detail,
      eventPhase: e.eventPhase,
      fromElementId: e.fromElement ? e.fromElement.id : null,
      isTrusted: e.isTrusted,
      keyCode: window.event ? e.keyCode : e.which,
      layerX: e.layerX,
      layerY: e.layerY,
      metaKey: e.metaKey,
      movementX: e.movementX,
      movementY: e.movementY,
      offsetX: e.offsetX,
      offsetY: e.offsetY,
      pageX: e.pageX,
      pageY: e.pageY,
      // path: pathToSelector(e.path && e.path.length ? e.path[0] : null),
      relatedTargetId: e.relatedTarget ? e.relatedTarget.id : null,
      returnValue: e.returnValue,
      screenX: e.screenX,
      screenY: e.screenY,
      shiftKey: e.shiftKey,
      // sourceCapabilities: e.sourceCapabilities ? e.sourceCapabilities.toString() : null,
      targetId: e.target ? e.target.id : null,
      timeStamp: e.timeStamp,
      toElementId: e.toElement ? e.toElement.id : null,
      type: e.type,
      // view: e.view ? e.view.toString() : null,
      which: e.which,
      x: e.x,
      y: e.y
    };
  }
  function eventDataAttributes(event) {
    const d = {};
    if (!event.target)
      return d;
    if (event.target.hasOwnProperty("attributes")) {
      const attrs = event.target.attributes;
      for (let i = 0; i < attrs.length; i++) {
        if (attrs[i].name.startsWith("data-")) {
          d[attrs[i].name.substr(5)] = attrs[i].value;
        }
      }
    }
    return d;
  }
  function eventTargetValue(event) {
    if (event.target && !event.target.disabled) {
      const elt = event.target;
      switch (event.target.nodeName) {
        case "FORM":
          return serializeForm(elt);
        case "INPUT":
        case "SELECT":
          if (elt.type == "select-multiple") {
            const l = elt.options.length;
            const v = [];
            for (let j = 0; j < l; j++) {
              if (elt.options[j].selected) {
                v[v.length] = elt.options[j].value;
              }
            }
            return v;
          } else if (elt.type == "checkbox" || elt.type == "radio") {
            if (elt.checked) {
              return elt.value;
            } else {
              return false;
            }
          }
          return elt.value;
        case "TEXTAREA":
          return elt.value;
        default:
          return void 0;
      }
    } else {
      return void 0;
    }
  }
  function serializeForm(form) {
    let field, l, v, s = {};
    if (typeof form == "object" && form.nodeName == "FORM") {
      const len = form.elements.length;
      for (let i = 0; i < len; i++) {
        field = form.elements[i];
        if (field.name && !field.disabled && field.type != "file" && field.type != "reset" && field.type != "submit" && field.type != "button") {
          if (field.type == "select-multiple") {
            v = [];
            l = form.elements[i].options.length;
            for (let j = 0; j < l; j++) {
              if (field.options[j].selected) {
                v[v.length] = field.options[j].value;
              }
            }
            s[field.name] = v;
          } else if (field.type != "checkbox" && field.type != "radio" || field.checked) {
            s[field.name] = field.value;
          }
        }
      }
    }
    return s;
  }
  function updateStateData(model2, states) {
    stateData[model2] = states;
    syncStateData();
  }
  function updateStateClass(model2, classes) {
    stateClass[model2] = classes;
    syncStateClass();
  }
  function syncStateClass() {
    let attr = document.body.parentElement.getAttribute("class") || "";
    let classes = attr.split(/\s+/);
    let keep = [];
    var i, j;
    for (i = classes.length - 1; i >= 0; i--) {
      if (!classes[i].startsWith("ui-state-")) {
        keep.push(classes[i]);
      }
    }
    let ms = Object.keys(stateClass);
    for (i = ms.length - 1; i >= 0; i--) {
      let m = ms[i];
      for (j = stateClass[m].length - 1; j >= 0; j--) {
        keep.push("ui-state-" + m + "-" + stateClass[m][j]);
      }
    }
    let new_attr = keep.sort().join(" ");
    if (new_attr != attr) {
      document.body.parentElement.setAttribute("class", new_attr);
    }
  }
  function syncStateData() {
    let root2 = document.body.parentElement;
    var current = {};
    var attrs = {};
    var i, j;
    var ks;
    if (root2.hasAttributes()) {
      var rs = root2.attributes;
      for (i = rs.length - 1; i >= 0; i--) {
        if (rs[i].name.startsWith("data-ui-state-")) {
          current[rs[i].name] = rs[i].value;
        }
      }
    }
    let ms = Object.keys(stateData);
    for (i = ms.length - 1; i >= 0; i--) {
      let m = ms[i];
      let ks2 = Object.keys(stateData[m]);
      for (j = ks2.length - 1; j >= 0; j--) {
        attrs["data-ui-state-" + m + "-" + ks2[j]] = stateData[m][ks2[j]];
      }
    }
    ks = Object.keys(current);
    for (i = ks.length - 1; i >= 0; i--) {
      if (!(ks[i] in attrs)) {
        root2.removeAttribute(ks[i]);
      }
    }
    ks = Object.keys(attrs);
    for (i = ks.length - 1; i >= 0; i--) {
      var k = ks[i];
      if (!(k in current) || attrs[k] != current[k]) {
        root2.setAttribute(k, attrs[k]);
      }
    }
  }
  function requestRender() {
    if (animationFrameRequestId) {
      return;
    }
    function renderUpdate() {
      animationFrameRequestId = void 0;
      render2();
    }
    animationFrameRequestId = window.requestAnimationFrame(renderUpdate);
  }

  // src/cotonic.mqtt_packet.js
  var cotonic_mqtt_packet_exports = {};
  __export(cotonic_mqtt_packet_exports, {
    UTF8ToString: () => UTF8ToString,
    decode: () => decoder,
    encode: () => encoder,
    stringToUTF8: () => stringToUTF8
  });
  var MESSAGE_TYPE = {
    CONNECT: 1,
    CONNACK: 2,
    PUBLISH: 3,
    PUBACK: 4,
    PUBREC: 5,
    PUBREL: 6,
    PUBCOMP: 7,
    SUBSCRIBE: 8,
    SUBACK: 9,
    UNSUBSCRIBE: 10,
    UNSUBACK: 11,
    PINGREQ: 12,
    PINGRESP: 13,
    DISCONNECT: 14,
    AUTH: 15
  };
  var PROPERTY = {
    payload_format_indicator: [1, "bool", false],
    message_expiry_interval: [2, "uint32", false],
    content_type: [3, "utf8", false],
    response_topic: [8, "utf8", false],
    correlation_data: [9, "bin", false],
    subscription_identifier: [11, "varint", true],
    session_expiry_interval: [17, "uint32", false],
    assigned_client_identifier: [18, "utf8", false],
    server_keep_alive: [19, "uint16", false],
    authentication_method: [21, "utf8", false],
    authentication_data: [22, "bin", false],
    request_problem_information: [23, "bool", false],
    will_delay_interval: [24, "uint32", false],
    request_response_information: [25, "bool", false],
    response_information: [26, "bin", false],
    server_reference: [28, "utf8", false],
    reason_string: [31, "utf8", false],
    receive_maximum: [33, "uint16", false],
    topic_alias_maximum: [34, "uint16", false],
    topic_alias: [35, "uint16", false],
    maximum_qos: [36, "uint8", false],
    retain_available: [37, "bool", false],
    __user: [38, "user", false],
    maximum_packet_size: [39, "uint32", false],
    wildcard_subscription_available: [40, "bool", false],
    subscription_identifier_available: [41, "bool", false],
    shared_subscription_available: [42, "bool", false]
  };
  var PROPERTY_DECODE = [];
  var MqttProtoIdentifierv5 = [0, 4, 77, 81, 84, 84, 5];
  var encoder = function(msg) {
    switch (msg.type) {
      case "connect":
        return encodeConnect(msg);
      case "connack":
        return encodeConnack(msg);
      case "publish":
        return encodePublish2(msg);
      case "puback":
      case "pubrec":
      case "pubrel":
      case "pubcomp":
        return encodePubackEtAl(msg);
      case "subscribe":
        return encodeSubscribe2(msg);
      case "suback":
        return encodeSuback(msg);
      case "unsubscribe":
        return encodeUnsubscribe(msg);
      case "unsuback":
        return encodeUnsuback(msg);
      case "pingreq":
        return encodePingReq(msg);
      case "pingresp":
        return encodePingResp(msg);
      case "disconnect":
        return encodeDisconnect(msg);
      case "auth":
        return encodeAuth(msg);
      default:
        throw "Unknown type for encode: " + msg;
    }
  };
  function encodeConnect(msg) {
    var first = MESSAGE_TYPE.CONNECT << 4;
    var willFlag = msg.will_flag || false;
    var willRetain = msg.will_retain || false;
    var willQoS = msg.will_qos || 0;
    var cleanStart = msg.clean_start || false;
    var v = new binary();
    v.append(MqttProtoIdentifierv5);
    var flags = 0;
    if (typeof msg.username == "string") {
      flags |= 1 << 7;
    }
    if (typeof msg.password == "string") {
      flags |= 1 << 6;
    }
    flags |= (willRetain ? 1 : 0) << 5;
    flags |= (willQoS & 3) << 3;
    flags |= (willFlag ? 1 : 0) << 2;
    flags |= (cleanStart ? 1 : 0) << 1;
    v.append1(flags);
    v.appendUint16(msg.keep_alive || 0);
    v.appendProperties(msg.properties || {});
    v.appendUTF8(msg.client_id || "");
    if (willFlag) {
      v.appendProperties(msg.will_properties || {});
      v.appendUTF8(msg.will_topic);
      v.appendBin(msg.will_payload, true);
    }
    if (typeof msg.username == "string") {
      v.appendUTF8(msg.username);
    }
    if (typeof msg.password == "string") {
      v.appendUTF8(msg.password);
    }
    return packet(first, v);
  }
  function encodeConnack(msg) {
    var first = MESSAGE_TYPE.CONNACK << 4;
    var flags = 0;
    var v = new binary();
    if (msg.session_present) {
      flags |= 1;
    }
    v.append1(flags);
    v.append1(msg.reason_code || 0);
    v.appendProperties(msg.properties || {});
    return packet(first, v);
  }
  function encodePublish2(msg) {
    var first = MESSAGE_TYPE.PUBLISH << 4;
    var v = new binary();
    var qos = msg.qos || 0;
    var dup = msg.dup || false;
    var retain2 = msg.retain || false;
    first |= (dup ? 1 : 0) << 3;
    first |= (qos & 3) << 1;
    first |= retain2 ? 1 : 0;
    v.appendUTF8(msg.topic);
    if (qos != 0) {
      v.appendUint16(msg.packet_id);
    }
    v.appendProperties(msg.properties || {});
    if (typeof msg.payload !== "undefined") {
      v.appendBin(msg.payload);
    }
    return packet(first, v);
  }
  function encodePubackEtAl(msg) {
    var first;
    var v = new binary();
    var rc = msg.reason_code || 0;
    var ps = msg.properties || {};
    switch (msg.type) {
      case "puback":
        first |= MESSAGE_TYPE.PUBACK << 4;
        break;
      case "pubrec":
        first |= MESSAGE_TYPE.PUBREC << 4;
        break;
      case "pubrel":
        first |= MESSAGE_TYPE.PUBREL << 4 | 2;
        break;
      case "pubcomp":
        first |= MESSAGE_TYPE.PUBCOMP << 4;
        break;
    }
    v.appendUint16(msg.packet_id);
    if (rc != 0 || Object.keys(ps).length != 0) {
      v.append1(rc);
      v.appendProperties(ps);
    }
    return packet(first, v);
  }
  function encodeSubscribe2(msg) {
    var first = MESSAGE_TYPE.SUBSCRIBE << 4;
    var v = new binary();
    first |= 1 << 1;
    v.appendUint16(msg.packet_id);
    v.appendProperties(msg.properties || {});
    serializeSubscribeTopics(v, msg.topics);
    return packet(first, v);
  }
  function encodeSuback(msg) {
    var first = MESSAGE_TYPE.SUBACK << 4;
    var v = new binary();
    v.appendUint16(msg.packet_id);
    v.appendProperties(msg.properties || {});
    serializeSubscribeAcks(v, msg.acks);
    return packet(first, v);
  }
  function encodeUnsubscribe(msg) {
    var first = MESSAGE_TYPE.UNSUBSCRIBE << 4 | 2;
    var v = new binary();
    v.appendUint16(msg.packet_id);
    v.appendProperties(msg.properties || {});
    serializeUnsubscribeTopics(v, msg.topics);
    return packet(first, v);
  }
  function encodeUnsuback(msg) {
    var first = MESSAGE_TYPE.UNSUBACK << 4;
    var v = new binary();
    v.appendUint16(msg.packet_id);
    v.appendProperties(msg.properties || {});
    serializeUnsubscribeAcks(v, msg.acks);
    return packet(first, v);
  }
  function encodePingReq() {
    var first = MESSAGE_TYPE.PINGREQ << 4;
    var v = new binary();
    return packet(first, v);
  }
  function encodePingResp() {
    var first = MESSAGE_TYPE.PINGRESP << 4;
    var v = new binary();
    return packet(first, v);
  }
  function encodeDisconnect(msg) {
    var first = MESSAGE_TYPE.DISCONNECT << 4;
    var v = new binary();
    var reason_code = msg.reason_code || 0;
    var properties = msg.properties || {};
    if (reason_code != 0 || !isEmptyProperties(properties)) {
      v.append1(reason_code);
      v.appendProperties(properties);
    }
    return packet(first, v);
  }
  function encodeAuth(msg) {
    var first = MESSAGE_TYPE.AUTH << 4;
    var v = new binary();
    var reason_code = msg.reason_code || 0;
    var properties = msg.properties || {};
    if (reason_code != 0 || !isEmptyProperties(properties)) {
      v.append1(reason_code);
      v.appendProperties(properties);
    }
    return packet(first, v);
  }
  var decoder = function(binary2) {
    if (binary2.length < 2) {
      throw "incomplete_packet";
    }
    var b = new decodeStream(binary2);
    var first = b.decode1();
    var len = b.decodeVarint();
    var variable = b.decodeBin(len);
    var m;
    try {
      var vb = new decodeStream(variable);
      switch (first >> 4) {
        case MESSAGE_TYPE.CONNECT:
          m = decodeConnect(first, vb);
          break;
        case MESSAGE_TYPE.CONNACK:
          m = decodeConnack(first, vb);
          break;
        case MESSAGE_TYPE.PUBLISH:
          m = decodePublish(first, vb);
          break;
        case MESSAGE_TYPE.PUBACK:
        case MESSAGE_TYPE.PUBREC:
        case MESSAGE_TYPE.PUBCOMP:
          m = decodePubackEtAl(first, vb);
          break;
        case MESSAGE_TYPE.PUBREL:
          if ((first & 15) !== 2) {
            throw "invalid_packet";
          }
          m = decodePubackEtAl(first, vb);
          break;
        case MESSAGE_TYPE.SUBSCRIBE:
          m = decodeSubscribe(first, vb);
          break;
        case MESSAGE_TYPE.SUBACK:
          m = decodeSuback(first, vb);
          break;
        case MESSAGE_TYPE.UNSUBSCRIBE:
          m = decodeUnsubscribe(first, vb);
          break;
        case MESSAGE_TYPE.UNSUBACK:
          m = decodeUnsuback(first, vb);
          break;
        case MESSAGE_TYPE.PINGREQ:
          m = decodePingReq(first, vb);
          break;
        case MESSAGE_TYPE.PINGRESP:
          m = decodePingResp(first, vb);
          break;
        case MESSAGE_TYPE.DISCONNECT:
          m = decodeDisconnect(first, vb);
          break;
        case MESSAGE_TYPE.AUTH:
          m = decodeAuth(first, vb);
          break;
        default:
          throw "invalid_packet";
      }
    } catch (E) {
      let err = E;
      if (err === "incomplete_packet") {
        err = "invalid_packet";
      }
      throw err;
    }
    return [m, b.remainingData()];
  };
  function decodeConnect(first, vb) {
    var protocolName = vb.decodeUtf8();
    var protocolLevel = vb.decode1();
    if (protocolName == "MQTT" && protocolLevel == 5) {
      var flags = vb.decode1();
      var usernameFlag = !!(flags & 128);
      var passwordFlag = !!(flags & 64);
      var willRetain = !!(flags & 32);
      var willQos = flags >> 3 & 3;
      var willFlag = !!(flags & 4);
      var cleanStart = !!(flags & 2);
      var keepAlive = vb.decodeUint16();
      var props = vb.decodeProperties();
      var clientId = vb.decodeUtf8();
      var willProps = {};
      var willTopic;
      var willPayload;
      if (willFlag) {
        willProps = vb.decodeProperties();
        willTopic = vb.decodeUtf8();
        var willPayloadLen = vb.decodeUint16();
        willPayload = vb.decodeBin(willPayloadLen);
      }
      var username;
      var password;
      if (usernameFlag) {
        username = vb.decodeUtf8();
      }
      if (passwordFlag) {
        password = vb.decodeUtf8();
      }
      return {
        type: "connect",
        protocol_name: protocolName,
        protocol_version: protocolLevel,
        client_id: clientId,
        clean_start: cleanStart,
        keep_alive: keepAlive,
        properties: props,
        username,
        password,
        will_flag: willFlag,
        will_retain: willRetain,
        will_qos: willQos,
        will_properties: willProps,
        will_topic: willTopic,
        will_payload: willPayload
      };
    } else {
      throw "unknown_protocol";
    }
  }
  function decodeConnack(first, vb) {
    var flags = vb.decode1();
    var sessionPresent = !!(flags & 1);
    var connectReason = vb.decode1();
    var props = vb.decodeProperties();
    return {
      type: "connack",
      session_present: sessionPresent,
      reason_code: connectReason,
      properties: props
    };
  }
  function decodePublish(first, vb) {
    var dup = !!(first & 8);
    var qos = first >> 1 & 3;
    var retain2 = !!(first & 1);
    var topic = vb.decodeUtf8();
    var packetId = null;
    if (qos > 0) {
      packetId = vb.decodeUint16();
    }
    var props = vb.decodeProperties();
    var payload2 = vb.remainingData();
    return {
      type: "publish",
      dup,
      qos,
      retain: retain2,
      topic,
      packet_id: packetId,
      properties: props,
      payload: payload2
    };
  }
  function decodePubackEtAl(first, vb) {
    var packetId = vb.decodeUint16();
    var reasonCode = 0;
    var props = {};
    var type;
    if (vb.remainingLength() > 0) {
      reasonCode = vb.decode1();
      props = vb.decodeProperties();
    }
    switch (first >> 4) {
      case MESSAGE_TYPE.PUBACK:
        type = "puback";
        break;
      case MESSAGE_TYPE.PUBREC:
        type = "pubrec";
        break;
      case MESSAGE_TYPE.PUBREL:
        type = "pubrel";
        break;
      case MESSAGE_TYPE.PUBCOMP:
        type = "pubcomp";
        break;
    }
    return {
      type,
      packet_id: packetId,
      reason_code: reasonCode,
      properties: props
    };
  }
  function decodeSubscribe(first, vb) {
    var packetId = vb.decodeUint16();
    var props = vb.decodeProperties();
    var topics = [];
    while (vb.remainingLength() > 0) {
      var name = vb.decodeUtf8();
      var flags = vb.decode1();
      topics.push({
        topic: name,
        retain_handling: (flags >> 4) % 3,
        retain_as_published: !!(flags & 8),
        no_local: !!(flags & 4),
        qos: flags & 3
      });
    }
    return {
      type: "subscribe",
      packet_id: packetId,
      topics,
      properties: props
    };
  }
  function decodeSuback(first, vb) {
    var packetId = vb.decodeUint16();
    var props = vb.decodeProperties();
    var acks = [];
    while (vb.remainingLength() > 0) {
      var ack = vb.decode1();
      if (ack > 2 && ack < 128) {
        throw "Illegal suback";
      }
      acks.push(ack);
    }
    return {
      type: "suback",
      packet_id: packetId,
      properties: props,
      acks
    };
  }
  function decodeUnsubscribe(first, vb) {
    var packetId = vb.decodeUint16();
    var props = vb.decodeProperties();
    var topics = [];
    while (vb.remainingLength() > 0) {
      var topic = vb.decodeUtf8();
      topics.push(topic);
    }
    return {
      type: "unsubscribe",
      packet_id: packetId,
      properties: props,
      topics
    };
  }
  function decodeUnsuback(first, vb) {
    var packetId = vb.decodeUint16();
    var props = vb.decodeProperties();
    var acks = [];
    while (vb.remainingLength() > 0) {
      var ack = vb.decode1();
      if (ack != 0 && ack != 17 && ack < 128) {
        throw "Illegal unsuback";
      }
      acks.push(ack);
    }
    return {
      type: "unsuback",
      packet_id: packetId,
      properties: props,
      acks
    };
  }
  function decodePingReq(first, vb) {
    if (vb.remainingLength() > 0) {
      throw "pingreq with variable part";
    }
    return {
      type: "pingreq"
    };
  }
  function decodePingResp(first, vb) {
    if (vb.remainingLength() > 0) {
      throw "pingresp with variable part";
    }
    return {
      type: "pingresp"
    };
  }
  function decodeDisconnect(first, vb) {
    var reasonCode;
    var props;
    if (vb.remainingLength() == 0) {
      reasonCode = 0;
      props = {};
    } else {
      reasonCode = vb.decode1();
      props = vb.decodeProperties();
    }
    return {
      type: "disconnect",
      reason_code: reasonCode,
      properties: props
    };
  }
  function decodeAuth(first, vb) {
    var reasonCode;
    var props;
    if (vb.remainingLength() == 0) {
      reasonCode = 0;
      props = {};
    } else {
      reasonCode = vb.decode1();
      props = vb.decodeProperties();
    }
    return {
      type: "auth",
      reason_code: reasonCode,
      properties: props
    };
  }
  function decodeStream(binary2) {
    this.offset = 0;
    this.buf = binary2;
    var self = this;
    this.remainingLength = function() {
      return self.buf.length - self.offset;
    };
    this.remainingData = function() {
      if (self.buf.length == self.offset) {
        return new Uint8Array(0);
      } else {
        return self.buf.slice(self.offset, self.buf.length);
      }
    };
    this.ensure = function(n) {
      if (self.offset + n > self.buf.length) {
        throw "incomplete_packet";
      }
    };
    this.decodeVarint = function() {
      var multiplier = 1;
      var n = 0;
      var digits = 0;
      var digit;
      do {
        self.ensure(1);
        if (++digits > 4) {
          throw "malformed";
        }
        digit = self.buf[self.offset++];
        n += (digit & 127) * multiplier;
        multiplier *= 128;
      } while ((digit & 128) !== 0);
      return n;
    };
    this.decode1 = function() {
      self.ensure(1);
      return self.buf[self.offset++];
    };
    this.decodeUint16 = function() {
      self.ensure(2);
      var msb = self.buf[self.offset++];
      var lsb = self.buf[self.offset++];
      return (msb << 8) + lsb;
    };
    this.decodeUint32 = function() {
      self.ensure(4);
      var b1 = self.buf[self.offset++];
      var b2 = self.buf[self.offset++];
      var b3 = self.buf[self.offset++];
      var b4 = self.buf[self.offset++];
      return (b1 << 24) + (b2 << 16) + (b3 << 8) + b4;
    };
    this.decodeBin = function(length) {
      if (length == 0) {
        return new Uint8Array(0);
      } else {
        self.ensure(length);
        var offs = self.offset;
        self.offset += length;
        return self.buf.slice(offs, self.offset);
      }
    };
    this.decodeUtf8 = function() {
      var length = self.decodeUint16();
      return UTF8ToString(self.decodeBin(length));
    };
    this.decodeProperties = function() {
      if (self.remainingLength() == 0) {
        return {};
      }
      var len = self.decodeVarint();
      var end = self.offset + len;
      var props = {};
      while (self.offset < end) {
        var c = self.decode1();
        var p = PROPERTY_DECODE[c];
        if (p) {
          var v;
          var k = p[0];
          switch (p[1]) {
            case "bool":
              v = !!self.decode1();
              break;
            case "uint32":
              v = self.decodeUint32();
              break;
            case "uint16":
              v = self.decodeUint16();
              break;
            case "uint8":
              v = self.decode1();
              break;
            case "utf8":
              v = self.decodeUtf8();
              break;
            case "bin":
              var count = self.decodeUint16();
              v = self.decodeBin(count);
              break;
            case "varint":
              v = self.decodeVarint();
              break;
            case "user":
            default:
              k = self.decodeUtf8();
              v = self.decodeUtf8();
              break;
          }
          if (p[2]) {
            switch (typeof props[k]) {
              case "undefined":
                props[k] = v;
                break;
              case "object":
                props[k].push(v);
                break;
              default:
                props[k] = new Array(props[k], v);
                break;
            }
          } else {
            props[k] = v;
          }
        } else {
          throw "Illegal property";
        }
      }
      return props;
    };
  }
  function serializeSubscribeTopics(v, topics) {
    for (var i = 0; i < topics.length; i++) {
      var topic = topics[i];
      if (typeof topic == "string") {
        topic = { topic };
      }
      var qos = topic.qos || 0;
      var noLocal = topic.no_local || false;
      var retainAsPublished = topic.retain_as_published || false;
      var retainHandling = topic.retain_handling || 0;
      var flags = 0;
      flags |= retainHandling << 4;
      flags |= (retainAsPublished ? 1 : 0) << 3;
      flags |= (noLocal ? 1 : 0) << 2;
      flags |= qos;
      v.appendUTF8(topic.topic);
      v.append1(flags);
    }
  }
  function serializeSubscribeAcks(v, acks) {
    for (var i = 0; i < acks.length; i++) {
      var ack = acks[i];
      if (ack >= 0 && ack <= 2) {
        v.append1(ack);
      } else if (ack >= 128 && ack <= 255) {
        v.append1(ack);
      } else {
        throw "Subscribe ack outside 0..2 and 0x80..0xff";
      }
    }
  }
  function serializeUnsubscribeTopics(v, topics) {
    for (var i = 0; i < topics.length; i++) {
      v.appendUTF8(topics[i]);
    }
  }
  function serializeUnsubscribeAcks(v, acks) {
    for (var i = 0; i < acks.length; i++) {
      var ack = acks[i];
      if (ack == 0 || ack == 17) {
        v.append1(ack);
      } else if (ack >= 128 && ack <= 255) {
        v.append1(ack);
      } else {
        throw "Unsubscribe ack outside 0..2 and 0x80..0xff";
      }
    }
  }
  function packet(first, binary2) {
    var mbi = encodeMBI(binary2.length());
    var pack = new Uint8Array(1 + mbi.length + binary2.length());
    pack[0] = first;
    for (var i = 0; i < mbi.length; i++) {
      pack[1 + i] = mbi[i];
    }
    binary2.copyInto(pack, 1 + mbi.length);
    return pack;
  }
  function binary() {
    this.size = 64;
    this.buf = new Uint8Array(this.size);
    this.len = 0;
    var self = this;
    this.length = function() {
      return this.len;
    };
    this.copyInto = function(buf, offset) {
      for (var i = self.len - 1; i >= 0; i--) {
        buf[i + offset] = self.buf[i];
      }
    };
    this.val = function() {
      return self.buf.slice(0, self.len);
    };
    this.append = function(bytes) {
      self.reserve(bytes.length);
      for (var i = 0; i < bytes.length; i++) {
        self.buf[self.len++] = bytes[i];
      }
    };
    this.append1 = function(byte) {
      self.reserve(1);
      self.buf[self.len++] = byte;
    };
    this.appendUint32 = function(input) {
      self.reserve(4);
      if (input < 0) {
        throw "Value uint32 below 0";
      }
      self.buf[self.len++] = input >> 24 & 255;
      self.buf[self.len++] = input >> 16 & 255;
      self.buf[self.len++] = input >> 8 & 255;
      self.buf[self.len++] = input & 255;
    };
    this.appendUint16 = function(input) {
      self.reserve(2);
      if (input < 0 || input >= 65536) {
        throw "Value too large for uint16";
      }
      self.buf[self.len++] = input >> 8;
      self.buf[self.len++] = input & 255;
    };
    this.appendVarint = function(number) {
      if (number < 0) {
        throw "Negative varint";
      }
      var numBytes = 0;
      do {
        self.reserve(1);
        var digit = number % 128;
        number = number >> 7;
        if (number > 0) {
          digit |= 128;
        }
        self.buf[self.len++] = digit;
      } while (number > 0 && ++numBytes < 4);
    };
    this.appendUTF8 = function(s) {
      var b = stringToUTF8(s);
      self.appendUint16(b.length);
      self.reserve(b.length);
      for (var i = 0; i < b.length; i++) {
        self.buf[self.len++] = b[i];
      }
    };
    this.appendBin = function(b, addlen) {
      switch (typeof b) {
        case "undefined":
          if (addlen) {
            this.appendUint16(0);
          }
          break;
        case "string":
          b = stringToUTF8(b);
          if (addlen) {
            self.appendUint16(b.length);
          }
          self.reserve(b.length);
          for (var i = 0; i < b.length; i++) {
            self.buf[self.len++] = b[i];
          }
          break;
        case "object":
          if (b instanceof binary) {
            if (addlen) {
              self.appendUint16(b.length());
            }
            self.reserve(b.length());
            b.copyInto(self.buf, self.len);
            self.len += b.length();
          } else if (typeof b.BYTES_PER_ELEMENT == "number") {
            var v;
            if (b.BYTES_PER_ELEMENT == 1) {
              v = b;
            } else {
              v = new Uint8Array(b.buffer);
            }
            self.reserve(v.length + 2);
            if (addlen) {
              self.appendUint16(v.length);
            }
            for (let i2 = 0; i2 < v.length; i2++) {
              self.buf[self.len++] = v[i2];
            }
          } else {
            throw "Can't serialize unknown object";
          }
          break;
        default:
          throw "Can't serialize unsupported type: " + typeof b;
      }
    };
    this.appendProperties = function(props) {
      var b = serializeProperties(props);
      self.appendVarint(b.length());
      self.appendBin(b);
    };
    this.reserve = function(count) {
      if (self.size < self.len + count) {
        var newsize = self.size * 2;
        while (newsize < self.size + count) {
          newsize = newsize * 2;
        }
        var newbuf = new Uint8Array(newsize);
        for (var i = self.len - 1; i >= 0; i--) {
          newbuf[i] = self.buf[i];
        }
        self.size = newsize;
        self.buf = newbuf;
      }
    };
  }
  function isEmptyProperties(props) {
    for (var k in props) {
      if (!props.hasOwnProperty(k)) {
        continue;
      }
      return false;
    }
    return true;
  }
  function serializeProperties(props) {
    var b = new binary();
    for (var k in props) {
      if (!props.hasOwnProperty(k)) {
        continue;
      }
      var p = PROPERTY[k] || PROPERTY.__user;
      if (p[2] && props[k].constructor === Array) {
        for (var i = 0; i < props[k].length; i++) {
          b.append1(p[0]);
          serializeProperty(p[1], k, props[k][i], b);
        }
      } else {
        b.append1(p[0]);
        serializeProperty(p[1], k, props[k], b);
      }
    }
    return b;
  }
  function serializeProperty(type, k, v, b) {
    switch (type) {
      case "bool":
        b.append1(v ? 1 : 0);
        break;
      case "uint32":
        b.appendUint32(v);
        break;
      case "uint16":
        b.appendUint16(v);
        break;
      case "uint8":
        b.append1(v);
        break;
      case "utf8":
        b.appendUTF8(v);
        break;
      case "bin":
        b.appendBin(v, true);
        break;
      case "varint":
        b.appendVarint(v);
        break;
      case "user":
      default:
        b.appendUTF8(k);
        b.appendUTF8(v);
        break;
    }
  }
  function UTF8ToString(input) {
    return new TextDecoder("utf-8").decode(input);
  }
  function stringToUTF8(input) {
    return new TextEncoder("utf-8").encode(input);
  }
  function encodeMBI(number) {
    var output = new Array(1);
    var numBytes = 0;
    do {
      var digit = number % 128;
      number = number >> 7;
      if (number > 0) {
        digit |= 128;
      }
      output[numBytes++] = digit;
    } while (number > 0 && numBytes < 4);
    return output;
  }
  function init() {
    for (var k in PROPERTY) {
      var p = PROPERTY[k];
      PROPERTY_DECODE[p[0]] = [k, p[1], p[2]];
    }
  }
  init();

  // src/cotonic.mqtt_transport.ws.js
  var cotonic_mqtt_transport_ws_exports = {};
  __export(cotonic_mqtt_transport_ws_exports, {
    newTransport: () => newTransport
  });
  var WS_CONTROLLER_PATH = "/mqtt-transport";
  var WS_CONNECT_DELAY = 20;
  var WS_PERIODIC_DELAY = 1e3;
  function newTransport(remote, mqttSession2, options) {
    return new ws(remote, mqttSession2, options);
  }
  function ws(remote, mqttSession2, options) {
    this.remoteUrl = void 0;
    this.remoteHost = void 0;
    this.session = mqttSession2;
    this.socket = void 0;
    this.randomPing = void 0;
    this.backoff = 0;
    this.errorsSinceLastData = 0;
    this.awaitPong = false;
    this.isConnected = false;
    this.isForceClosed = false;
    this.data = void 0;
    const controller_path = options.controller_path || WS_CONTROLLER_PATH;
    const connect_delay = options.connect_delay || WS_CONNECT_DELAY;
    const periodic_delay = options.periodic_delay || WS_PERIODIC_DELAY;
    const protocol = options.protocol || (document.location.protocol === "http:" ? "ws" : "wss");
    var self = this;
    this.sendMessage = function(message) {
      if (isStateConnected()) {
        var b = encoder(message);
        self.socket.send(b.buffer);
        if (message.type == "disconnect") {
          self.closeConnection();
        }
        return true;
      } else {
        return false;
      }
    };
    this.name = function() {
      return "mqtt_transport.ws: " + this.remoteUrl;
    };
    this.closeConnection = function() {
      if (isStateConnected() || isStateConnecting()) {
        self.socket.close();
        self.isConnected = false;
        self.isForceClosed = true;
        unsubscribe("model/lifecycle/event/state", { wid: self.name() });
      }
    };
    this.closeReconnect = function(isNoBackOff) {
      if (isStateConnected() || isStateConnecting()) {
        self.socket.close();
        self.isConnected = false;
      }
      self.isForceClosed = false;
      if (isNoBackOff === true) {
        self.backoff = 0;
        connect();
      } else {
        setBackoff();
      }
    };
    this.openConnection = function() {
      self.isForceClosed = false;
      connect();
    };
    function isStateConnected() {
      return !self.awaitPong && self.isConnected && self.socket && self.socket.readyState == 1;
    }
    function isStateConnecting() {
      return !self.isConnected || self.awaitPing || self.socket && self.socket.readyState == 0;
    }
    function isStateClosing() {
      return self.socket && self.socket.readyState == 2;
    }
    function isStateClosed() {
      return !self.socket || self.socket.readyState == 3;
    }
    function isStateForceClosed() {
      return self.isForceClosed;
    }
    function isStateBackoff() {
      return self.backoff > 0;
    }
    function periodic() {
      if (isStateClosed() && !isStateForceClosed()) {
        if (self.backoff > 0) {
          self.backoff--;
        } else {
          connect();
        }
      }
    }
    function handleError(reason) {
      console.log("Closing websocket connection to " + self.remoteUrl + " due to " + reason);
      self.errorsSinceLastData++;
      if (isStateConnected()) {
        self.socket.close();
        self.isConnected = false;
      } else {
        self.isConnected = self.socket.readyState == 1;
      }
      setBackoff();
      self.session.disconnected("ws", reason);
    }
    function connect() {
      if (!isStateClosed()) {
        return false;
      }
      if (isStateForceClosed()) {
        return false;
      }
      self.data = new Uint8Array(0);
      self.isConnected = false;
      self.awaitPong = true;
      self.socket = void 0;
      let callOnOpen = false;
      let onopen = function() {
        self.isConnected = true;
        if (self.socket.protocol == "mqtt.cotonic.org") {
          self.randomPing = new Uint8Array([
            255,
            254,
            42,
            Math.floor(Math.random() * 100),
            Math.floor(Math.random() * 100)
          ]);
          self.socket.send(self.randomPing.buffer);
          self.awaitPong = true;
        } else {
          self.awaitPong = false;
          self.session.connected("ws");
        }
      };
      if (globalThis.cotonic && globalThis.cotonic.bridgeSocket && globalThis.cotonic.bridgeSocket.url == self.remoteUrl) {
        switch (globalThis.cotonic.bridgeSocket.readyState) {
          case 0:
            self.socket = cotonic.bridgeSocket;
            break;
          case 1:
            callOnOpen = true;
            self.socket = cotonic.bridgeSocket;
            break;
          default:
            break;
        }
        globalThis.cotonic.bridgeSocket = void 0;
      }
      if (!self.socket) {
        self.socket = new WebSocket(self.remoteUrl, ["mqtt"]);
      }
      self.socket.binaryType = "arraybuffer";
      self.socket.onopen = onopen;
      self.socket.onclose = function() {
        handleError("ws-close");
      };
      ;
      self.socket.onerror = function() {
        handleError("ws-error");
      };
      ;
      self.socket.onmessage = function(message) {
        if (message.data instanceof ArrayBuffer) {
          var data = new Uint8Array(message.data);
          if (self.awaitPong) {
            if (equalData(data, self.randomPing)) {
              self.awaitPong = false;
              self.session.connected("ws");
            } else {
              handleError("ws-pongdata");
            }
          } else {
            receiveData(data);
          }
        }
      };
      if (callOnOpen) {
        onopen();
      }
      subscribe(
        "model/lifecycle/event/state",
        function(m) {
          if (m.payload === "active") {
            self.backoff = 0;
          }
        },
        { wid: self.name() }
      );
      return true;
    }
    function equalData(a, b) {
      if (a.length == b.length) {
        for (var i = 0; i < a.length; i++) {
          if (a[i] != b[i]) {
            return false;
          }
        }
        return true;
      } else {
        return false;
      }
    }
    function receiveData(rcvd) {
      if (self.data.length == 0) {
        self.data = rcvd;
      } else {
        var i;
        var k = 0;
        var newdata = new Uint8Array(self.data.length, rcvd.length);
        for (i = 0; i < self.data.length; i++) {
          newdata[k++] = self.data[i];
        }
        for (i = 0; i < rcvd.length; i++) {
          newdata[k++] = rcvd[i];
        }
        self.data = newdata;
      }
      decodeReceivedData();
    }
    function decodeReceivedData() {
      var ok = true;
      while (ok && self.data.length > 0) {
        try {
          var result = decoder(self.data);
          handleBackoff(result[0]);
          self.data = result[1];
          self.session.receiveMessage(result[0]);
        } catch (e) {
          if (e != "incomplete_packet") {
            handleError(e);
          }
          ok = false;
        }
      }
    }
    function setBackoff() {
      self.backoff = Math.min(30, self.errorsSinceLastData * self.errorsSinceLastData);
    }
    function handleBackoff(msg) {
      switch (msg.type) {
        case "connack":
          if (msg.reason_code > 0) {
            self.errorsSinceLastData++;
          }
          break;
        case "disconnect":
          break;
        default:
          self.errorsSinceLastData = 0;
          break;
      }
    }
    function init7() {
      if (remote == "origin") {
        self.remoteHost = document.location.host;
      } else {
        self.remoteHost = remote;
      }
      self.remoteUrl = protocol + "://" + self.remoteHost + controller_path;
      setTimeout(connect, connect_delay);
      setInterval(periodic, periodic_delay);
    }
    init7();
  }

  // src/cotonic.mqtt_session.js
  var cotonic_mqtt_session_exports = {};
  __export(cotonic_mqtt_session_exports, {
    deleteSession: () => deleteSession,
    findSession: () => findSession,
    newSession: () => newSession
  });
  var console2 = globalThis.console;
  var sessions = {};
  var MQTT_KEEP_ALIVE = 300;
  var MQTT_SESSION_EXPIRY = 1800;
  var MQTT_RC_SUCCESS = 0;
  var MQTT_RC_DISCONNECT_WITH_WILL = 4;
  var MQTT_RC_CLIENT_ID_INVALID = 133;
  var MQTT_RC_BAD_USERNAME_OR_PASSWORD = 134;
  var MQTT_RC_PACKET_ID_IN_USE = 145;
  var MQTT_RC_PACKET_ID_NOT_FOUND = 146;
  var newSession = function(remote, bridgeTopics, options) {
    remote = remote || "origin";
    if (sessions[remote]) {
      return sessions[remote];
    } else {
      let ch = new mqttSession(bridgeTopics);
      sessions[remote] = ch;
      ch.connect(remote, options);
      return ch;
    }
  };
  var findSession = function(remote) {
    remote = remote || "origin";
    return sessions[remote];
  };
  var deleteSession = function(remote) {
    remote = remote || "origin";
    delete sessions[remote];
  };
  function init2() {
    subscribe("model/auth/event/auth-changing", function(_msg) {
      if (sessions["origin"]) {
        sessions["origin"].disconnect(MQTT_RC_DISCONNECT_WITH_WILL);
      }
    });
    subscribe("model/auth/event/auth-user-id", function(_msg) {
      if (sessions["origin"]) {
        sessions["origin"].reconnect("origin");
      }
    });
    subscribe("model/auth/event/auth", function(msg) {
      if (typeof msg.payload == "object") {
        if (sessions["origin"] && sessions["origin"].isConnected()) {
          let data = {
            user_id: msg.payload.user_id,
            options: msg.payload.options || {},
            preferences: msg.payload.preferences || {}
          };
          let topic = "bridge/origin/$client/" + sessions["origin"].clientId + "/auth";
          publish(topic, data, { qos: 0 });
        }
      }
    });
    subscribe("model/sessionId/event", function(msg) {
      if (typeof msg.payload == "string") {
        if (sessions["origin"] && sessions["origin"].isConnected()) {
          let data = {
            options: { sid: msg.payload }
          };
          let topic = "bridge/origin/$client/" + sessions["origin"].clientId + "/sid";
          publish(topic, data, { qos: 0 });
        }
      }
    });
  }
  function mqttSession(mqttBridgeTopics) {
    this.bridgeTopics = mqttBridgeTopics;
    this.connections = {};
    this.clientId = "";
    this.routingId = void 0;
    this.cleanStart = true;
    this.sendQueue = [];
    this.receiveQueue = [];
    this.isSentConnect = false;
    this.isWaitConnack = false;
    this.isWaitPingResp = false;
    this.connectProps = {};
    this.keepAliveTimer = false;
    this.keepAliveInterval = MQTT_KEEP_ALIVE;
    this.packetId = 1;
    this.messageNr = 0;
    this.awaitingAck = {};
    this.awaitingRel = {};
    this.authUserPassword = { username: void 0, password: void 0 };
    this.disconnectReason = "";
    var self = this;
    function sessionToRemote(msg) {
      switch (msg.payload.type) {
        case "publish":
          publish2(msg.payload);
          break;
        case "subscribe":
          subscribe2(msg.payload);
          break;
        case "unsubscribe":
          unsubscribe2(msg.payload);
          break;
        case "auth":
          self.sendMessage(msg.payload);
          break;
        default:
          break;
      }
    }
    function sessionToBridge(msg) {
      localPublish(self.bridgeTopics.session_in, msg);
    }
    function sessionControl(msg) {
    }
    this.connect = function(remote, options) {
      options = options || {};
      if (typeof options.client_id === "string") {
        self.clientId = options.client_id;
      }
      if (typeof options.clean_start === "boolean") {
        self.cleanStart = options.clean_start;
      }
      if (typeof options.username === "string") {
        self.authUserPassword.username = options.username;
        self.authUserPassword.password = options.password || void 0;
      }
      self.connections["ws"] = newTransport(remote, self, options);
    };
    this.disconnect = function(reasonCode) {
      if (reasonCode === void 0) {
        reasonCode = MQTT_RC_SUCCESS;
      }
      const msg = {
        type: "disconnect",
        reason_code: reasonCode
      };
      self.sendMessage(msg);
      self.clientId = "";
      if (reasonCode === MQTT_RC_SUCCESS) {
        const transport = self.connections["ws"];
        if (transport) {
          transport.closeConnection();
          delete self.connections["ws"];
          publishStatus(false);
        }
      }
      sessionToBridge({ type: "disconnect" });
    };
    this.reconnect = function(remote) {
      if (remote == "origin" && self.connections["ws"]) {
        self.connections["ws"].openConnection();
      }
    };
    this.isConnected = function() {
      return isStateConnected();
    };
    this.connected = function(transportName) {
      if (transportName === "ws") {
        if (isStateNew()) {
          call("model/sessionId/get").then(function(msg) {
            let connectMessage = {
              type: "connect",
              client_id: self.clientId,
              clean_start: self.cleanStart,
              keep_alive: MQTT_KEEP_ALIVE,
              username: self.authUserPassword.username,
              password: self.authUserPassword.password,
              properties: {
                session_expiry_interval: MQTT_SESSION_EXPIRY,
                cotonic_sid: msg.payload
              }
            };
            self.isSentConnect = self.sendMessage(connectMessage, true);
            if (self.isSentConnect) {
              self.isWaitConnack = true;
            }
          });
        }
      }
      publishEvent("transport/connected");
    };
    function publish2(pubmsg) {
      const payload2 = pubmsg.payload;
      let properties = pubmsg.properties || {};
      let encodedPayload;
      if (typeof payload2 == "undefined" || payload2 === null) {
        encodedPayload = new Uint8Array(0);
      } else {
        let contentType = properties.content_type || guessContentType(payload2);
        encodedPayload = encodePayload(payload2, contentType);
        properties.content_type = contentType;
      }
      let msg = {
        type: "publish",
        topic: pubmsg.topic,
        payload: encodedPayload,
        qos: pubmsg.qos || 0,
        retain: pubmsg.retain || 0,
        properties
      };
      self.sendMessage(msg);
    }
    function subscribe2(submsg) {
      let topics = submsg.topics;
      if (typeof topics == "string") {
        topics = [{ topic: topics }];
      }
      let msg = {
        type: "subscribe",
        packet_id: nextPacketId(),
        topics,
        properties: submsg.properties || {}
      };
      self.awaitingAck[msg.packet_id] = {
        type: "suback",
        nr: self.messageNr++,
        msg
      };
      self.sendMessage(msg);
    }
    function unsubscribe2(unsubmsg) {
      let topics = unsubmsg.topics;
      if (typeof topics == "string") {
        topics = [topics];
      }
      let msg = {
        type: "unsubscribe",
        packet_id: nextPacketId(),
        topics,
        properties: unsubmsg.properties || {}
      };
      self.awaitingAck[msg.packet_id] = {
        type: "unsuback",
        nr: self.messageNr++,
        msg
      };
      self.sendMessage(msg);
    }
    this.keepAlive = function() {
      if (isStateWaitingPingResp()) {
        closeConnections();
      } else {
        self.isWaitPingResp = true;
        self.sendMessage({ type: "pingreq" });
      }
    };
    this.receiveMessage = function(msg) {
      self.receiveQueue.push(msg);
      if (!self.receiveTimer) {
        self.receiveTimer = setTimeout(function() {
          doReceive();
        }, 1);
      }
    };
    this.sendMessage = function(msg, connecting) {
      let isSent = false;
      if (isStateConnected() || connecting && isStateNew()) {
        switch (msg.type) {
          case "subscribe":
            msg.packet_id = nextPacketId(), self.awaitingAck[msg.packet_id] = {
              type: "suback",
              nr: self.messageNr++,
              msg
            };
            break;
          case "publish":
            switch (msg.qos) {
              case 0:
                break;
              case 1:
                msg.packet_id = nextPacketId();
                self.awaitingAck[msg.packet_id] = {
                  type: "puback",
                  nr: self.messageNr++,
                  msg
                };
                break;
              case 2:
                msg.packet_id = nextPacketId();
                self.awaitingAck[msg.packet_id] = {
                  type: "pubrec",
                  nr: self.messageNr++,
                  msg
                };
                break;
            }
            break;
          default:
            break;
        }
        isSent = self.sendTransport(msg);
      }
      if (!isSent) {
        self.queueMessage(msg);
      }
      return isSent;
    };
    this.sendTransport = function(msg) {
      let isSent = false;
      for (let conn in self.connections) {
        if (!isSent) {
          isSent = self.connections[conn].sendMessage(msg);
        }
      }
      return isSent;
    };
    this.queueMessage = function(msg) {
      switch (msg.type) {
        case "pingresp":
        case "pingreq":
          break;
        default:
          self.sendQueue.push(msg);
          break;
      }
    };
    this.disconnected = function() {
      setTimeout(function() {
        if (isStateWaitingConnAck()) {
          self.clientId = "";
        }
        self.isSentConnect = false;
        self.isWaitConnack = false;
        self.keepAliveInterval = 0;
        stopKeepAliveTimer();
      });
      publishEvent("transport/disconnected");
    };
    function isStateNew() {
      return !self.isSentConnect;
    }
    function isStateWaitingConnAck() {
      return self.isSentConnect && self.isWaitConnack;
    }
    function isStateConnected() {
      return self.isSentConnect && !self.isWaitConnack;
    }
    function isStateWaitingPingResp() {
      return self.isWaitPingResp && isStateConnected();
    }
    function encodePayload(payload2, contentType) {
      switch (contentType) {
        case "binary/octet-stream":
          return payload2;
        case "text/plain":
          return payload2;
        case "text/x-integer":
        case "text/x-number":
          return payload2.toString();
        case "text/x-datetime":
          return payload2.toJSON();
        case "application/json":
          return JSON.stringify(payload2);
        default:
          return payload2;
      }
    }
    function decodePayload(payload2, contentType) {
      switch (contentType) {
        case "text/plain":
          return UTF8ToString(payload2);
        case "text/x-integer":
          return parseInt(UTF8ToString(payload2), 10);
        case "text/x-number":
          return Number(UTF8ToString(payload2));
        case "text/x-datetime":
          return new Date(UTF8ToString(payload2));
        case "application/json":
          return JSON.parse(UTF8ToString(payload2));
        case "binary/octet-stream":
          return payload2;
        default:
          if (payload2.length == 0) {
            return void 0;
          }
          return payload2;
      }
    }
    function guessContentType(payload2) {
      switch (typeof payload2) {
        case "string":
          return "text/plain";
        case "number":
          if (Number.isInteger(payload2)) {
            return "text/x-integer";
          }
          return "text/x-number";
        case "boolean":
          return "application/json";
        case "object":
          if (payload2 === null) {
            return void 0;
          }
          if (payload2 instanceof Date) {
            return "text/x-datetime";
          } else if (typeof payload2.BYTES_PER_ELEMENT == "number") {
            return "binary/octet-stream";
          }
          return "application/json";
        default:
          console2.log("Do not know how to serialize a ", typeof payload2);
          return "application/json";
      }
    }
    function doReceive() {
      for (let i = 0; i < self.receiveQueue.length; i++) {
        handleReceivedMessage(self.receiveQueue[i]);
      }
      self.receiveQueue = [];
      self.receiveTimer = false;
      self.isPacketReceived = true;
    }
    function resetKeepAliveTimer() {
      stopKeepAliveTimer();
      if (self.keepAliveInterval > 0) {
        self.keepAliveTimer = setInterval(function() {
          self.keepAlive();
        }, self.keepAliveInterval * 1e3);
      }
    }
    function stopKeepAliveTimer() {
      if (self.keepAliveTimer) {
        clearTimeout(self.keepAliveTimer);
        self.keepAliveTimer = false;
      }
      self.isWaitPingResp = false;
    }
    function cleanupSendQueue(previousRoutingId) {
      const previousBridgePrefix = "bridge/" + previousRoutingId + "/";
      const bridgePrefix = "bridge/" + self.routingId + "/";
      let q = [];
      for (let k in self.sendQueue) {
        let msg = self.sendQueue[k];
        switch (msg.type) {
          case "publish":
            if (msg.properties && msg.properties.response_topic && msg.properties.response_topic.startsWith(previousBridgePrefix)) {
              msg.properties.response_topic = msg.properties.response_topic.replace(previousBridgePrefix, bridgePrefix);
            }
            if (msg.qos > 0) {
              q.push(msg);
            }
            break;
          default:
            break;
        }
      }
      self.sendQueue = q;
    }
    function sendQueuedMessages() {
      let queue = self.sendQueue;
      self.sendQueue = [];
      for (let k = 0; k < queue.length; k++) {
        self.sendMessage(queue[k]);
      }
    }
    function resendUnacknowledged() {
      let msgs = [];
      for (let packetId in self.awaitingAck) {
        const unack = self.awaitingAck[packetId];
        let msg;
        switch (unack.type) {
          case "puback":
          case "pubrec":
            msg = unack.msg;
            msg.dup = true;
            msgs.push({ nr: unack.nr, msg });
            break;
          case "unsuback":
          case "suback":
            msg = unack.msg;
            msgs.push({ nr: unack.nr, msg });
            break;
          case "pubcomp":
            msg = {
              type: "pubrec",
              packet_id: packetId
            };
            msgs.push({ nr: unack.nr, msg });
            break;
          default:
            console2.log("Unknown type in awaitingAck", unack);
            break;
        }
      }
      msgs.sort(function(a, b) {
        return a.nr - b.nr;
      });
      for (let k in msgs) {
        self.sendMessage(msgs[k].msg);
      }
    }
    function handleReceivedMessage(msg) {
      let replyMsg;
      switch (msg.type) {
        case "connack":
          if (!isStateWaitingConnAck()) {
            console2.log("Unexpected CONNACK", msg);
          }
          self.isWaitConnack = false;
          switch (msg.reason_code) {
            case MQTT_RC_SUCCESS:
              const previousRoutingId = self.routingId;
              self.connectProps = msg.properties;
              if (msg.properties.assigned_client_identifier) {
                self.clientId = msg.properties.assigned_client_identifier;
              }
              if (msg.properties["cotonic-routing-id"]) {
                self.routingId = msg.properties["cotonic-routing-id"];
              } else {
                self.routingId = self.clientId;
              }
              cleanupSendQueue(previousRoutingId);
              if (msg.session_present) {
                resendUnacknowledged();
              } else {
                self.awaitingRel = {};
                self.awaitingAck = {};
                self.cleanStart = false;
              }
              if (typeof self.connectProps.server_keep_alive == "number") {
                self.keepAliveInterval = self.connectProps.server_keep_alive;
              } else {
                self.keepAliveInterval = MQTT_KEEP_ALIVE;
              }
              resetKeepAliveTimer();
              publishStatus(true);
              sessionToBridge({
                type: "connack",
                is_connected: true,
                client_id: self.clientId,
                connack: msg
              });
              sendQueuedMessages();
              break;
            case MQTT_RC_BAD_USERNAME_OR_PASSWORD:
              self.authUserPassword.username = void 0;
              self.authUserPassword.password = void 0;
            case MQTT_RC_CLIENT_ID_INVALID:
              self.clientId = "";
            default:
              publishStatus(false);
              sessionToBridge({
                type: "connack",
                is_connected: false,
                connack: msg
              });
          }
          break;
        case "puback":
          if (self.awaitingAck[msg.packet_id]) {
            if (self.awaitingAck[msg.packet_id].type != "puback") {
              console2.log("MQTT: Unexpected puback for ", self.awaitingAck[msg.packet_id]);
            } else {
            }
            delete self.awaitingAck[msg.packet_id];
          } else {
            console2.log("MQTT: puback for unknown packet_id", msg.packet_id);
          }
          break;
        case "pubrec":
          if (self.awaitingAck[msg.packet_id]) {
          }
          if (msg.reason_code < 128) {
            if (self.awaitingAck[msg.packet_id]) {
              if (self.awaitingAck[msg.packet_id].type != "pubrec") {
                console2.log("MQTT: Unexpected pubrec for ", self.awaitingAck[msg.packet_id]);
              }
              self.awaitingAck[msg.packet_id].type = "pubcomp";
              self.awaitingAck[msg.packet_id].msg = void 0;
              replyMsg = { type: "pubrel", packet_id: msg.packet_id };
            } else {
              replyMsg = { type: "pubrel", packet_id: msg.packet_id, reason_code: MQTT_RC_PACKET_ID_NOT_FOUND };
            }
          } else {
            if (self.awaitingAck[msg.packet_id]) {
              delete self.awaitingAck[msg.packet_id];
            }
          }
          break;
        case "pubcomp":
          if (self.awaitingAck[msg.packet_id]) {
            if (self.awaitingAck[msg.packet_id].type != "pubcomp") {
              console2.log("MQTT: Unexpected pubcomp for ", self.awaitingAck[msg.packet_id]);
            }
            delete self.awaitingAck[msg.packet_id];
          }
          break;
        case "suback":
          if (self.awaitingAck[msg.packet_id]) {
            if (self.awaitingAck[msg.packet_id].type != "suback") {
              console2.log("MQTT: Unexpected suback for ", self.awaitingAck[msg.packet_id]);
            } else {
              let ackMsg = {
                type: "suback",
                topics: self.awaitingAck[msg.packet_id].topics,
                acks: msg.acks
              };
              sessionToBridge(ackMsg);
            }
            delete self.awaitingAck[msg.packet_id];
          }
          break;
        case "unsuback":
          if (self.awaitingAck[msg.packet_id]) {
            if (self.awaitingAck[msg.packet_id].type != "unsuback") {
              console2.log("MQTT: Unexpected unsuback for ", self.awaitingAck[msg.packet_id]);
            } else {
              let ackMsg = {
                type: "unsuback",
                topics: self.awaitingAck[msg.packet_id].topics,
                acks: msg.acks
              };
              sessionToBridge(ackMsg);
            }
            delete self.awaitingAck[msg.packet_id];
          }
          break;
        case "publish":
          let isPubOk = false;
          let awaitRel;
          switch (msg.qos) {
            case 0:
              isPubOk = true;
              break;
            case 1:
              if (self.awaitingRel[msg.packet_id]) {
                replyMsg = {
                  type: "puback",
                  packet_id: msg.packet_id,
                  reason_code: MQTT_RC_PACKET_ID_IN_USE
                };
              } else {
                isPubOk = true;
                replyMsg = {
                  type: "puback",
                  packet_id: msg.packet_id
                };
              }
              break;
            case 2:
              replyMsg = {
                type: "pubrec",
                packet_id: msg.packet_id
              };
              if (self.awaitingRel[msg.packet_id]) {
                awaitRel = self.awaitingRel[msg.packet_id];
                replyMsg.reason_code = awaitRel.reason_code;
              } else {
                isPubOk = true;
              }
              self.awaitingRel[msg.packet_id] = {
                type: "pubrel",
                nr: self.messageNr++
              };
          }
          if (isPubOk) {
            let ct = msg.properties.content_type;
            msg.payload = decodePayload(msg.payload, ct);
            sessionToBridge(msg);
            if (replyMsg) {
              replyMsg.reason_code = MQTT_RC_SUCCESS;
            }
            if (awaitRel) {
              awaitRel.reason_code = MQTT_RC_SUCCESS;
            }
          }
          break;
        case "pubrel":
          if (self.awaitingRel[msg.packet_id]) {
            delete self.awaitingRel[msg.packet_id];
            replyMsg = {
              type: "pubcomp",
              packet_id: msg.packet_id
            };
          } else {
            replyMsg = {
              type: "pubcomp",
              packet_id: msg.packet_id,
              reason_code: MQTT_RC_PACKET_ID_NOT_FOUND
            };
          }
          break;
        case "pingreq":
          self.sendMessage({ type: "pingresp" });
          break;
        case "pingresp":
          self.isWaitPingResp = false;
          break;
        case "disconnect":
          closeConnections();
          break;
        case "auth":
          sessionToBridge(msg);
          break;
        default:
          break;
      }
      if (replyMsg) {
        setTimeout(function() {
          self.sendMessage(replyMsg);
        }, 0);
      }
    }
    function closeConnections() {
      for (let k in self.connection) {
        self.connection[k].closeConnection();
      }
      self.connection = {};
      self.isWaitPingResp = false;
      self.isSentConnect = false;
      self.isWaitConnack = false;
      self.keepAliveInterval = 0;
      stopKeepAliveTimer();
      publishStatus(false);
    }
    function nextPacketId() {
      do {
        self.packetId++;
        if (self.packetId > 65535) {
          self.packetId = 1;
        }
      } while (self.awaitingAck[self.packetId]);
      return self.packetId;
    }
    function localPublish(topic, msg, opts) {
      publish(topic, msg, opts);
    }
    function localSubscribe(topic, callback) {
      subscribe(topic, callback);
    }
    function publishStatus(isConnected) {
      localPublish(
        self.bridgeTopics.session_status,
        { is_connected: isConnected, client_id: self.clientId },
        { retain: true }
      );
    }
    function publishEvent(event) {
      localPublish(`${self.bridgeTopics.session_event}/${event}`, {});
    }
    function init7() {
      publishStatus(false);
      localSubscribe(self.bridgeTopics.session_out, sessionToRemote);
      localSubscribe(self.bridgeTopics.session_control, sessionControl);
    }
    init7();
  }
  init2();

  // src/cotonic.mqtt_bridge.js
  var cotonic_mqtt_bridge_exports = {};
  __export(cotonic_mqtt_bridge_exports, {
    bridges: () => bridges,
    deleteBridge: () => deleteBridge,
    disconnectBridge: () => disconnectBridge,
    findBridge: () => findBridge,
    newBridge: () => newBridge
  });
  var BRIDGE_LOCAL_TOPIC = "bridge/+name/#topic";
  var BRIDGE_STATUS_TOPIC = "$bridge/+name/status";
  var BRIDGE_AUTH_TOPIC = "$bridge/+name/auth";
  var BRIDGE_CONTROL_TOPIC = "$bridge/+name/control";
  var SESSION_IN_TOPIC = "session/+name/in";
  var SESSION_OUT_TOPIC = "session/+name/out";
  var SESSION_STATUS_TOPIC = "session/+name/status";
  var SESSION_CONTROL_TOPIC = "session/+name/control";
  var SESSION_EVENT_TOPIC = "session/+name/event";
  var bridges = {};
  var newBridge = function(remote, options) {
    remote = remote || "origin";
    options = options || {};
    if (!options.mqtt_session) {
      options.mqtt_session = cotonic_mqtt_session_exports;
    }
    let bridge = bridges[remote];
    if (!bridge) {
      bridge = new mqttBridge();
      bridges[remote] = bridge;
      bridge.connect(remote, options);
    }
    return bridge;
  };
  var disconnectBridge = function(remote) {
    const bridge = findBridge(remote);
    if (!bridge)
      return;
    return bridge.disconnect();
  };
  var findBridge = function(remote) {
    remote = remote || "origin";
    return bridges[remote];
  };
  var deleteBridge = function(remote) {
    remote = remote || "origin";
    delete bridges[remote];
  };
  function mqttBridge() {
    var remote;
    var name;
    var session;
    var clientId;
    var routingId = void 0;
    var local_topics = {};
    var sessionTopic;
    var is_connected = false;
    var is_ui_state = false;
    var session_present = false;
    var self = this;
    var wid;
    this.connect = function(remote2, options) {
      self.mqtt_session = options.mqtt_session;
      self.name = options.name || remote2.replace(/[^0-9a-zA-Z\.]/g, "-");
      self.remote = remote2;
      self.wid = "bridge/" + self.name;
      self.is_ui_state = options.is_ui_state || remote2 == "origin";
      self.local_topics = {
        // Comm between local broker and bridge
        bridge_local: fill(BRIDGE_LOCAL_TOPIC, { name: self.name, topic: "#topic" }),
        bridge_status: fill(BRIDGE_STATUS_TOPIC, { name: self.name }),
        bridge_auth: fill(BRIDGE_AUTH_TOPIC, { name: self.name }),
        bridge_control: fill(BRIDGE_CONTROL_TOPIC, { name: self.name }),
        // Comm between session and bridge
        session_in: fill(SESSION_IN_TOPIC, { name: self.name }),
        session_out: fill(SESSION_OUT_TOPIC, { name: self.name }),
        session_status: fill(SESSION_STATUS_TOPIC, { name: self.name }),
        session_control: fill(SESSION_CONTROL_TOPIC, { name: self.name }),
        session_event: fill(SESSION_EVENT_TOPIC, { name: self.name })
      };
      subscribe(self.local_topics.bridge_local, relayOut, { wid: self.wid, no_local: true });
      subscribe(self.local_topics.bridge_control, bridgeControl);
      subscribe(self.local_topics.session_in, relayIn);
      subscribe(self.local_topics.session_status, sessionStatus);
      self.session = self.mqtt_session.newSession(remote2, self.local_topics, options);
      publishStatus();
    };
    this.disconnect = function() {
      self.session.disconnect();
      self.mqtt_session.deleteSession(self.remote);
      self.session = void 0;
      self.mqtt_session = void 0;
      publishStatus();
    };
    function relayOut(msg, props) {
      switch (msg.type) {
        case "publish":
          msg.topic = dropRoutingTopic(msg.topic);
          if (msg.properties && msg.properties.response_topic) {
            msg.properties.response_topic = remoteRoutingTopic(msg.properties.response_topic);
          }
          publish(self.local_topics.session_out, msg);
          break;
        default:
          console.log("Bridge relayOut received unknown message", msg);
          break;
      }
    }
    function relayIn(msg) {
      let relay = msg.payload;
      switch (relay.type) {
        case "publish":
          let topic = relay.topic;
          let m = topic.match(/^bridge\/([^\/]+)\/(.*)/);
          if (m) {
            if (m[1] != self.clientId && m[1] != self.routingId) {
              console.log("Bridge relay for unknown routing-id", topic);
              return;
            }
            relay.topic = m[2];
          } else {
            relay.topic = localRoutingTopic(relay.topic);
          }
          if (relay.properties && relay.properties.response_topic) {
            relay.properties.response_topic = localRoutingTopic(relay.properties.response_topic);
          }
          publish_mqtt_message(relay, { wid: self.wid });
          break;
        case "connack":
          sessionConnack(relay);
          break;
        case "disconnect":
          self.is_connected = false;
          publishStatus();
          break;
        case "auth":
          publish(self.local_topics.bridge_auth, relay, { wid: self.wid });
          break;
        case "suback":
          for (let k = 0; k < relay.acks; k++) {
          }
          break;
        case "puback":
        case "pubrec":
          for (let k = 0; k < relay.acks; k++) {
          }
          break;
        default:
          console.log("Bridge relayIn received unknown message", msg);
          break;
      }
    }
    function bridgeControl(msg) {
      let payload2 = msg.payload;
      switch (payload2.type) {
        case "subscribe":
          for (let k = 0; k < payload2.topics.length; k++) {
            payload2.topics[k].topic = dropRoutingTopic(payload2.topics[k].topic);
          }
          publish(self.local_topics.session_out, payload2);
          break;
        case "unsubscribe":
          break;
        case "auth":
          publish(self.local_topics.session_out, payload2);
          break;
        default:
          console.log("Bridge bridgeControl received unknown message", msg);
          break;
      }
    }
    function sessionConnack(msg) {
      self.is_connected = msg.is_connected;
      if (msg.is_connected) {
        self.clientId = msg.client_id;
        let props = msg.connack.properties;
        if (props && props["cotonic-routing-id"]) {
          self.routingId = props["cotonic-routing-id"];
        } else {
          self.routingId = msg.client_id;
        }
        if (!msg.connack.session_present) {
          let topics = [
            { topic: "bridge/" + self.clientId + "/#", qos: 2, no_local: true }
          ];
          if (self.clientId != self.routingId) {
            topics.push({ topic: "bridge/" + self.routingId + "/#", qos: 2, no_local: true });
          }
          let subscribe2 = {
            type: "subscribe",
            topics
          };
          publish(self.local_topics.session_out, subscribe2);
          resubscribeTopics();
          self.session_present = !!msg.connack.session_present;
        } else {
          self.session_present = true;
        }
      }
      publishStatus();
    }
    function resubscribeTopics() {
      let subs = find_subscriptions_below("bridge/" + self.name);
      let topics = {};
      for (let i = 0; i < subs.length; i++) {
        if (subs[i].wid == self.wid) {
          continue;
        }
        let sub = Object.assign({}, subs[i].sub);
        sub.topic = remove_named_wildcards(sub.topic);
        if (!topics[sub.topic]) {
          topics[sub.topic] = sub;
        } else {
          mergeSubscription(topics[sub.topic], sub);
        }
      }
      let ts = [];
      for (let t in topics) {
        ts.push(topics[t]);
      }
      if (ts.length > 0) {
        bridgeControl({ type: "publish", payload: { type: "subscribe", topics: ts } });
      }
    }
    function mergeSubscription(subA, subB) {
      let qosA = subA.qos || 0;
      let qosB = subB.qos || 0;
      subA.qos = Math.max(qosA, qosB);
      let rhA = subA.retain_handling || 0;
      let rhB = subB.retain_handling || 0;
      subA.retain_handling = Math.min(rhA, rhB);
      subA.retain_as_published = subA.retain_as_published || subB.retain_as_published || false;
      subA.no_local = subA.no_local && subB.no_local;
    }
    function sessionStatus(msg) {
      self.is_connected = msg.is_connected;
    }
    function remoteRoutingTopic(topic) {
      return "bridge/" + self.routingId + "/" + topic;
    }
    function remoteClientTopic(topic) {
      return "bridge/" + self.clientId + "/" + topic;
    }
    function localRoutingTopic(topic) {
      return "bridge/" + self.name + "/" + topic;
    }
    function dropRoutingTopic(topic) {
      return topic.replace(/^bridge\/[^\/]+\//, "");
    }
    function publishStatus() {
      publish(
        self.local_topics.bridge_status,
        {
          is_connected: self.is_connected,
          session_present: self.session_present,
          client_id: self.clientId
        },
        { retain: true }
      );
      publish(
        "model/sessionStorage/post/mqtt$clientBridgeTopic",
        remoteClientTopic("")
      );
      if (self.is_ui_state) {
        let ui = {
          classes: [],
          status: {
            "remote": self.remote,
            "name": self.name
          }
        };
        if (self.is_connected) {
          ui.classes.push("connected");
        } else {
          ui.classes.push("disconnected");
        }
        publish("model/bridge/event/ui-status", ui);
      }
    }
  }

  // src/cotonic.event.js
  function triggerCotonicReady() {
    ready.then(() => {
      window.dispatchEvent(new Event("cotonic-ready"));
    });
    readyResolve();
  }

  // src/cotonic.model.autofocus.js
  function isInputElementActive() {
    if (!document.activeElement) {
      return false;
    }
    switch (document.activeElement.tagName) {
      case "INPUT":
      case "TEXTAREA":
      case "SELECT":
        return true;
      default:
        return false;
    }
  }
  subscribe(
    "model/ui/event/dom-updated/+key",
    (msg, bindings) => {
      if (!isInputElementActive()) {
        let selector = "#" + bindings.key + " [autofocus]";
        let element = document.querySelector(selector);
        if (element && window.getComputedStyle(element).display !== "none") {
          element.focus();
          publish(fill("model/autofocus/event/focus/+key", bindings));
        }
      }
    },
    { wid: "model.autofocus" }
  );

  // src/cotonic.model.document.js
  subscribe(
    "model/document/get/+key",
    (msg, bindings) => {
      let value2 = {};
      switch (bindings.key) {
        case "all":
          value2 = {
            screen_width: window.screen.width,
            screen_height: window.screen.height,
            inner_width: window.innerWidth,
            inner_height: window.innerHeight,
            is_touch: is_touch_device(),
            timezone: timezone_info(),
            language: language_info()
          };
          break;
        case "intl":
          value2 = {
            timezone: timezone_info(),
            language: language_info()
          };
          break;
        default:
          value2 = null;
          break;
      }
      if (msg.properties.response_topic) {
        publish(msg.properties.response_topic, value2);
      }
    },
    { wid: "model.document" }
  );
  subscribe(
    "model/document/get/cookie/+key",
    (msg, bindings) => {
      if (msg.properties.response_topic) {
        publish(msg.properties.response_topic, getCookie(bindings.key));
      }
    },
    { wid: "model.document" }
  );
  subscribe(
    "model/document/post/cookie/+key",
    (msg, bindings) => {
      setCookie(bindings.key, msg.payload.value, msg.payload.exdays);
      if (msg.properties.response_topic) {
        publish(msg.properties.response_topic, getCookie(bindings.key));
      }
    },
    { wid: "model.document" }
  );
  function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(";");
    for (var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == " ") {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
  }
  function setCookie(cname, cvalue, exdays) {
    var d = /* @__PURE__ */ new Date();
    d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1e3);
    var expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue + "; " + expires + "; path=/; Secure; SameSite=None";
  }
  function timezone_info() {
    return {
      cookie: getCookie("z.tz"),
      user_agent: timezone()
    };
  }
  function language_info() {
    return {
      cookie: getCookie("z.lang"),
      user_agent: navigator.language,
      document: document.body.parentElement.getAttribute("lang")
    };
  }
  function timezone() {
    if (typeof Intl === "object" && typeof Intl.DateTimeFormat === "function") {
      let options = Intl.DateTimeFormat().resolvedOptions();
      if (typeof options === "object" && options.timeZone) {
        return options.timeZone;
      }
    }
    if (typeof window.jstz === "object") {
      return window.jstz.determine().name();
    }
    if (typeof window.moment === "object" && typeof window.moment.tz === "function") {
      return window.moment.tz();
    }
    return null;
  }
  function is_touch_device() {
    var prefixes = " -webkit- -moz- -o- -ms- ".split(" ");
    var mq = function(query2) {
      return window.matchMedia(query2).matches;
    };
    if ("ontouchstart" in window || window.DocumentTouch && document instanceof DocumentTouch) {
      return true;
    }
    var query = ["(", prefixes.join("touch-enabled),("), "heartz", ")"].join("");
    return mq(query);
  }

  // src/cotonic.model.lifecycle.js
  var model = {
    state: void 0,
    online: void 0
  };
  var actions = {};
  var state2 = {};
  var validTransitions = {
    active: {
      passive: [],
      hidden: ["passive"],
      frozen: ["passive", "hidden"],
      terminated: ["passive", "hidden"]
    },
    passive: {
      active: [],
      hidden: [],
      frozen: ["hidden"],
      terminated: ["hidden"]
    },
    hidden: {
      active: ["passive"],
      passive: [],
      frozen: [],
      terminated: []
    },
    frozen: {
      active: ["hidden", "passive"],
      passive: ["hidden"],
      hidden: [],
      terminated: ["hidden"]
    },
    terminated: {}
  };
  model.present = function(proposal) {
    if (proposal.is_init) {
      listenToLifecycleEvents();
      model.state = proposal.newState;
      model.online = proposal.online;
      publish("model/lifecycle/event/ping", "pong", { retain: true });
      publish("model/lifecycle/event/state", model.state, { retain: true });
      publish("model/lifecycle/event/online", model.online, { retain: true });
    } else {
      if (proposal.type === "onlineState") {
        if (model.online !== proposal.online) {
          model.online = proposal.online;
          publish("model/lifecycle/event/online", model.online, { retain: true });
        }
      } else if (proposal.type === "blur") {
        if (model.state === "active") {
          doPossibleStateChange(model, proposal.newState);
        }
      } else if (proposal.type === "visibilitychange") {
        if (model.state !== "frozen" && model.state !== "terminated") {
          doPossibleStateChange(model, proposal.newState);
        }
      } else {
        doPossibleStateChange(model, proposal.newState);
      }
    }
    state2.render(model);
  };
  state2.nextAction = function(model2) {
  };
  state2.representation = function(model2) {
  };
  state2.render = function(model2) {
    state2.representation(model2);
    state2.nextAction(model2);
  };
  actions.focus = function() {
    model.present({ type: "focus", newState: "active" });
  };
  actions.freeze = function() {
    model.present({ type: "freeze", newState: "frozen" });
  };
  actions.terminatedOrFrozen = function(evt) {
    model.present({ type: evt.type, newState: evt.persisted ? "frozen" : "terminated" });
  };
  actions.handleEvent = function(evt) {
    model.present({ type: evt.type, newState: getCurrentState() });
  };
  actions.handleOnlineStatus = function(evt) {
    model.present({ type: "onlineState", online: navigator.onLine });
  };
  function listenToLifecycleEvents() {
    const opts = { capture: true, passive: true };
    window.addEventListener("focus", actions.focus, opts);
    window.addEventListener("freeze", actions.freeze, opts);
    window.addEventListener("blur", actions.handleEvent, opts);
    window.addEventListener("visibilitychange", actions.handleEvent, opts);
    window.addEventListener("resume", actions.handleEvent, opts);
    window.addEventListener("pageshow", actions.handleEvent, opts);
    const terminationEvent = "onpagehide" in globalThis ? "pagehide" : "unload";
    window.addEventListener(terminationEvent, actions.terminatedOrFrozen, opts);
    window.addEventListener("online", actions.handleOnlineStatus, opts);
    window.addEventListener("offline", actions.handleOnlineStatus, opts);
  }
  function getCurrentState() {
    if (document.visibilityState === "hidden") {
      return "hidden";
    }
    if (document.hasFocus()) {
      return "active";
    }
    return "passive";
  }
  function doPossibleStateChange(model2, newState) {
    const transitions = validTransitions[model2.state];
    if (transitions === void 0)
      return;
    const transitionPath = transitions[newState];
    if (transitionPath === void 0)
      return;
    for (let i = 0; i < transitionPath.length; i++) {
      publish("model/lifecycle/event/state", transitionPath[i], { retain: true });
    }
    publish("model/lifecycle/event/state", newState, { retain: true });
    model2.state = newState;
  }
  model.present({ is_init: true, newState: getCurrentState(), online: navigator.onLine });

  // src/cotonic.model.localStorage.js
  subscribe(
    "model/localStorage/get/+key",
    (msg, bindings) => {
      if (msg.properties.response_topic) {
        let value2 = window.localStorage.getItem(bindings.key);
        if (typeof value2 == "string") {
          try {
            value2 = JSON.parse(value2);
          } catch (e) {
          }
        }
        publish(msg.properties.response_topic, value2);
      }
    },
    { wid: "model.localStorage" }
  );
  subscribe(
    "model/localStorage/post/+key",
    (msg, bindings) => {
      window.localStorage.setItem(bindings.key, JSON.stringify(msg.payload));
      if (msg.properties.response_topic) {
        publish(msg.properties.response_topic, msg.payload);
      }
      publish("model/localStorage/event/" + bindings.key, msg.payload);
    },
    { wid: "model.localStorage" }
  );
  subscribe(
    "model/localStorage/delete/+key",
    (msg, bindings) => {
      window.localStorage.removeItem(bindings.key);
      if (msg.properties.response_topic) {
        publish(msg.properties.response_topic, null);
      }
      publish("model/localStorage/event/" + bindings.key, null);
    },
    { wid: "model.localStorage" }
  );
  window.addEventListener(
    "storage",
    (evt) => {
      if (evt.type == "storage" && evt.storageArea === window.localStorage) {
        let value2 = evt.newValue;
        if (typeof value2 == "string") {
          try {
            value2 = JSON.parse(value2);
          } catch (e) {
          }
        }
        publish("model/localStorage/event/" + evt.key, value2);
      }
    },
    false
  );
  publish("model/localStorage/event/ping", "pong", { retain: true });

  // src/cotonic.model.sessionStorage.js
  subscribe(
    "model/sessionStorage/get/+key",
    function(msg, bindings) {
      if (msg.properties.response_topic) {
        let value2 = window.sessionStorage.getItem(bindings.key);
        if (typeof value2 == "string") {
          try {
            value2 = JSON.parse(value2);
          } catch (e) {
          }
        }
        publish(msg.properties.response_topic, value2);
      }
    },
    { wid: "model.sessionStorage" }
  );
  subscribe(
    "model/sessionStorage/post/+key",
    function(msg, bindings) {
      window.sessionStorage.setItem(bindings.key, JSON.stringify(msg.payload));
      if (msg.properties.response_topic) {
        publish(msg.properties.response_topic, msg.payload);
      }
      publish("model/sessionStorage/event/" + bindings.key, msg.payload);
    },
    { wid: "model.sessionStorage" }
  );
  subscribe(
    "model/sessionStorage/delete/+key",
    function(msg, bindings) {
      window.sessionStorage.removeItem(bindings.key);
      if (msg.properties.response_topic) {
        publish(msg.properties.response_topic, null);
      }
      publish("model/sessionStorage/event/" + bindings.key, null);
    },
    { wid: "model.sessionStorage" }
  );
  subscribe(
    "model/sessionStorage/get/+key/+subkey",
    function(msg, bindings) {
      if (msg.properties.response_topic) {
        let value2 = window.sessionStorage.getItem(bindings.key);
        if (typeof value2 == "string") {
          try {
            value2 = JSON.parse(value2);
          } catch (e) {
            value2 = {};
          }
        }
        value2 = value2 || {};
        publish(msg.properties.response_topic, value2[bindings.subkey]);
      }
    },
    { wid: "model.sessionStorage" }
  );
  subscribe(
    "model/sessionStorage/post/+key/+subkey",
    function(msg, bindings) {
      let value2 = window.sessionStorage.getItem(bindings.key);
      if (typeof value2 == "string") {
        try {
          value2 = JSON.parse(value2);
        } catch (e) {
          value2 = {};
        }
      }
      value2 = value2 || {};
      value2[bindings.subkey] = msg.payload;
      window.sessionStorage.setItem(bindings.key, JSON.stringify(value2));
      if (msg.properties.response_topic) {
        publish(msg.properties.response_topic, value2);
      }
    },
    { wid: "model.sessionStorage" }
  );
  subscribe(
    "model/sessionStorage/delete/+key/+subkey",
    function(msg, bindings) {
      let value2 = window.sessionStorage.getItem(bindings.key);
      if (typeof value2 == "string") {
        try {
          value2 = JSON.parse(value2);
        } catch (e) {
          value2 = {};
        }
      }
      value2 = value2 || {};
      delete value2[bindings.subkey];
      window.sessionStorage.setItem(bindings.key, JSON.stringify(value2));
      if (msg.properties.response_topic) {
        publish(msg.properties.response_topic, value2);
      }
    },
    { wid: "model.sessionStorage" }
  );
  window.addEventListener(
    "storage",
    function(evt) {
      if (evt.type == "storage" && evt.storageArea === window.sessionStorage) {
        let value2 = evt.newValue;
        if (typeof value2 == "string") {
          try {
            value2 = JSON.parse(value2);
          } catch (e) {
          }
        }
        publish("model/sessionStorage/event/" + evt.key, value2);
      }
    },
    false
  );
  publish("model/sessionStorage/event/ping", "pong", { retain: true });

  // src/cotonic.model.location.js
  var location = {};
  var isNavigating = false;
  function init3() {
    publish("model/location/event/ping", "pong", { retain: true });
    publishLocation(true);
    window.addEventListener("hashchange", publishLocation, false);
  }
  function publishLocation() {
    const oldhash = location.hash;
    const oldpathname = location.pathname;
    const oldsearch = location.search;
    const oldpathname_search = location.pathname_search;
    const pathname_search = config.pathname_search || document.body && document.body.getAttribute("data-cotonic-pathname-search") || "";
    location.protocol = window.location.protocol;
    location.port = window.location.port;
    location.host = window.location.host;
    location.hostname = window.location.hostname;
    location.href = window.location.href;
    location.pathname = window.location.pathname;
    location.origin = window.location.origin;
    location.hash = window.location.hash;
    location.search = window.location.search;
    location.pathname_search = pathname_search;
    if (oldsearch !== location.search || oldpathname_search !== location.pathname_search) {
      let q = parseQs(window.location.search);
      const pathq = parseQs("?" + pathname_search);
      for (let k in pathq) {
        q[k] = pathq[k];
      }
      location.q = q;
    }
    publish(
      "model/location/event",
      location,
      { retain: true }
    );
    if (oldpathname !== location.pathname) {
      publish(
        "model/location/event/pathname",
        location.pathname,
        { retain: true }
      );
    }
    if (oldsearch !== location.search || oldpathname_search !== location.pathname_search) {
      publish(
        "model/location/event/q",
        location.q,
        { retain: true }
      );
    }
    if (oldhash !== location.hash) {
      publish(
        "model/location/event/hash",
        location.hash === "" ? "#" : location.hash,
        { retain: true }
      );
    }
  }
  function parseQs(qs) {
    let q = {};
    let ps = [];
    const searchParams = new URLSearchParams(qs);
    searchParams.forEach(function(value2, key) {
      ps.push([key, value2]);
    });
    for (let i = 0; i < ps.length; i++) {
      const name = ps[i][0];
      const indexed = name.match(/^(.*)\[([^\[]*)\]$/);
      if (indexed) {
        const iname = indexed[1] + "[]";
        if (typeof q[iname] === "undefined") {
          q[iname] = [];
        }
        if (indexed[2].length > 0) {
          q[iname][indexed[2]] = ps[i][1];
        } else {
          q[iname].push(ps[i][1]);
        }
      } else {
        q[name] = ps[i][1];
      }
    }
    return q;
  }
  subscribe(
    "model/auth/event/auth-changing",
    function(msg) {
      if (!isNavigating) {
        let onauth = msg.payload.onauth || document.body.parentNode.getAttribute("data-onauth");
        if (onauth === null || onauth !== "#") {
          setTimeout(function() {
            if (onauth === null || onauth === "#reload") {
              window.location.reload(true);
            } else if (onauth.charAt(0) == "/") {
              window.location.href = onauth;
            } else if (onauth.charAt(0) == "#") {
              window.location.hash = onauth;
            }
          }, 0);
        }
      }
    },
    { wid: "model.location" }
  );
  subscribe("model/location/get/+what", function(msg, bindings) {
    var resp = location[bindings.what];
    maybeRespond(resp, msg);
  }, { wid: "model.location" });
  subscribe("model/location/post/redirect", function(msg) {
    if (msg.payload.url) {
      window.location = msg.payload.url;
      willNavigate();
    }
  }, { wid: "model.location" });
  subscribe("model/location/post/redirect-local", function(msg) {
    if (msg.payload.url) {
      let url = new URL(msg.payload.url, window.location);
      window.location = url.pathname + url.search + url.hash;
      willNavigate();
    }
  }, { wid: "model.location" });
  subscribe("model/location/post/reload", function(msg) {
    window.location.reload(true);
    willNavigate();
  }, { wid: "model.location" });
  subscribe("model/location/post/redirect/back", function() {
    if ("referrer" in document) {
      window.location = document.referrer;
    } else {
      window.history.back();
    }
  }, { wid: "model.location" });
  function maybeRespond(result, msg) {
    if (msg.properties.response_topic) {
      publish(msg.properties.response_topic, result);
    }
  }
  function willNavigate() {
    isNavigating = true;
    setTimeout(function() {
      isNavigating = false;
    }, 1e3);
  }
  init3();

  // src/cotonic.model.serviceWorker.js
  var console3 = globalThis.console;
  load_config_defaults(
    {
      start_service_worker: true,
      service_worker_src: "/cotonic-service-worker.js"
    }
  );
  if (config.start_service_worker && navigator.serviceWorker) {
    navigator.serviceWorker.register(config.service_worker_src).catch(
      function(error) {
        switch (error.name) {
          case "SecurityError":
            console3.log("Could not start serviceWorker due to a SecurityError.");
            console3.log("See https://cotonic.org/#model.serviceWorker for more information.");
            break;
          default:
            console3.log("Could not start serviceWorker: ", error.message);
            break;
        }
      }
    );
    navigator.serviceWorker.addEventListener("message", function(event) {
      switch (event.data.type) {
        case "broadcast":
          let message = event.data.message;
          message.topic = "model/serviceWorker/event/broadcast/" + event.data.channel;
          publish_mqtt_message(message);
          break;
        default:
          console3.log("Unknown event from service worker", event);
          break;
      }
    });
  }
  subscribe(
    "model/serviceWorker/post/broadcast/+channel",
    function(msg, bindings) {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        let data = {
          type: "broadcast",
          message: msg,
          channel: bindings.channel
        };
        navigator.serviceWorker.controller.postMessage(data);
      } else {
        msg.topic = "model/serviceWorker/event/broadcast/" + bindings.channel;
        publish_mqtt_message(msg);
      }
    },
    { wid: "model.serviceWorker" }
  );
  publish("model/serviceWorker/event/ping", "pong", { retain: true });

  // src/cotonic.model.sessionId.js
  function s4() {
    return Math.floor((1 + Math.random()) * 65536).toString(16).substring(1);
  }
  function setcookie(value2) {
    publish(
      "model/document/post/cookie/cotonic-sid",
      { value: value2, exdays: 14 }
    );
  }
  function generate() {
    let value2 = s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();
    window.localStorage.setItem("cotonic-sid", JSON.stringify(value2));
    publish(
      "model/document/post/cookie/cotonic-sid",
      { value: value2, exdays: 4 }
    );
    publish("model/sessionId/event", value2);
    return value2;
  }
  subscribe(
    "model/sessionId/get",
    function(msg, bindings) {
      if (msg.properties.response_topic) {
        let value2 = window.localStorage.getItem("cotonic-sid");
        if (typeof value2 == "string") {
          try {
            value2 = JSON.parse(value2);
          } catch (e) {
            value2 = generate();
          }
        } else {
          value2 = generate();
        }
        publish(msg.properties.response_topic, value2);
      }
    },
    { wid: "model.sessionId" }
  );
  subscribe(
    "model/sessionId/post/reset",
    function(msg, bindings) {
      let value2 = generate();
      if (msg.properties.response_topic) {
        cotonic.broker.publish(msg.properties.response_topic, value2);
      }
    },
    { wid: "model.sessionId" }
  );
  subscribe(
    "model/sessionId/delete",
    function(msg, bindings) {
      window.localStorage.removeItem("cotonic-sid");
      if (msg.properties.response_topic) {
        publish(msg.properties.response_topic, null);
      }
      publish(
        "model/document/post/cookie/cotonic-sid",
        { value: "", exdays: 0 }
      );
      publish("model/sessionId/event", null);
    },
    { wid: "model.sessionId" }
  );
  subscribe(
    "model/localStorage/event/cotonic-sid",
    (value2) => {
      publish("model/sessionId/event", value2);
    },
    { wid: "model.sessionId" }
  );
  function init4() {
    let value2 = window.localStorage.getItem("cotonic-sid");
    if (typeof value2 == "string") {
      try {
        value2 = JSON.parse(value2);
        if (typeof value2 == "string" && value2 !== "") {
          setcookie(value2);
        } else {
          generate();
        }
      } catch (e) {
        value2 = generate();
      }
    } else {
      value2 = generate();
    }
  }
  init4();
  publish("model/sessionId/event/ping", "pong", { retain: true });

  // src/cotonic.model.ui.js
  var is_activity_event = false;
  var render_serial = 1;
  var render_cache = {};
  function maybeRespond2(result, properties) {
    if (properties.response_topic) {
      publish(properties.response_topic, result);
    }
  }
  function hashCode(s) {
    let hash = 0, i = 0, len = s.length;
    while (i < len) {
      hash = (hash << 5) - hash + s.charCodeAt(i++) << 0;
    }
    return hash;
  }
  function init5() {
    document.addEventListener("visibilitychange", activity_event, { passive: true });
    document.addEventListener("scroll", activity_event, { passive: true });
    document.addEventListener("keydown", activity_event, { passive: true });
    document.addEventListener("mousemove", activity_event, { passive: true });
    document.addEventListener("click", activity_event, { passive: true });
    document.addEventListener("focus", activity_event, { passive: true });
    setInterval(activity_publish, 1e4);
    initTopicEvents(document);
    IncrementalDOM.notifications.nodesCreated = function(nodes) {
      for (const n in nodes) {
        if (!n.id)
          continue;
        publish("model/ui/event/node-created/" + n.id, { id: n.id });
      }
    };
    IncrementalDOM.notifications.nodesDeleted = function(nodes) {
      for (const n in nodes) {
        if (!n.id)
          continue;
        publish("model/ui/event/node-deleted/" + n.id, { id: n.id });
      }
    };
    if (globalThis.cotonic && globalThis.cotonic.bufferedEvents) {
      for (const e in globalThis.cotonic.bufferedEvents) {
        topic_event(globalThis.cotonic.bufferedEvents[e], true);
      }
      globalThis.cotonic.bufferedEvents = [];
    }
  }
  function initTopicEvents(elt) {
    elt.addEventListener("submit", topic_event);
    elt.addEventListener("click", topic_event);
  }
  function activity_event() {
    is_activity_event = true;
  }
  function activity_publish() {
    publish("model/ui/event/recent-activity", { is_active: is_activity_event });
    is_activity_event = false;
  }
  function topic_event(event, isBuffered) {
    const topicName = `on${event.type}Topic`;
    let topicTarget = void 0;
    let elt = event.target;
    while (elt) {
      if (topicName in elt.dataset) {
        topicTarget = elt;
        break;
      }
      elt = elt.parentElement;
    }
    if (!topicTarget)
      return;
    const topic = topicTarget.dataset[topicName];
    let msg;
    let cancel = true;
    if (isBuffered) {
      cancel = false;
    } else {
      let cancel2 = getFromDataset(event.target, topicTarget, `on${event.type}Cancel`);
      switch (cancel2) {
        case "0":
        case "no":
        case "false":
          cancel2 = false;
          break;
        case "preventDefault":
          cancel2 = "preventDefault";
          break;
        default:
          cancel2 = true;
          break;
      }
    }
    msg = getFromDataset(event.target, topicTarget, `on${event.type}Message`);
    if (msg) {
      msg = JSON.parse(msg);
    } else {
      msg = getAttributes(event.target, topicTarget);
    }
    let options = {
      cancel
    };
    const responseTopic = getFromDataset(event.target, topicTarget, `on${event.type}ResponseTopic`);
    if (responseTopic) {
      options.response_topic = responseTopic;
    }
    on(topic, msg, event, options);
    if (event.type === "submit" && "onsubmitReset" in topicTarget.dataset) {
      topicTarget.reset();
    }
  }
  function getFromDataset(startElt, endElt, name) {
    let elt = startElt;
    do {
      if (name in elt.dataset) {
        return elt.dataset[name];
      }
      if (elt === endElt)
        break;
      elt = elt.parentElement;
    } while (elt);
  }
  function getAttributes(startElt, endElt) {
    let elt = startElt;
    let attrs = {};
    do {
      let attributes = elt.attributes;
      for (let i = attributes.length - 1; i >= 0; i--) {
        let name = attributes[i].name;
        if (!attrs[name]) {
          attrs[name] = attributes[i].value;
        }
      }
      if (elt === endElt)
        break;
      elt = elt.parentElement;
    } while (elt);
    return attrs;
  }
  subscribe(
    "model/ui/render",
    function(msg) {
      maybeRespond2(render2(), msg.properties);
    },
    { wid: "model.ui" }
  );
  subscribe(
    "model/ui/render/+key",
    function(msg, bindings) {
      maybeRespond2(render2(bindings.key), msg.properties);
    },
    { wid: "model.ui" }
  );
  subscribe(
    "model/ui/get/+key",
    function(msg, bindings) {
      if (msg.properties.response_topic) {
        publish(msg.properties.response_topic, get(bindings.key));
      }
    },
    { wid: "model.ui" }
  );
  subscribe(
    "model/ui/insert/+key",
    function(msg, bindings) {
      const p = msg.payload || {};
      if (typeof p === "object" && p.status === "ok" && typeof p.result === "string") {
        maybeRespond2(insert(bindings.key, true, p.result, void 0), msg.properties);
      } else {
        maybeRespond2(insert(bindings.key, p.inner, p.initialData, p.priority), msg.properties);
      }
    },
    { wid: "model.ui" }
  );
  subscribe(
    "model/ui/update/+key",
    function(msg, bindings) {
      const p = msg.payload || "";
      let html;
      if (typeof p === "object" && p.status === "ok" && typeof p.result === "string") {
        html = p.result;
      } else {
        html = p;
      }
      maybeRespond2(update(bindings.key, html), msg.properties);
    },
    { wid: "model.ui" }
  );
  subscribe(
    "model/ui/render-template/+key",
    function(msg, bindings) {
      const topic = msg.payload.topic;
      const data = msg.payload.data || {};
      const key = bindings.key;
      const dedup = msg.payload.dedup || false;
      const newHash = hashCode(JSON.stringify([topic, data]));
      if (!dedup || !render_cache[key] || render_cache[key].hash != newHash) {
        const serial = render_serial++;
        render_cache[key] = {
          serial,
          dedup,
          hash: newHash,
          topic,
          data
        };
        call(topic, data, { qos: dedup ? 1 : 0 }).then(function(rendermsg) {
          if (serial === render_cache[key].serial) {
            const p = rendermsg.payload || "";
            let html;
            if (typeof p === "object" && p.status === "ok" && typeof p.result === "string") {
              html = p.result;
            } else {
              html = p;
            }
            maybeRespond2(cotonic.ui.update(key, html), msg.properties);
          } else {
            maybeRespond2({ is_changed: false }, msg.properties);
          }
        });
      } else {
        maybeRespond2({ is_changed: false }, msg.properties);
      }
    },
    { wid: "model.ui" }
  );
  subscribe(
    "model/ui/delete/+key",
    function(msg, bindings) {
      maybeRespond2(remove2(bindings.key), msg.properties);
    }
  );
  subscribe(
    "model/+model/event/ui-status",
    function(msg, bindings) {
      if ("status" in msg.payload) {
        updateStateData(bindings.model, msg.payload.status);
      }
      if ("classes" in msg.payload) {
        updateStateClass(bindings.model, msg.payload.classes);
      }
    },
    { wid: "model.ui" }
  );
  subscribe(
    "model/ui/event/new-shadow-root/+",
    function(msg) {
      initTopicEvents(msg.payload.shadow_root);
    },
    { wid: "model.ui" }
  );
  init5();

  // src/cotonic.model.window.js
  function init6() {
    publish("model/window/event/ping", "pong", { retain: true });
    publish("model/location/event/ui-status", {
      status: {
        is_opener: !!window.opener
      }
    }, { retain: true });
  }
  subscribe(
    "model/window/post/close",
    function(msg) {
      let result;
      if (window.opener) {
        window.close();
        result = true;
      } else if (msg.payload && msg.payload.url) {
        publish("model/location/post/redirect", { url: msg.payload.url });
        result = true;
      } else if (msg.payload && msg.payload.message && msg.payload.message.href) {
        publish("model/location/post/redirect", { url: msg.payload.message.href });
        result = true;
      } else {
        result = false;
      }
      if (msg.properties.response_topic) {
        publish(msg.properties.response_topic, result);
      }
    },
    { wid: "model.window" }
  );
  subscribe(
    "model/window/post/open",
    function(msg) {
      let options = {
        full: 0,
        // set the height/width to the current window, show scrollbars etc.
        centerBrowser: 1,
        // center window over browser window? {1 (YES) or 0 (NO)}. overrides top and left
        centerScreen: 0,
        // center window over entire screen? {1 (YES) or 0 (NO)}. overrides top and left
        height: 500,
        // sets the height in pixels of the window.
        left: 0,
        // left position when the window appears.
        location: 0,
        // determines whether the address bar is displayed {1 (YES) or 0 (NO)}.
        menubar: 0,
        // determines whether the menu bar is displayed {1 (YES) or 0 (NO)}.
        resizable: 0,
        // whether the window can be resized {1 (YES) or 0 (NO)}. Can also be overloaded using resizable.
        scrollbars: 0,
        // determines whether scrollbars appear on the window {1 (YES) or 0 (NO)}.
        status: 0,
        // whether a status line appears at the bottom of the window {1 (YES) or 0 (NO)}.
        width: 500,
        // sets the width in pixels of the window.
        name: null,
        // name of window
        top: 0,
        // top position when the window appears.
        toolbar: 0
        // determines whether a toolbar (includes the forward and back buttons) is displayed {1 (YES) or 0 (NO)}.
      };
      if (typeof msg.payload.message == "object") {
        let attrs = msg.payload.message;
        if (attrs.href) {
          options.url = msg.payload.message.href;
          if (msg.payload.message["data-window"]) {
            if (typeof msg.payload.message["data-window"] == "string") {
              attrs = JSON.parse(msg.payload.message["data-window"]);
            }
          } else {
            attrs = {};
          }
        }
        let keys = Object.keys(attrs);
        for (let k in keys) {
          options[k] = attrs[k];
        }
        let features = "height=" + options.height + ",width=" + options.width + ",toolbar=" + (options.toolbar ? "yes" : "no") + ",scrollbars=" + (options.scrollbars ? "yes" : "no") + ",status=" + (options.status ? "yes" : "no") + ",resizable=" + (options.resizable ? "yes" : "no") + ",location=" + (options.location ? "yes" : "no") + ",menubar=" + (options.menubar ? "yes" : "no");
        let top, left;
        if (options.centerBrowser && !options.centerScreen) {
          top = window.screenY + (window.outerHeight / 2 - options.height / 2);
          left = window.screenX + (window.outerWidth / 2 - options.width / 2);
        } else if (options.centerScreen) {
          top = (screen.height - options.height) / 2;
          left = (screen.width - options.width) / 2;
        } else {
          top = options.top;
          left = options.left;
        }
        if (options.name) {
          options.name = options.name.replace(/[^a-zA-Z0-9]/g, "_");
        }
        let w = window.open(options.url, options.name, features + ",left=" + Math.ceil(left) + ",top=" + Math.ceil(top));
        w.focus();
      }
    },
    { wid: "model.window" }
  );
  init6();

  // src/index-bundle.js
  var cotonic2 = globalThis.cotonic || {};
  if (!globalThis.cotonic) {
    globalThis.cotonic = cotonic2;
  }
  cotonic2.VERSION = VERSION;
  cotonic2.ready = ready;
  cotonic2.spawn = spawn;
  cotonic2.spawn_named = spawn_named;
  cotonic2.whereis = whereis;
  cotonic2.idom = cotonic_idom_exports;
  cotonic2.tokenizer = cotonic_tokenizer_exports;
  cotonic2.ui = cotonic_ui_exports;
  cotonic2.mqtt = cotonic_mqtt_exports;
  cotonic2.broker = cotonic_broker_exports;
  cotonic2.mqtt_packet = cotonic_mqtt_packet_exports;
  cotonic2.mqtt_transport = { ws: cotonic_mqtt_transport_ws_exports };
  cotonic2.mqtt_session = cotonic_mqtt_session_exports;
  cotonic2.mqtt_bridge = cotonic_mqtt_bridge_exports;
  cotonic2.keyserver = cotonic_keyserver_exports;
  triggerCotonicReady();
})();
/**
 * @preserve
 * Copyright 2015 The Incremental DOM Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
/**
 * @preserve
 * Copyright 2016-2023 The Cotonic Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
