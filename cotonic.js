(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

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
    const patternSegments = pattern.split(SEPARATOR);
    const topicSegments = topic.split(SEPARATOR);
    const patternLength = patternSegments.length;
    const topicLength = topicSegments.length;
    const lastIndex = patternLength - 1;
    for (let i2 = 0; i2 < patternLength; i2++) {
      const currentPattern = patternSegments[i2];
      const patternChar = currentPattern[0];
      const currentTopic = topicSegments[i2];
      if (!currentTopic && !currentPattern)
        continue;
      if (!currentTopic && currentPattern !== ALL)
        return false;
      if (patternChar === ALL)
        return i2 === lastIndex;
      if (patternChar !== SINGLE && currentPattern !== currentTopic)
        return false;
    }
    return patternLength === topicLength;
  }
  function fill(pattern, params) {
    const patternSegments = pattern.split(SEPARATOR);
    const patternLength = patternSegments.length;
    const result = [];
    for (let i2 = 0; i2 < patternLength; i2++) {
      const currentPattern = patternSegments[i2];
      const patternChar = currentPattern[0];
      const patternParam = currentPattern.slice(1);
      const paramValue = params[patternParam];
      if (patternChar === ALL) {
        if (paramValue !== void 0)
          result.push([].concat(paramValue).join(SEPARATOR));
        break;
      } else if (patternChar === SINGLE)
        result.push("" + paramValue);
      else result.push(currentPattern);
    }
    return result.join(SEPARATOR);
  }
  function extract(pattern, topic) {
    const params = {};
    const patternSegments = pattern.split(SEPARATOR);
    const topicSegments = topic.split(SEPARATOR);
    const patternLength = patternSegments.length;
    for (let i2 = 0; i2 < patternLength; i2++) {
      const currentPattern = patternSegments[i2];
      const patternChar = currentPattern[0];
      if (currentPattern.length === 1)
        continue;
      if (patternChar === ALL) {
        params[currentPattern.slice(1)] = topicSegments.slice(i2);
        break;
      } else if (patternChar === SINGLE) {
        params[currentPattern.slice(1)] = topicSegments[i2];
      }
    }
    return params;
  }
  function remove_named_wildcards(pattern) {
    const patternSegments = pattern.split(SEPARATOR);
    const patternLength = patternSegments.length;
    const mqttPattern = [];
    for (let i2 = 0; i2 < patternLength; i2++) {
      const currentPattern = patternSegments[i2];
      const patternChar = currentPattern[0];
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
    function addKey(token, attributes2) {
      for (let i2 = 0; i2 < attributes2.length; i2 = i2 + 2) {
        if (attributes2[i2] === "key") {
          token.key = attributes2[i2 + 1];
          break;
        }
      }
    }
    this.elementOpen = function(tag, attributes2) {
      const t = { type: "open", tag, attributes: attributes2 };
      addKey(t, attributes2);
      acc.push(t);
    };
    this.elementVoid = function(tag, attributes2) {
      const t = { type: "void", tag, attributes: attributes2 };
      addKey(t, attributes2);
      acc.push(t);
    };
    this.elementClose = function(tag) {
      acc.push({ type: "close", tag });
    };
    this.processingInstruction = function(tag, attributes2) {
      acc.push({ type: "pi", tag, attributes: attributes2 });
    };
    this.doctype = function(attributes2) {
      acc.push({ type: "doctype", attributes: attributes2 });
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
    const decoder2 = new Decoder(tokenBuilder);
    tokens3(data, tokenBuilder, decoder2);
    return tokenBuilder.result;
  };
  function tokens3(data, builder, decoder2) {
    while (true) {
      if (data.length <= decoder2.offset) {
        return;
      }
      const rv = tokenize(data, builder, decoder2);
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
    let tag, attributes2, text_data, has_slash;
    const c0 = data.charAt(d.offset);
    if (c0 === void 0)
      return DONE;
    const c1 = data.charAt(d.offset + 1);
    const c2 = data.charAt(d.offset + 2);
    const c3 = data.charAt(d.offset + 3);
    if (c0 === "<" && c1 === "!" && c2 === "-" && c3 === "-")
      return tokenize_comment(data, d.adv_col(4));
    const c4 = data.charAt(d.offset + 4);
    const c5 = data.charAt(d.offset + 5);
    const c6 = data.charAt(d.offset + 6);
    const c7 = data.charAt(d.offset + 7);
    const c8 = data.charAt(d.offset + 8);
    if (c0 === "<" && c1 === "!" && c2 === "D" && c3 === "O" && c4 === "C" && c5 === "T" && c6 === "Y" && c7 === "P" && c8 === "E")
      return tokenize_doctype(data, d.adv_col(10));
    if (c0 === "<" && c1 === "!" && c2 === "d" && c3 === "o" && c4 === "c" && c5 === "t" && c6 === "y" && c7 === "p" && c8 === "e")
      return tokenize_doctype(data, d.adv_col(10));
    if (c0 === "<" && c1 === "!" && c2 === "[" && c3 === "C" && c4 === "D" && c5 === "A" && c6 === "T" && c7 === "A" && c8 === "[")
      return tokenize_cdata(data, d.adv_col(9));
    if (c0 === "<" && c1 === "?") {
      tag = tokenize_literal(data, d.adv_col(2), "tag");
      attributes2 = tokenize_attributes(data, d);
      find_qgt(data, d);
      d.builder.processingInstruction(tag.value, attributes2.value);
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
      attributes2 = tokenize_attributes(data, d);
      has_slash = find_gt(data, d);
      if (has_slash.value || is_singleton(tag.value)) {
        builder.elementVoid(tag.value, attributes2.value);
      } else {
        builder.elementOpen(tag.value, attributes2.value);
      }
      if (tag.value === "textarea") return TEXTAREA;
      if (tag.value === "script") return SCRIPT;
      return NORMAL;
    }
    text_data = tokenize_data(data, d);
    builder.text(text_data.value);
    return NORMAL;
  }
  function tokenize_textarea(data, d) {
    const offsetStart = d.offset;
    let lt, slash, n;
    while (true) {
      lt = data.codePointAt(d.offset);
      if (lt === void 0) {
        if (offsetStart !== d.offset) d.builder.text(data.slice(offsetStart, d.offset));
        return;
      }
      lookahead: {
        if (lt !== LT) break lookahead;
        slash = data.codePointAt(d.offset + 1);
        if (slash !== SLASH) break lookahead;
        n = data[d.offset + 2];
        if (!(n === "t" || n === "T")) break lookahead;
        n = data[d.offset + 3];
        if (!(n === "e" || n === "E")) break lookahead;
        n = data[d.offset + 4];
        if (!(n === "x" || n === "X")) break lookahead;
        n = data[d.offset + 5];
        if (!(n === "t" || n === "T")) break lookahead;
        n = data[d.offset + 6];
        if (!(n === "a" || n === "A")) break lookahead;
        n = data[d.offset + 7];
        if (!(n === "r" || n === "R")) break lookahead;
        n = data[d.offset + 8];
        if (!(n === "e" || n === "E")) break lookahead;
        n = data[d.offset + 9];
        if (!(n === "a" || n === "A")) break lookahead;
        n = data.codePointAt(d.offset + 10);
        if (is_probable_close(n)) {
          if (offsetStart !== d.offset) d.builder.text(data.slice(offsetStart, d.offset));
          return;
        }
      }
      d.inc_char(lt);
    }
  }
  function tokenize_script(data, d) {
    const offsetStart = d.offset;
    let lt, slash, n;
    while (true) {
      lt = data.codePointAt(d.offset);
      if (lt === void 0) {
        if (offsetStart !== d.offset) d.builder.text(data.slice(offsetStart, d.offset));
        return;
      }
      lookahead: {
        if (lt !== LT) break lookahead;
        slash = data.codePointAt(d.offset + 1);
        if (slash !== SLASH) break lookahead;
        n = data[d.offset + 2];
        if (!(n === "s" || n === "S")) break lookahead;
        n = data[d.offset + 3];
        if (!(n === "c" || n === "C")) break lookahead;
        n = data[d.offset + 4];
        if (!(n === "r" || n === "R")) break lookahead;
        n = data[d.offset + 5];
        if (!(n === "i" || n === "I")) break lookahead;
        n = data[d.offset + 6];
        if (!(n === "p" || n === "P")) break lookahead;
        n = data[d.offset + 7];
        if (!(n === "t" || n === "T")) break lookahead;
        n = data.codePointAt(d.offset + 8);
        if (is_probable_close(n)) {
          if (offsetStart !== d.offset) d.builder.text(data.slice(offsetStart, d.offset));
          return;
        }
      }
      d.inc_char(lt);
    }
  }
  function tokenize_doctype(data, d) {
    const acc = [];
    let c, word;
    while (true) {
      c = data.codePointAt(d.offset);
      if (c === void 0 || c === GT) {
        if (c === GT) d.inc_col();
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
    const offsetStart = d.offset;
    while (true) {
      const c1 = data.codePointAt(d.offset);
      const c2 = data.codePointAt(d.offset + 1);
      const c3 = data.codePointAt(d.offset + 2);
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
    const c = data.codePointAt(d.offset);
    if (c === QUOTE || c === SQUOTE)
      return tokenize_word(data, c, d.inc_col());
    if (!is_whitespace(c)) {
      return tokenize_literal(data, d, "tag");
    }
    throw "inconsistent";
  }
  function tokenize_word(data, quote, d) {
    const acc = [];
    let i2 = 0;
    while (true) {
      const c = data.codePointAt(d.offset);
      if (c === void 0) {
        return value(acc.join(""), d);
      }
      if (c === quote) {
        d.inc_col();
        return value(acc.join(""), d);
      }
      if (c === AMPERSAND) {
        const charref2 = tokenize_charref(data, d.inc_col());
        acc[i2++] = charref2.value;
      }
      acc[i2++] = data[d.offset];
      d.inc_char(c);
    }
  }
  function tokenize_data(data, d) {
    const offsetStart = d.offset;
    while (true) {
      const c = data.codePointAt(d.offset);
      if (c === void 0 || c === LT || c === AMPERSAND) {
        return value(data.slice(offsetStart, d.offset), d);
      }
      d.inc_char(c);
    }
  }
  function tokenize_literal(data, d, type) {
    let literal = [], i2 = 0, c = data.codePointAt(d.offset);
    if (c === GT || c === SLASH || c === EQUALS) {
      return value(data.charAt(d.offset), d.inc_col());
    }
    while (true) {
      c = data.codePointAt(d.offset);
      if (c === AMPERSAND) {
        charref = tokenize_charref(data, d.inc_col());
        literal[i2++] = charref.value;
        continue;
      }
      if (c !== void 0) {
        if (!(is_whitespace(c) || c === GT || c === SLASH || c === EQUALS)) {
          literal[i2++] = data[d.offset];
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
    const attributes2 = [];
    while (true) {
      const c = data.codePointAt(d.offset);
      if (c === void 0)
        return value(attributes2, d);
      if (c === GT || c === SLASH)
        return value(attributes2, d);
      if (c === QUESTION_MARK && data.codePointAt(d.offset + 1) === GT) {
        return value(attributes2, d);
      }
      if (is_whitespace(c)) {
        d.inc_char(c);
        continue;
      }
      const attribute = tokenize_literal(data, d, "attributes");
      const attribute_value = tokenize_attr_value(attribute.value, data, d);
      attributes2.push(tokenize_attribute_name(attribute.value));
      attributes2.push(attribute_value.value);
    }
  }
  function find_gt(data, d) {
    let has_slash = false, c;
    while (true) {
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
    const offsetStart = d.offset;
    while (true) {
      const c1 = data.codePointAt(d.offset);
      if (c1 === void 0) {
        value(data.slice(offsetStart, d.offset), d);
      }
      const c2 = data.codePointAt(d.offset + 1);
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
  function tokenize_attr_value(key3, data, d) {
    skip_whitespace(data, d);
    const c = data.codePointAt(d.offset);
    if (c === EQUALS) {
      return tokenize_quoted_or_unquoted_attr_value(data, d.inc_col());
    }
    return value(key3, d);
  }
  function tokenize_quoted_or_unquoted_attr_value(data, d) {
    const c = data.codePointAt(d.offset);
    if (c === void 0)
      return value("", d);
    if (c === QUOTE || c === SQUOTE) {
      return tokenize_quoted_attr_value(data, c, d.inc_col());
    }
    return tokenize_unquoted_attr_value(data, d);
  }
  function tokenize_quoted_attr_value(data, start_quote, d) {
    const v2 = [];
    let i2 = 0;
    while (true) {
      const c = data.codePointAt(d.offset);
      if (c === void 0) {
        return value(v2.join(""), d);
      }
      if (c === AMPERSAND) {
        const charref2 = tokenize_charref(data, d.inc_col());
        v2[i2++] = charref2.value;
        continue;
      }
      if (c === start_quote) {
        return value(v2.join(""), d.inc_col());
      }
      v2[i2++] = data[d.offset];
      d.inc_char(c);
    }
  }
  function tokenize_unquoted_attr_value(data, d) {
    const v2 = [];
    let i2 = 0;
    while (true) {
      const c = data.codePointAt(d.offset);
      if (c === void 0) {
        return value(v2.join(""), d);
      }
      if (c === AMPERSAND) {
        const charref2 = tokenize_charref(data, d.inc_col());
        v2[i2++] = charref2.value;
        continue;
      }
      if (c === SLASH) {
        return value(v2.join(""), d);
      }
      if (is_probable_close(c)) {
        return value(v2.join(""), d);
      }
      v2[i2++] = data[d.offset];
      d.inc_col();
    }
  }
  function tokenize_tag(tag) {
    const ltag = tag.toLowerCase();
    if (is_html_tag(ltag))
      return ltag;
    return tag;
  }
  function tokenize_attribute_name(name) {
    const lname = name.toLowerCase();
    if (is_html_attr(lname))
      return lname;
    return name;
  }
  function tokenize_charref(data, d) {
    const column = d.column, line = d.line, offset = d.offset;
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
    const offsetStart = d.offset;
    let u;
    while (true) {
      const c = data.codePointAt(d.offset);
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
    while (true) {
      const c = data.codePointAt(d.offset);
      if (is_whitespace(c)) {
        d.inc_char(c);
      }
      break;
    }
  }
  function is_whitespace(c) {
    return c === SPACE || c === NEWLINE || c === TAB || c === RETURN;
  }
  function is_start_literal_safe(c) {
    return c >= CHAR_A && c <= CHAR_Z || c >= CHAR_a && c <= CHAR_z || c === UNDERSCORE;
  }
  function is_html_tag(tag) {
    return !!Object.getOwnPropertyDescriptor(html_tags, tag);
  }
  function is_html_attr(name) {
    return !!Object.getOwnPropertyDescriptor(html_attrs, name);
  }
  function is_singleton(tag) {
    const v2 = html_tags[tag];
    if (v2 === void 0)
      return false;
    return v2;
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
    const element = document.createElement("div");
    const cache = {};
    return function(raw) {
      let d = cache[raw];
      if (d !== void 0) return d;
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
  function exportKey(key3) {
    return crypto.subtle.exportKey("raw", key3);
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
  function encryptConnectMessage(id, key3, nonce, pubServerEncKey) {
    return exportKey(key3).then(function(encodedKey) {
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
  function encryptRequest(id, nonce, request, key3, iv) {
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
      key3,
      msg
    );
  }
  function decryptResponse(id, nonce, response, key3, iv) {
    const encId = textEncoder.encode(id);
    return crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: encId,
        tagLength: AES_GCM_TAG_SIZE * 8
      },
      key3,
      response
    ).then(function(plain) {
      return decodeResponse(plain);
    });
  }
  function decodeResponse(data) {
    const d = new Uint8Array(data);
    if (d[0] != V1) throw new Error("Unexpected message");
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
  function encryptSecurePublish(message, keyId, key3) {
    const iv = randomIV();
    const alg = {
      name: "AES-GCM",
      iv,
      additionalData: keyId,
      tagLength: AES_GCM_TAG_SIZE * 8
    };
    return crypto.subtle.encrypt(alg, key3, message).then(function(cipherText) {
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
    if (data[0] != V1) throw new Error("Unknown message");
    if (data[1] != SECURE_PUBLISH) throw new Error("Wrong message type");
    let iv = data.slice(2, IV_BYTES + 2);
    let message = data.slice(IV_BYTES + 2);
    return { type: SECURE_PUBLISH, iv, message };
  }
  function decryptSecurePublish(message, keyId, key3) {
    const d = decodeSecurePublish(message);
    const alg = {
      name: "AES-GCM",
      iv: d.iv,
      additionalData: keyId,
      tagLength: AES_GCM_TAG_SIZE * 8
    };
    return crypto.subtle.decrypt(alg, key3, d.message);
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
    for (let i2 = 0; i2 < nrBytes; i2++) {
      r += buf[i2] * Math.pow(2, lshift);
      lshift -= 8;
    }
    return r;
  }

  // src/cotonic.js
  var VERSION = "1.8.2";
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
    for (let key3 in options) {
      if (!config.hasOwnProperty(key3)) {
        config[key3] = options[key3];
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
      for (let i2 in keys) {
        let k = keys[i2];
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
    for (let i2 = 0; i2 < length; i2++) {
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

  // src-idom/idom.global.js
  var keyAttributeName = "key";
  function getKeyAttributeName() {
    return keyAttributeName;
  }
  function setKeyAttributeName(name) {
    keyAttributeName = name;
  }

  // src-idom/idom.assertions.js
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

  // src-idom/idom.util.js
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

  // src-idom/idom.symbols.js
  var symbols = {
    default: "__default"
  };

  // src-idom/idom.attributes.js
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

  // src-idom/idom.notifications.js
  var notifications = {
    nodesCreated: null,
    nodesDeleted: null
  };

  // src-idom/idom.context.js
  var Context = class {
    constructor(node) {
      this.created = [];
      this.deleted = [];
      this.node = node;
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

  // src-idom/idom.dom_util.js
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
      cur = n.parentNode || (root2 ? n.host : null);
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

  // src-idom/idom.node_data.js
  var NodeData = class {
    constructor(nameOrCtor, key3, text2) {
      this._attrsArr = null;
      this.staticsApplied = false;
      this.nameOrCtor = nameOrCtor;
      this.key = key3;
      this.text = text2;
      this.alwaysDiffAttributes = false;
    }
    hasEmptyAttrsArr() {
      const attrs = this._attrsArr;
      return !attrs || !attrs.length;
    }
    getAttrsArr(length) {
      return this._attrsArr || (this._attrsArr = createArray(length));
    }
  };
  function initData(node, nameOrCtor, key3, text2) {
    const data = new NodeData(nameOrCtor, key3, text2);
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
    for (let i2 = 0, j = 0; i2 < length; i2 += 1, j += 2) {
      const attr2 = attributes2[i2];
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
    const key3 = isElement(node) ? keyAttr || fallbackKey : null;
    const data = initData(node, nodeName, key3);
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

  // src-idom/idom.nodes.js
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
  function createElement(doc2, parent, nameOrCtor, key3) {
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
    initData(el, nameOrCtor, key3);
    return el;
  }
  function createText(doc2) {
    const node = doc2.createTextNode("");
    initData(node, "#text", null);
    return node;
  }

  // src-idom/idom.core.js
  function defaultMatchFn(matchNode, nameOrCtor, expectedNameOrCtor, key3, expectedKey) {
    return nameOrCtor == expectedNameOrCtor && key3 == expectedKey;
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
  function matches2(matchNode, nameOrCtor, key3) {
    const data = getData(matchNode, key3);
    return matchFn(matchNode, nameOrCtor, data.nameOrCtor, key3, data.key);
  }
  function getMatchingNode(matchNode, nameOrCtor, key3) {
    if (!matchNode) {
      return null;
    }
    let cur = matchNode;
    do {
      if (matches2(cur, nameOrCtor, key3)) {
        return cur;
      }
    } while (key3 && (cur = cur.nextSibling));
    return null;
  }
  function alwaysDiffAttributes(el) {
    getData(el).alwaysDiffAttributes = true;
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
  function createNode(nameOrCtor, key3, nonce) {
    let node;
    if (nameOrCtor === "#text") {
      node = createText(doc);
    } else {
      node = createElement(doc, currentParent, nameOrCtor, key3);
      if (nonce) {
        node.setAttribute("nonce", nonce);
      }
    }
    context.markCreated(node);
    return node;
  }
  function alignWithDOM(nameOrCtor, key3, nonce) {
    nextNode();
    const existingNode = getMatchingNode(currentNode, nameOrCtor, key3);
    const node = existingNode || createNode(nameOrCtor, key3, nonce);
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
  function open(nameOrCtor, key3, nonce) {
    alignWithDOM(nameOrCtor, key3, nonce);
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
  function tryGetCurrentElement() {
    return currentParent;
  }
  function currentPointer() {
    {
      assertInPatch("currentPointer");
      assertNotInAttributes("currentPointer");
    }
    return getNextNode();
  }
  function currentContext() {
    return context;
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
      context = new Context(node);
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
  var patchInner = createPatchInner();
  var patchOuter = createPatchOuter();

  // src-idom/idom.changes.js
  var buffer = [];
  var bufferStart = 0;
  function queueChange(fn, a, b, c) {
    buffer.push(fn);
    buffer.push(a);
    buffer.push(b);
    buffer.push(c);
  }
  function flush() {
    const start = bufferStart;
    const end = buffer.length;
    bufferStart = end;
    for (let i2 = start; i2 < end; i2 += 4) {
      const fn = buffer[i2];
      fn(buffer[i2 + 1], buffer[i2 + 2], buffer[i2 + 3]);
    }
    bufferStart = start;
    truncateArray(buffer, start);
  }

  // src-idom/idom.diff.js
  var prevValuesMap = createMap();
  function calculateDiff(prev, next, updateCtx, updateFn, alwaysDiffAttributes2) {
    const isNew = !prev.length || alwaysDiffAttributes2;
    let i2 = 0;
    for (; i2 < next.length; i2 += 2) {
      const name = next[i2];
      if (isNew) {
        prev[i2] = name;
      } else if (prev[i2] !== name) {
        break;
      }
      const value2 = next[i2 + 1];
      if (isNew || prev[i2 + 1] !== value2) {
        prev[i2 + 1] = value2;
        queueChange(updateFn, updateCtx, name, value2);
      }
    }
    if (i2 < next.length || i2 < prev.length) {
      const startIndex = i2;
      for (i2 = startIndex; i2 < prev.length; i2 += 2) {
        prevValuesMap[prev[i2]] = prev[i2 + 1];
      }
      for (i2 = startIndex; i2 < next.length; i2 += 2) {
        const name = next[i2];
        const value2 = next[i2 + 1];
        if (prevValuesMap[name] !== value2) {
          queueChange(updateFn, updateCtx, name, value2);
        }
        prev[i2] = name;
        prev[i2 + 1] = value2;
        delete prevValuesMap[name];
      }
      truncateArray(prev, next.length);
      for (const name in prevValuesMap) {
        queueChange(updateFn, updateCtx, name, void 0);
        delete prevValuesMap[name];
      }
    }
    flush();
  }

  // src-idom/idom.virtual_elements.js
  var ATTRIBUTES_OFFSET = 3;
  var prevAttrsMap = createMap();
  function diffAttrs(element, data) {
    const attrsBuilder2 = getAttrsBuilder();
    const prevAttrsArr = data.getAttrsArr(attrsBuilder2.length);
    calculateDiff(
      prevAttrsArr,
      attrsBuilder2,
      element,
      updateAttribute,
      data.alwaysDiffAttributes
    );
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
      for (let i2 = 0; i2 < statics.length; i2 += 2) {
        updateAttribute(node, statics[i2], statics[i2 + 1]);
      }
      return;
    }
    for (let i2 = 0; i2 < statics.length; i2 += 2) {
      prevAttrsMap[statics[i2]] = i2 + 1;
    }
    const attrsArr = data.getAttrsArr(0);
    let j = 0;
    for (let i2 = 0; i2 < attrsArr.length; i2 += 2) {
      const name = attrsArr[i2];
      const value2 = attrsArr[i2 + 1];
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
  function elementOpenStart(nameOrCtor, key3, statics) {
    const argsBuilder2 = getArgsBuilder();
    {
      assertNotInAttributes("elementOpenStart");
      setInAttributes(true);
    }
    argsBuilder2[0] = nameOrCtor;
    argsBuilder2[1] = key3;
    argsBuilder2[2] = statics;
  }
  function key(key3) {
    const argsBuilder2 = getArgsBuilder();
    {
      assertInAttributes("key");
      assert(argsBuilder2);
    }
    argsBuilder2[1] = key3;
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
    const node = open(argsBuilder2[0], argsBuilder2[1], getNonce());
    const data = getData(node);
    diffStatics(node, data, argsBuilder2[2]);
    diffAttrs(node, data);
    truncateArray(argsBuilder2, 0);
    return node;
  }
  function getNonce() {
    const argsBuilder2 = getArgsBuilder();
    const statics = argsBuilder2[2];
    if (statics) {
      for (let i2 = 0; i2 < statics.length; i2 += 2) {
        if (statics[i2] === "nonce") {
          return statics[i2 + 1];
        }
      }
    }
    return "";
  }
  function elementOpen(nameOrCtor, key3, statics, ...varArgs) {
    {
      assertNotInAttributes("elementOpen");
      assertNotInSkip("elementOpen");
    }
    elementOpenStart(nameOrCtor, key3, statics);
    for (let i2 = ATTRIBUTES_OFFSET; i2 < arguments.length; i2 += 2) {
      attr(arguments[i2], arguments[i2 + 1]);
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
  function elementVoid(nameOrCtor, key3, statics, ...varArgs) {
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
      for (let i2 = 1; i2 < arguments.length; i2 += 1) {
        const fn = arguments[i2];
        formatted = fn(formatted);
      }
      if (node.data !== formatted) {
        node.data = formatted;
      }
    }
    return node;
  }

  // src-idom/index-bundle.js
  var IncrementalDOM2 = globalThis.IncrementalDOM || {};
  if (!globalThis.IncrementalDOM) {
    globalThis.IncrementalDOM = IncrementalDOM2;
  }
  IncrementalDOM2.applyAttr = applyAttr;
  IncrementalDOM2.applyProp = applyProp;
  IncrementalDOM2.attributes = attributes;
  IncrementalDOM2.alignWithDOM = alignWithDOM;
  IncrementalDOM2.alwaysDiffAttributes = alwaysDiffAttributes;
  IncrementalDOM2.close = close;
  IncrementalDOM2.createPatchInner = createPatchInner;
  IncrementalDOM2.createPatchOuter = createPatchOuter;
  IncrementalDOM2.currentElement = currentElement;
  IncrementalDOM2.currentContext = currentContext;
  IncrementalDOM2.currentPointer = currentPointer;
  IncrementalDOM2.open = open;
  IncrementalDOM2.patch = patchInner;
  IncrementalDOM2.patchInner = patchInner;
  IncrementalDOM2.patchOuter = patchOuter;
  IncrementalDOM2.skip = skip;
  IncrementalDOM2.skipNode = nextNode;
  IncrementalDOM2.tryGetCurrentElement = tryGetCurrentElement;
  IncrementalDOM2.setKeyAttributeName = setKeyAttributeName;
  IncrementalDOM2.clearCache = clearCache;
  IncrementalDOM2.getKey = getKey;
  IncrementalDOM2.importNode = importNode;
  IncrementalDOM2.isDataInitialized = isDataInitialized;
  IncrementalDOM2.notifications = notifications;
  IncrementalDOM2.symbols = symbols;
  IncrementalDOM2.applyAttrs = applyAttrs;
  IncrementalDOM2.applyStatics = applyStatics;
  IncrementalDOM2.attr = attr;
  IncrementalDOM2.elementClose = elementClose;
  IncrementalDOM2.elementOpen = elementOpen;
  IncrementalDOM2.elementOpenEnd = elementOpenEnd;
  IncrementalDOM2.elementOpenStart = elementOpenStart;
  IncrementalDOM2.elementVoid = elementVoid;
  IncrementalDOM2.key = key;
  IncrementalDOM2.text = text$1;

  // src/cotonic.idom.js
  var cotonic_idom_exports = {};
  __export(cotonic_idom_exports, {
    patchInner: () => patchInner2,
    patchOuter: () => patchOuter2
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
    for (let i2 = 0; i2 < tokens2.length; i2++) {
      renderToken(tokens2[i2]);
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
    const currentPointer2 = idom.currentPointer();
    let id;
    for (let i2 = 0; i2 < token.attributes.length; i2 = i2 + 2) {
      if (token.attributes[i2] === "id") {
        id = token.attributes[i2 + 1];
        break;
      }
    }
    if (!id) {
      throw "No id attribute found in cotonic-idom-skip node";
    }
    if (!currentPointer2 || currentPointer2.id !== id) {
      let tag = "div", attributes2 = [];
      for (let i2 = 0; i2 < token.attributes.length; i2 = i2 + 2) {
        if (token.attributes[i2] === "tag") {
          tag = token.attributes[i2 + 1];
        } else {
          attributes2.push(token.attributes[i2]);
          attributes2.push(token.attributes[i2 + 1]);
        }
      }
      return idom.elementVoid.apply(null, [tag, token.hasOwnProperty("key") ? token.key : null, null].concat(attributes2));
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
  var patchInner2 = patch.bind(void 0, idom.patch);
  var patchOuter2 = patch.bind(void 0, idom.patchOuter);

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
  function flush2() {
    clients = {};
    root = new_node(null);
  }
  function add(topic, thing) {
    const path = topic.split("/");
    let i2 = 0;
    let current = root;
    for (i2 = 0; i2 < path.length; i2++) {
      let children = current[CHILDREN];
      if (children === null) {
        children = current[CHILDREN] = {};
      }
      if (!children.hasOwnProperty(path[i2])) {
        children[path[i2]] = new_node(null);
      }
      current = children[path[i2]];
    }
    let v2 = current[VALUE];
    if (v2 === null) {
      v2 = current[VALUE] = [];
    }
    let index = indexOfSubscription(v2, thing);
    if (index > -1) {
      v2.splice(index, 1);
    }
    v2.push(thing);
    return v2;
  }
  function match(topic) {
    const path = topic.split("/");
    const matches3 = [];
    collect_matches(path, root, matches3);
    return matches3;
  }
  function collect_matches(path, trie, matches3) {
    if (trie === void 0) return;
    if (path.length === 0) {
      if (trie[VALUE] !== null) {
        matches3.push.apply(matches3, trie[VALUE]);
        return;
      }
    }
    const children = trie[CHILDREN];
    if (children === null) return;
    const sub_path = path.slice(1);
    switch (path[0]) {
      case "+":
        throw Error("match on single level wildcard not possible");
      case "#":
        throw Error("match on wildcard not possible");
      default:
        collect_matches(sub_path, children[path[0]], matches3);
        collect_matches(sub_path, children["+"], matches3);
        collect_matches([], children["#"], matches3);
    }
  }
  function remove(topic, thing) {
    const path = topic.split("/");
    let current = root;
    let i2 = 0;
    let visited = [current];
    for (i2 = 0; i2 < path.length; i2++) {
      let children = current[CHILDREN];
      if (children === null) {
        return;
      }
      if (!children.hasOwnProperty(path[i2])) {
        return;
      }
      current = children[path[i2]];
      visited.unshift(current);
    }
    let v2 = current[VALUE];
    let index = indexOfSubscription(v2, thing);
    if (index > -1) {
      v2.splice(index, 1);
      if (v2.length === 0) {
        current[VALUE] = null;
        path.reverse();
        for (i2 = 0; i2 < visited.length - 1; i2++) {
          let v3 = visited[i2];
          if (v3[CHILDREN] === null && v3[VALUE] === null) {
            let v1 = visited[i2 + 1];
            delete v1[CHILDREN][path[i2]];
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
  function indexOfSubscription(v2, thing) {
    let index = v2.indexOf(thing);
    if (index === -1 && thing.wid !== null) {
      for (index = v2.length - 1; index >= 0; index--) {
        const sub = v2[index];
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
    if (trie === void 0) return;
    if (path.length === 0 && trie[VALUE] !== null) {
      subs.push.apply(subs, trie[VALUE]);
    }
    let children = trie[CHILDREN];
    if (children === null) return;
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
    if (!data.type) return;
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
      if (window.console) window.console.error("Wrong client_id in connect from " + wid, data);
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
    for (let i2 = 0; i2 < retained.length; i2++) {
      const r = retained[i2];
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
    if (options.wid === void 0) options.wid = null;
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
      for (let i2 = 0; i2 < bridge_topics[b].length; i2++) {
        let merged = mergeSubscriptions(bridge_topics[b][i2].subs);
        merged.topic = bridge_topics[b][i2].topic;
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
    for (let i2 = 1; i2 < subs.length; i2++) {
      let s = subs[i2].sub;
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
    for (let i2 = 0; i2 < msg.topics.length; i2++) {
      remove(msg.topics[i2], sub);
      acks.push(0);
      const mqtt_topic = remove_named_wildcards(msg.topics[i2]);
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
      for (let i2 = 0; i2 < subscriptionsCount; i2++) {
        publish_subscriber(subscriptions[i2], msg, wid);
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
      if (window.console) window.console.error("Unknown subscription type", sub);
    }
  }
  function retain_key(topic) {
    return `${retained_prefix}${topic}`;
  }
  function retain(message) {
    const key3 = retain_key(message.topic);
    if (message.payload !== void 0 && message.payload !== null && message.payload !== "") {
      sessionStorage.setItem(key3, JSON.stringify({
        message
      }));
    } else {
      sessionStorage.removeItem(key3);
    }
  }
  function get_matching_retained(topic) {
    let matching = [];
    for (let i2 = 0; i2 < sessionStorage.length; i2++) {
      let key3 = sessionStorage.key(i2);
      if (key3.substring(0, retained_prefix.length) !== retained_prefix) {
        continue;
      }
      const retained_topic = key3.substring(retained_prefix.length);
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
    const key3 = retain_key(topic);
    const item = sessionStorage.getItem(key3);
    if (item === null) {
      return null;
    }
    const Obj = JSON.parse(item);
    if (!Obj.message) {
      sessionStorage.removeItem(key3);
      return null;
    }
    return Obj;
  }
  function delete_all_retained() {
    for (let i2 = 0; i2 < sessionStorage.length; i2++) {
      const key3 = sessionStorage.key(i2);
      if (key3.substring(0, retained_prefix.length) !== retained_prefix) {
        continue;
      }
      sessionStorage.removeItem(key3);
    }
  }
  function call(topic, payload2, options) {
    options = options || {};
    payload2 = payload2 || null;
    if (options.qos === void 0) options.qos = 1;
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
      flush2();
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
    replace: () => replace,
    serializeFormToList: () => serializeFormToList,
    serializeFormToObject: () => serializeFormToObject,
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
      mode: mode != null ? mode : "inner",
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
    for (let i2 = 0; i2 < order.length; i2++) {
      if (order.id != id) {
        continue;
      }
      delete order[i2];
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
  function replace(id, htmlOrTokens) {
    let currentState = state[id];
    const priority = void 0;
    if (currentState) {
      currentState.data = htmlOrTokens;
    } else {
      state[id] = {
        id,
        data: htmlOrTokens,
        dirty: true,
        mode: "outer",
        onetime: true
      };
      insertSorted(
        order,
        { id, priority },
        function(a, b) {
          return a.priority < b.priority;
        }
      );
    }
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
    let is_patch_replace = false;
    if (s === void 0 || s.data === void 0 || s.dirty === false) {
      return;
    }
    if (s.onetime && s.mode == "outer" && typeof s.data == "string") {
      s.data = '<cotonic-tmp-outer id="-tmp-patch-outer-">' + s.data + "</cotonic-tmp-outer>";
      is_patch_replace = true;
    }
    switch (s.mode) {
      case "inner":
        patchInner2(elt, s.data);
        break;
      case "outer":
        patchOuter2(elt, s.data);
        break;
      case "shadow":
      case "shadow-open":
      case "shadow-closed":
        if (!s.shadowRoot) {
          s.shadowRoot = initializeShadowRoot(elt, s.mode);
          publish("model/ui/event/new-shadow-root/" + id, { id, shadow_root: s.shadowRoot });
        }
        patchInner2(s.shadowRoot, s.data);
    }
    s.dirty = false;
    if (is_patch_replace) {
      elt = document.getElementById("-tmp-patch-outer-");
      elt.replaceWith(...elt.children);
    }
    if (s.onetime) {
      remove2(id);
    }
    return true;
  }
  function render2() {
    const updated_ids = [];
    for (let i2 = 0; i2 < order.length; i2++) {
      if (renderId(order[i2].id)) {
        updated_ids.push(order[i2].id);
      }
    }
    setTimeout(
      function() {
        for (let i2 = 0; i2 < updated_ids.length; i2++) {
          publish("model/ui/event/dom-updated/" + updated_ids[i2], { id: updated_ids[i2] });
        }
      },
      0
    );
  }
  function on(topic, msg, event, topicTarget, options) {
    options = options || {};
    let payload2 = {
      message: msg,
      event: event ? cloneableEvent(event) : void 0,
      value: topicTarget ? topicTargetValue(topicTarget) : void 0,
      data: topicTarget ? topicTargetDataAttributes(topicTarget) : void 0
    };
    if (topicTarget) {
      const valueList = topicTargetValueList(topicTarget);
      if (Array.isArray(valueList)) {
        payload2.valueList = valueList;
      }
    }
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
  function topicTargetDataAttributes(topicTarget) {
    const d = {};
    if (!topicTarget)
      return d;
    if (topicTarget.hasOwnProperty("attributes")) {
      const attrs = topicTarget.attributes;
      for (let i2 = 0; i2 < attrs.length; i2++) {
        if (attrs[i2].name.startsWith("data-")) {
          d[attrs[i2].name.substr(5)] = attrs[i2].value;
        }
      }
    }
    return d;
  }
  function topicTargetValue(topicTarget) {
    if (topicTarget && !topicTarget.disabled) {
      switch (topicTarget.nodeName) {
        case "FORM":
          return serializeFormToObject(topicTarget);
        case "INPUT":
        case "SELECT":
          if (topicTarget.type == "select-multiple") {
            const l2 = topicTarget.options.length;
            const v2 = [];
            for (let j = 0; j < l2; j++) {
              if (topicTarget.options[j].selected) {
                v2[v2.length] = topicTarget.options[j].value;
              }
            }
            return v2;
          } else if (topicTarget.type == "checkbox" || topicTarget.type == "radio") {
            if (topicTarget.checked) {
              return topicTarget.value;
            } else {
              return false;
            }
          }
          return topicTarget.value;
        case "TEXTAREA":
          return topicTarget.value;
        default:
          return void 0;
      }
    } else {
      return void 0;
    }
  }
  function topicTargetValueList(topicTarget) {
    if (topicTarget && !topicTarget.disabled) {
      if (topicTarget.nodeName === "FORM") {
        return serializeFormToList(topicTarget);
      } else {
        return void 0;
      }
    }
  }
  function fieldValue(field) {
    if (field.type == "select-multiple") {
      v = [];
      l = form.elements[i].options.length;
      for (let j = 0; j < l; j++) {
        if (field.options[j].selected) {
          v[v.length] = field.options[j].value;
        }
      }
      return v;
    } else if (field.type == "checkbox") {
      if (field.checked) {
        return field.value;
      } else if (field.hasAttribute("value-unchecked")) {
        return field.getAttribute("value-unchecked");
      } else {
        return "";
      }
    } else if (field.type != "radio" || field.checked) {
      return field.value;
    }
    return false;
  }
  function fieldSubmitIfOk(field, form2) {
    var _a, _b;
    if (field.disabled || field.classList.contains("nosubmit")) {
      return false;
    }
    if (field.dataset.submitIf) {
      const submitIf = (_a = form2.elements[field.dataset.submitIf]) != null ? _a : document.getElementById(field.dataset.submitIf);
      if (!submitIf || !fieldValue(submitIf)) {
        return false;
      }
    }
    if (field.dataset.submitIfNot) {
      const submitIfNot = (_b = form2.elements[field.dataset.submitIfNot]) != null ? _b : document.getElementById(field.dataset.submitIf);
      if (submitIfNot && !!fieldValue(submitIfNot)) {
        return false;
      }
    }
    return true;
  }
  function serializeFormToObject(form2) {
    let field, l2, v2, s = {};
    if (typeof form2 == "object" && form2.nodeName == "FORM") {
      const len = form2.elements.length;
      for (let i2 = 0; i2 < len; i2++) {
        field = form2.elements[i2];
        if (field.name && field.type != "file" && field.type != "reset" && field.type != "submit" && field.type != "button") {
          if (!fieldSubmitIfOk(field, form2)) {
            continue;
          }
          const val = fieldValue(field);
          if (val !== false) {
            s[field.name] = val;
          }
        }
      }
    }
    return s;
  }
  function serializeFormToList(form2) {
    let field, l2, v2, s = [], prev = "", skipped = false;
    if (typeof form2 == "object" && form2.nodeName == "FORM") {
      const len = form2.elements.length;
      for (let i2 = 0; i2 < len; i2++) {
        field = form2.elements[i2];
        if (field.name && field.type != "file" && field.type != "reset" && field.type != "submit" && field.type != "button") {
          if (!fieldSubmitIfOk(field, form2)) {
            continue;
          }
          if (skipped && field.name != skipped) {
            s.push([skipped, ""]);
            skipped = false;
          }
          if (field.type == "select-multiple") {
            l2 = form2.elements[i2].options.length;
            for (let j = 0; j < l2; j++) {
              if (field.options[j].selected) {
                s.push([field.name, field.options[j].value]);
              }
            }
          } else if (field.type == "checkbox") {
            if (field.checked) {
              if (prev == field.name) {
                skipped = false;
              }
              s.push([field.name, field.value]);
            } else if (field.hasAttribute("value-unchecked")) {
              if (prev == field.name) {
                skipped = false;
              }
              s.push([field.name, field.getAttribute("value-unchecked")]);
            } else if (prev != field.name) {
              skipped = field.name;
            }
          } else if (field.type != "radio" || field.checked) {
            s.push([field.name, field.value]);
          }
          prev = field.name;
        }
      }
      if (skipped) {
        s.push([skipped, ""]);
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
    let attr2 = document.body.parentElement.getAttribute("class") || "";
    let classes = attr2.split(/\s+/);
    let keep = [];
    var i2, j;
    for (i2 = classes.length - 1; i2 >= 0; i2--) {
      if (!classes[i2].startsWith("ui-state-")) {
        keep.push(classes[i2]);
      }
    }
    let ms = Object.keys(stateClass);
    for (i2 = ms.length - 1; i2 >= 0; i2--) {
      let m = ms[i2];
      for (j = stateClass[m].length - 1; j >= 0; j--) {
        keep.push("ui-state-" + m + "-" + stateClass[m][j]);
      }
    }
    let new_attr = keep.sort().join(" ");
    if (new_attr != attr2) {
      document.body.parentElement.setAttribute("class", new_attr);
    }
  }
  function syncStateData() {
    let root2 = document.body.parentElement;
    var current = {};
    var attrs = {};
    var i2, j;
    var ks;
    if (root2.hasAttributes()) {
      var rs = root2.attributes;
      for (i2 = rs.length - 1; i2 >= 0; i2--) {
        if (rs[i2].name.startsWith("data-ui-state-")) {
          current[rs[i2].name] = rs[i2].value;
        }
      }
    }
    let ms = Object.keys(stateData);
    for (i2 = ms.length - 1; i2 >= 0; i2--) {
      let m = ms[i2];
      let ks2 = Object.keys(stateData[m]);
      for (j = ks2.length - 1; j >= 0; j--) {
        attrs["data-ui-state-" + m + "-" + ks2[j]] = stateData[m][ks2[j]];
      }
    }
    ks = Object.keys(current);
    for (i2 = ks.length - 1; i2 >= 0; i2--) {
      if (!(ks[i2] in attrs)) {
        root2.removeAttribute(ks[i2]);
      }
    }
    ks = Object.keys(attrs);
    for (i2 = ks.length - 1; i2 >= 0; i2--) {
      var k = ks[i2];
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
    const first = MESSAGE_TYPE.CONNECT << 4;
    const willFlag = msg.will_flag || false;
    const willRetain = msg.will_retain || false;
    const willQoS = msg.will_qos || 0;
    const cleanStart = msg.clean_start || false;
    const v2 = new binary();
    v2.append(MqttProtoIdentifierv5);
    let flags = 0;
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
    v2.append1(flags);
    v2.appendUint16(msg.keep_alive || 0);
    v2.appendProperties(msg.properties || {});
    v2.appendUTF8(msg.client_id || "");
    if (willFlag) {
      v2.appendProperties(msg.will_properties || {});
      v2.appendUTF8(msg.will_topic);
      v2.appendBin(msg.will_payload, true);
    }
    if (typeof msg.username == "string") {
      v2.appendUTF8(msg.username);
    }
    if (typeof msg.password == "string") {
      v2.appendUTF8(msg.password);
    }
    return packet(first, v2);
  }
  function encodeConnack(msg) {
    const first = MESSAGE_TYPE.CONNACK << 4;
    let flags = 0;
    const v2 = new binary();
    if (msg.session_present) {
      flags |= 1;
    }
    v2.append1(flags);
    v2.append1(msg.reason_code || 0);
    v2.appendProperties(msg.properties || {});
    return packet(first, v2);
  }
  function encodePublish2(msg) {
    let first = MESSAGE_TYPE.PUBLISH << 4;
    const v2 = new binary();
    const qos = msg.qos || 0;
    const dup = msg.dup || false;
    const retain2 = msg.retain || false;
    first |= (dup ? 1 : 0) << 3;
    first |= (qos & 3) << 1;
    first |= retain2 ? 1 : 0;
    v2.appendUTF8(msg.topic);
    if (qos != 0) {
      v2.appendUint16(msg.packet_id);
    }
    v2.appendProperties(msg.properties || {});
    if (typeof msg.payload !== "undefined") {
      v2.appendBin(msg.payload);
    }
    return packet(first, v2);
  }
  function encodePubackEtAl(msg) {
    let first;
    const v2 = new binary();
    const rc = msg.reason_code || 0;
    const ps = msg.properties || {};
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
    v2.appendUint16(msg.packet_id);
    if (rc != 0 || Object.keys(ps).length != 0) {
      v2.append1(rc);
      v2.appendProperties(ps);
    }
    return packet(first, v2);
  }
  function encodeSubscribe2(msg) {
    let first = MESSAGE_TYPE.SUBSCRIBE << 4;
    const v2 = new binary();
    first |= 1 << 1;
    v2.appendUint16(msg.packet_id);
    v2.appendProperties(msg.properties || {});
    serializeSubscribeTopics(v2, msg.topics);
    return packet(first, v2);
  }
  function encodeSuback(msg) {
    const first = MESSAGE_TYPE.SUBACK << 4;
    const v2 = new binary();
    v2.appendUint16(msg.packet_id);
    v2.appendProperties(msg.properties || {});
    serializeSubscribeAcks(v2, msg.acks);
    return packet(first, v2);
  }
  function encodeUnsubscribe(msg) {
    const first = MESSAGE_TYPE.UNSUBSCRIBE << 4 | 2;
    const v2 = new binary();
    v2.appendUint16(msg.packet_id);
    v2.appendProperties(msg.properties || {});
    serializeUnsubscribeTopics(v2, msg.topics);
    return packet(first, v2);
  }
  function encodeUnsuback(msg) {
    const first = MESSAGE_TYPE.UNSUBACK << 4;
    const v2 = new binary();
    v2.appendUint16(msg.packet_id);
    v2.appendProperties(msg.properties || {});
    serializeUnsubscribeAcks(v2, msg.acks);
    return packet(first, v2);
  }
  function encodePingReq() {
    const first = MESSAGE_TYPE.PINGREQ << 4;
    const v2 = new binary();
    return packet(first, v2);
  }
  function encodePingResp() {
    const first = MESSAGE_TYPE.PINGRESP << 4;
    const v2 = new binary();
    return packet(first, v2);
  }
  function encodeDisconnect(msg) {
    const first = MESSAGE_TYPE.DISCONNECT << 4;
    const v2 = new binary();
    const reason_code = msg.reason_code || 0;
    const properties = msg.properties || {};
    if (reason_code != 0 || !isEmptyProperties(properties)) {
      v2.append1(reason_code);
      v2.appendProperties(properties);
    }
    return packet(first, v2);
  }
  function encodeAuth(msg) {
    const first = MESSAGE_TYPE.AUTH << 4;
    const v2 = new binary();
    const reason_code = msg.reason_code || 0;
    const properties = msg.properties || {};
    if (reason_code != 0 || !isEmptyProperties(properties)) {
      v2.append1(reason_code);
      v2.appendProperties(properties);
    }
    return packet(first, v2);
  }
  var decoder = function(binary2) {
    if (binary2.length < 2) {
      throw "incomplete_packet";
    }
    const b = new decodeStream(binary2);
    const first = b.decode1();
    const len = b.decodeVarint();
    const variable = b.decodeBin(len);
    let m;
    try {
      const vb = new decodeStream(variable);
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
  function decodeConnect(_first, vb) {
    const protocolName = vb.decodeUtf8();
    const protocolLevel = vb.decode1();
    if (protocolName == "MQTT" && protocolLevel == 5) {
      const flags = vb.decode1();
      const usernameFlag = !!(flags & 128);
      const passwordFlag = !!(flags & 64);
      const willRetain = !!(flags & 32);
      const willQos = flags >> 3 & 3;
      const willFlag = !!(flags & 4);
      const cleanStart = !!(flags & 2);
      const keepAlive = vb.decodeUint16();
      const props = vb.decodeProperties();
      const clientId = vb.decodeUtf8();
      let willProps = {};
      let willTopic;
      let willPayload;
      if (willFlag) {
        willProps = vb.decodeProperties();
        willTopic = vb.decodeUtf8();
        const willPayloadLen = vb.decodeUint16();
        willPayload = vb.decodeBin(willPayloadLen);
      }
      let username;
      let password;
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
  function decodeConnack(_first, vb) {
    const flags = vb.decode1();
    const sessionPresent = !!(flags & 1);
    const connectReason = vb.decode1();
    const props = vb.decodeProperties();
    return {
      type: "connack",
      session_present: sessionPresent,
      reason_code: connectReason,
      properties: props
    };
  }
  function decodePublish(first, vb) {
    const dup = !!(first & 8);
    const qos = first >> 1 & 3;
    const retain2 = !!(first & 1);
    const topic = vb.decodeUtf8();
    let packetId = null;
    if (qos > 0) {
      packetId = vb.decodeUint16();
    }
    const props = vb.decodeProperties();
    const payload2 = vb.remainingData();
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
    const packetId = vb.decodeUint16();
    let reasonCode = 0;
    let props = {};
    let type;
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
  function decodeSubscribe(_first, vb) {
    const packetId = vb.decodeUint16();
    const props = vb.decodeProperties();
    const topics = [];
    while (vb.remainingLength() > 0) {
      const name = vb.decodeUtf8();
      const flags = vb.decode1();
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
  function decodeSuback(_first, vb) {
    const packetId = vb.decodeUint16();
    const props = vb.decodeProperties();
    const acks = [];
    while (vb.remainingLength() > 0) {
      const ack = vb.decode1();
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
  function decodeUnsubscribe(_first, vb) {
    const packetId = vb.decodeUint16();
    const props = vb.decodeProperties();
    const topics = [];
    while (vb.remainingLength() > 0) {
      const topic = vb.decodeUtf8();
      topics.push(topic);
    }
    return {
      type: "unsubscribe",
      packet_id: packetId,
      properties: props,
      topics
    };
  }
  function decodeUnsuback(_first, vb) {
    const packetId = vb.decodeUint16();
    const props = vb.decodeProperties();
    const acks = [];
    while (vb.remainingLength() > 0) {
      const ack = vb.decode1();
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
  function decodePingReq(_first, vb) {
    if (vb.remainingLength() > 0) {
      throw "pingreq with variable part";
    }
    return {
      type: "pingreq"
    };
  }
  function decodePingResp(_first, vb) {
    if (vb.remainingLength() > 0) {
      throw "pingresp with variable part";
    }
    return {
      type: "pingresp"
    };
  }
  function decodeDisconnect(_first, vb) {
    let reasonCode;
    let props;
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
  function decodeAuth(_first, vb) {
    let reasonCode;
    let props;
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
    this.remainingLength = () => {
      return this.buf.length - this.offset;
    };
    this.remainingData = () => {
      if (this.buf.length == this.offset) {
        return new Uint8Array(0);
      } else {
        return this.buf.slice(this.offset, this.buf.length);
      }
    };
    this.ensure = (n) => {
      if (this.offset + n > this.buf.length) {
        throw "incomplete_packet";
      }
    };
    this.decodeVarint = () => {
      let multiplier = 1;
      let n = 0;
      let digits = 0;
      let digit;
      do {
        this.ensure(1);
        if (++digits > 4) {
          throw "malformed";
        }
        digit = this.buf[this.offset++];
        n += (digit & 127) * multiplier;
        multiplier *= 128;
      } while ((digit & 128) !== 0);
      return n;
    };
    this.decode1 = () => {
      this.ensure(1);
      return this.buf[this.offset++];
    };
    this.decodeUint16 = () => {
      this.ensure(2);
      const msb = this.buf[this.offset++];
      const lsb = this.buf[this.offset++];
      return (msb << 8) + lsb;
    };
    this.decodeUint32 = () => {
      this.ensure(4);
      const b1 = this.buf[this.offset++];
      const b2 = this.buf[this.offset++];
      const b3 = this.buf[this.offset++];
      const b4 = this.buf[this.offset++];
      return (b1 << 24) + (b2 << 16) + (b3 << 8) + b4;
    };
    this.decodeBin = (length) => {
      if (length == 0) {
        return new Uint8Array(0);
      } else {
        this.ensure(length);
        const offs = this.offset;
        this.offset += length;
        return this.buf.slice(offs, this.offset);
      }
    };
    this.decodeUtf8 = () => {
      const length = this.decodeUint16();
      return UTF8ToString(this.decodeBin(length));
    };
    this.decodeProperties = () => {
      if (this.remainingLength() == 0) {
        return {};
      }
      const len = this.decodeVarint();
      const end = this.offset + len;
      const props = {};
      while (this.offset < end) {
        const c = this.decode1();
        const p = PROPERTY_DECODE[c];
        if (p) {
          let v2;
          let k = p[0];
          switch (p[1]) {
            case "bool":
              v2 = !!this.decode1();
              break;
            case "uint32":
              v2 = this.decodeUint32();
              break;
            case "uint16":
              v2 = this.decodeUint16();
              break;
            case "uint8":
              v2 = this.decode1();
              break;
            case "utf8":
              v2 = this.decodeUtf8();
              break;
            case "bin":
              v2 = this.decodeBin(
                this.decodeUint16()
                /* count */
              );
              break;
            case "varint":
              v2 = this.decodeVarint();
              break;
            case "user":
            default:
              k = this.decodeUtf8();
              v2 = this.decodeUtf8();
              break;
          }
          if (p[2]) {
            switch (typeof props[k]) {
              case "undefined":
                props[k] = v2;
                break;
              case "object":
                props[k].push(v2);
                break;
              default:
                props[k] = [props[k], v2];
                break;
            }
          } else {
            props[k] = v2;
          }
        } else {
          throw "Illegal property";
        }
      }
      return props;
    };
  }
  function serializeSubscribeTopics(v2, topics) {
    for (let i2 = 0; i2 < topics.length; i2++) {
      let topic = topics[i2];
      if (typeof topic == "string") {
        topic = { topic };
      }
      const qos = topic.qos || 0;
      const noLocal = topic.no_local || false;
      const retainAsPublished = topic.retain_as_published || false;
      const retainHandling = topic.retain_handling || 0;
      let flags = 0;
      flags |= retainHandling << 4;
      flags |= (retainAsPublished ? 1 : 0) << 3;
      flags |= (noLocal ? 1 : 0) << 2;
      flags |= qos;
      v2.appendUTF8(topic.topic);
      v2.append1(flags);
    }
  }
  function serializeSubscribeAcks(v2, acks) {
    for (let i2 = 0; i2 < acks.length; i2++) {
      const ack = acks[i2];
      if (ack >= 0 && ack <= 2) {
        v2.append1(ack);
      } else if (ack >= 128 && ack <= 255) {
        v2.append1(ack);
      } else {
        throw "Subscribe ack outside 0..2 and 0x80..0xff";
      }
    }
  }
  function serializeUnsubscribeTopics(v2, topics) {
    for (let i2 = 0; i2 < topics.length; i2++) {
      v2.appendUTF8(topics[i2]);
    }
  }
  function serializeUnsubscribeAcks(v2, acks) {
    for (let i2 = 0; i2 < acks.length; i2++) {
      const ack = acks[i2];
      if (ack == 0 || ack == 17) {
        v2.append1(ack);
      } else if (ack >= 128 && ack <= 255) {
        v2.append1(ack);
      } else {
        throw "Unsubscribe ack outside 0..2 and 0x80..0xff";
      }
    }
  }
  function packet(first, binary2) {
    const mbi = encodeMBI(binary2.length());
    const pack = new Uint8Array(1 + mbi.length + binary2.length());
    pack[0] = first;
    for (let i2 = 0; i2 < mbi.length; i2++) {
      pack[1 + i2] = mbi[i2];
    }
    binary2.copyInto(pack, 1 + mbi.length);
    return pack;
  }
  function binary() {
    this.size = 64;
    this.buf = new Uint8Array(this.size);
    this.len = 0;
    this.length = () => {
      return this.len;
    };
    this.copyInto = (buf, offset) => {
      for (let i2 = this.len - 1; i2 >= 0; i2--) {
        buf[i2 + offset] = this.buf[i2];
      }
    };
    this.val = () => {
      return this.buf.slice(0, this.len);
    };
    this.append = (bytes) => {
      this.reserve(bytes.length);
      for (let i2 = 0; i2 < bytes.length; i2++) {
        this.buf[this.len++] = bytes[i2];
      }
    };
    this.append1 = (byte) => {
      this.reserve(1);
      this.buf[this.len++] = byte;
    };
    this.appendUint32 = (input) => {
      this.reserve(4);
      if (input < 0) {
        throw "Value uint32 below 0";
      }
      this.buf[this.len++] = input >> 24 & 255;
      this.buf[this.len++] = input >> 16 & 255;
      this.buf[this.len++] = input >> 8 & 255;
      this.buf[this.len++] = input & 255;
    };
    this.appendUint16 = (input) => {
      this.reserve(2);
      if (input < 0 || input >= 65536) {
        throw "Value too large for uint16";
      }
      this.buf[this.len++] = input >> 8;
      this.buf[this.len++] = input & 255;
    };
    this.appendVarint = (number) => {
      if (number < 0) {
        throw "Negative varint";
      }
      let numBytes = 0;
      do {
        this.reserve(1);
        let digit = number % 128;
        number = number >> 7;
        if (number > 0) {
          digit |= 128;
        }
        this.buf[this.len++] = digit;
      } while (number > 0 && ++numBytes < 4);
    };
    this.appendUTF8 = (s) => {
      const b = stringToUTF8(s);
      this.appendUint16(b.length);
      this.reserve(b.length);
      for (let i2 = 0; i2 < b.length; i2++) {
        this.buf[this.len++] = b[i2];
      }
    };
    this.appendBin = (b, addlen) => {
      switch (typeof b) {
        case "undefined":
          if (addlen) {
            this.appendUint16(0);
          }
          break;
        case "string":
          b = stringToUTF8(b);
          if (addlen) {
            this.appendUint16(b.length);
          }
          this.reserve(b.length);
          for (let i2 = 0; i2 < b.length; i2++) {
            this.buf[this.len++] = b[i2];
          }
          break;
        case "object":
          if (b instanceof binary) {
            if (addlen) {
              this.appendUint16(b.length());
            }
            this.reserve(b.length());
            b.copyInto(this.buf, this.len);
            this.len += b.length();
          } else if (typeof b.BYTES_PER_ELEMENT == "number") {
            let v2;
            if (b.BYTES_PER_ELEMENT == 1) {
              v2 = b;
            } else {
              v2 = new Uint8Array(b.buffer);
            }
            this.reserve(v2.length + 2);
            if (addlen) {
              this.appendUint16(v2.length);
            }
            for (let i2 = 0; i2 < v2.length; i2++) {
              this.buf[this.len++] = v2[i2];
            }
          } else {
            throw "Can't serialize unknown object";
          }
          break;
        default:
          throw "Can't serialize unsupported type: " + typeof b;
      }
    };
    this.appendProperties = (props) => {
      const b = serializeProperties(props);
      this.appendVarint(b.length());
      this.appendBin(b);
    };
    this.reserve = (count) => {
      if (this.size < this.len + count) {
        let newsize = this.size * 2;
        while (newsize < this.size + count) {
          newsize = newsize * 2;
        }
        const newbuf = new Uint8Array(newsize);
        for (let i2 = this.len - 1; i2 >= 0; i2--) {
          newbuf[i2] = this.buf[i2];
        }
        this.size = newsize;
        this.buf = newbuf;
      }
    };
  }
  function isEmptyProperties(props) {
    for (const k in props) {
      if (!Object.prototype.hasOwnProperty.call(props, k)) {
        continue;
      }
      return false;
    }
    return true;
  }
  function serializeProperties(props) {
    const b = new binary();
    for (const k in props) {
      if (!Object.prototype.hasOwnProperty.call(props, k)) {
        continue;
      }
      const p = PROPERTY[k] || PROPERTY.__user;
      if (p[2] && props[k].constructor === Array) {
        for (let i2 = 0; i2 < props[k].length; i2++) {
          b.append1(p[0]);
          serializeProperty(p[1], k, props[k][i2], b);
        }
      } else {
        b.append1(p[0]);
        serializeProperty(p[1], k, props[k], b);
      }
    }
    return b;
  }
  function serializeProperty(type, k, v2, b) {
    switch (type) {
      case "bool":
        b.append1(v2 ? 1 : 0);
        break;
      case "uint32":
        b.appendUint32(v2);
        break;
      case "uint16":
        b.appendUint16(v2);
        break;
      case "uint8":
        b.append1(v2);
        break;
      case "utf8":
        b.appendUTF8(v2);
        break;
      case "bin":
        b.appendBin(v2, true);
        break;
      case "varint":
        b.appendVarint(v2);
        break;
      case "user":
      default:
        b.appendUTF8(k);
        b.appendUTF8(v2);
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
    const output = new Array(1);
    let numBytes = 0;
    do {
      let digit = number % 128;
      number = number >> 7;
      if (number > 0) {
        digit |= 128;
      }
      output[numBytes++] = digit;
    } while (number > 0 && numBytes < 4);
    return output;
  }
  function init() {
    for (const k in PROPERTY) {
      const p = PROPERTY[k];
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
  function newTransport(remote, mqttSession3, options) {
    return new ws(remote, mqttSession3, options);
  }
  function ws(remote, mqttSession3, options) {
    this.remoteUrl = void 0;
    this.remoteHost = void 0;
    this.session = mqttSession3;
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
    this.sendMessage = (message) => {
      if (isStateConnected()) {
        const b = encoder(message);
        this.socket.send(b.buffer);
        if (message.type == "disconnect") {
          this.closeConnection();
        }
        return true;
      } else {
        return false;
      }
    };
    this.name = () => {
      return "mqtt_transport.ws: " + this.remoteUrl;
    };
    this.closeConnection = () => {
      if (isStateConnected() || isStateConnecting()) {
        this.socket.close();
        this.isConnected = false;
        this.isForceClosed = true;
        unsubscribe("model/lifecycle/event/state", { wid: this.name() });
      }
    };
    this.closeReconnect = (isNoBackOff) => {
      if (isStateConnected() || isStateConnecting()) {
        this.socket.close();
        this.isConnected = false;
      }
      this.isForceClosed = false;
      if (isNoBackOff === true) {
        this.backoff = 0;
        connect();
      } else {
        setBackoff();
      }
    };
    this.openConnection = () => {
      this.isForceClosed = false;
      connect();
    };
    const isStateConnected = () => {
      return !this.awaitPong && this.isConnected && this.socket && this.socket.readyState == 1;
    };
    const isStateConnecting = () => {
      return !this.isConnected || this.awaitPing || this.socket && this.socket.readyState == 0;
    };
    const isStateClosed = () => {
      return !this.socket || this.socket.readyState == 3;
    };
    const isStateForceClosed = () => {
      return this.isForceClosed;
    };
    const periodic = () => {
      if (isStateClosed() && !isStateForceClosed()) {
        if (this.backoff > 0) {
          this.backoff--;
        } else {
          connect();
        }
      }
    };
    const handleError = (reason) => {
      console.log("Closing websocket connection to " + this.remoteUrl + " due to " + reason);
      this.errorsSinceLastData++;
      if (isStateConnected()) {
        this.socket.close();
        this.isConnected = false;
      } else {
        this.isConnected = this.socket.readyState == 1;
      }
      setBackoff();
      this.session.disconnected("ws", reason);
    };
    const connect = () => {
      if (!isStateClosed()) {
        return false;
      }
      if (isStateForceClosed()) {
        return false;
      }
      this.data = new Uint8Array(0);
      this.isConnected = false;
      this.awaitPong = true;
      this.socket = void 0;
      let callOnOpen = false;
      const onopen = () => {
        this.isConnected = true;
        if (this.socket.protocol == "mqtt.cotonic.org") {
          this.randomPing = new Uint8Array([
            255,
            254,
            42,
            Math.floor(Math.random() * 100),
            Math.floor(Math.random() * 100)
          ]);
          this.socket.send(this.randomPing.buffer);
          this.awaitPong = true;
        } else {
          this.awaitPong = false;
          this.session.connected("ws");
        }
      };
      if (globalThis.cotonic && globalThis.cotonic.bridgeSocket && globalThis.cotonic.bridgeSocket.url == this.remoteUrl) {
        switch (globalThis.cotonic.bridgeSocket.readyState) {
          case 0:
            this.socket = cotonic.bridgeSocket;
            break;
          case 1:
            callOnOpen = true;
            this.socket = cotonic.bridgeSocket;
            break;
          default:
            break;
        }
        globalThis.cotonic.bridgeSocket = void 0;
      }
      if (!this.socket) {
        this.socket = new WebSocket(this.remoteUrl, ["mqtt"]);
      }
      this.socket.binaryType = "arraybuffer";
      this.socket.onopen = onopen;
      this.socket.onclose = function() {
        handleError("ws-close");
      };
      ;
      this.socket.onerror = function() {
        handleError("ws-error");
      };
      ;
      this.socket.onmessage = (message) => {
        if (message.data instanceof ArrayBuffer) {
          const data = new Uint8Array(message.data);
          if (this.awaitPong) {
            if (equalData(data, this.randomPing)) {
              this.awaitPong = false;
              this.session.connected("ws");
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
        (m) => {
          if (m.payload === "active") {
            this.backoff = 0;
          }
        },
        { wid: this.name() }
      );
      return true;
    };
    function equalData(a, b) {
      if (a.length == b.length) {
        for (let i2 = 0; i2 < a.length; i2++) {
          if (a[i2] != b[i2]) {
            return false;
          }
        }
        return true;
      } else {
        return false;
      }
    }
    const receiveData = (rcvd) => {
      if (this.data.length == 0) {
        this.data = rcvd;
      } else {
        let k = 0;
        const newdata = new Uint8Array(this.data.length, rcvd.length);
        for (let i2 = 0; i2 < this.data.length; i2++) {
          newdata[k++] = this.data[i2];
        }
        for (let i2 = 0; i2 < rcvd.length; i2++) {
          newdata[k++] = rcvd[i2];
        }
        this.data = newdata;
      }
      decodeReceivedData();
    };
    const decodeReceivedData = () => {
      let ok = true;
      while (ok && this.data.length > 0) {
        try {
          const result = decoder(this.data);
          handleBackoff(result[0]);
          this.data = result[1];
          this.session.receiveMessage(result[0]);
        } catch (e) {
          if (e != "incomplete_packet") {
            handleError(e);
          }
          ok = false;
        }
      }
    };
    const setBackoff = () => {
      this.backoff = Math.min(30, this.errorsSinceLastData * this.errorsSinceLastData);
    };
    const handleBackoff = (msg) => {
      switch (msg.type) {
        case "connack":
          if (msg.reason_code > 0) {
            this.errorsSinceLastData++;
          }
          break;
        case "disconnect":
          break;
        default:
          this.errorsSinceLastData = 0;
          break;
      }
    };
    const init8 = () => {
      if (remote == "origin") {
        this.remoteHost = document.location.host;
      } else {
        this.remoteHost = remote;
      }
      this.remoteUrl = protocol + "://" + this.remoteHost + controller_path;
      setTimeout(connect, connect_delay);
      setInterval(periodic, periodic_delay);
    };
    init8();
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
  function newSession(remote, bridgeTopics, options) {
    remote = remote || "origin";
    if (sessions[remote]) {
      return sessions[remote];
    } else {
      const ch = new mqttSession(bridgeTopics);
      sessions[remote] = ch;
      ch.connect(remote, options);
      return ch;
    }
  }
  function findSession(remote) {
    remote = remote || "origin";
    return sessions[remote];
  }
  function deleteSession(remote) {
    remote = remote || "origin";
    delete sessions[remote];
  }
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
          const data = {
            user_id: msg.payload.user_id,
            options: msg.payload.options || {},
            preferences: msg.payload.preferences || {}
          };
          const topic = "bridge/origin/$client/" + sessions["origin"].clientId + "/auth";
          publish(topic, data, { qos: 0 });
        }
      }
    });
    subscribe("model/sessionId/event", function(msg) {
      if (typeof msg.payload == "string") {
        if (sessions["origin"] && sessions["origin"].isConnected()) {
          const data = {
            options: { sid: msg.payload }
          };
          const topic = "bridge/origin/$client/" + sessions["origin"].clientId + "/sid";
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
    const sessionToRemote = (msg) => {
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
          this.sendMessage(msg.payload);
          break;
        default:
          break;
      }
    };
    const sessionToBridge = (msg) => {
      localPublish(this.bridgeTopics.session_in, msg);
    };
    const sessionControl = (_msg) => {
    };
    this.connect = (remote, options) => {
      options = options || {};
      if (typeof options.client_id === "string") {
        this.clientId = options.client_id;
      }
      if (typeof options.clean_start === "boolean") {
        this.cleanStart = options.clean_start;
      }
      if (typeof options.username === "string") {
        this.authUserPassword.username = options.username;
        this.authUserPassword.password = options.password || void 0;
      }
      this.connections["ws"] = newTransport(remote, this, options);
    };
    this.disconnect = (reasonCode) => {
      if (reasonCode === void 0) {
        reasonCode = MQTT_RC_SUCCESS;
      }
      const msg = {
        type: "disconnect",
        reason_code: reasonCode
      };
      this.sendMessage(msg);
      this.clientId = "";
      if (reasonCode === MQTT_RC_SUCCESS) {
        const transport = this.connections["ws"];
        if (transport) {
          transport.closeConnection();
          delete this.connections["ws"];
          publishStatus(false);
        }
      }
      sessionToBridge({ type: "disconnect" });
    };
    this.reconnect = (remote) => {
      if (remote == "origin" && this.connections["ws"]) {
        this.connections["ws"].openConnection();
      }
    };
    this.isConnected = () => {
      return isStateConnected();
    };
    this.connected = (transportName) => {
      if (transportName === "ws") {
        if (isStateNew()) {
          call("model/sessionId/get").then((msg) => {
            const connectMessage = {
              type: "connect",
              client_id: this.clientId,
              clean_start: this.cleanStart,
              keep_alive: MQTT_KEEP_ALIVE,
              username: this.authUserPassword.username,
              password: this.authUserPassword.password,
              properties: {
                session_expiry_interval: MQTT_SESSION_EXPIRY,
                cotonic_sid: msg.payload
              }
            };
            this.isSentConnect = this.sendMessage(connectMessage, true);
            if (this.isSentConnect) {
              this.isWaitConnack = true;
            }
          });
        }
      }
      publishEvent("transport/connected");
    };
    const publish2 = (pubmsg) => {
      const payload2 = pubmsg.payload;
      const properties = pubmsg.properties || {};
      let encodedPayload;
      if (typeof payload2 == "undefined" || payload2 === null) {
        encodedPayload = new Uint8Array(0);
      } else {
        const contentType = properties.content_type || guessContentType(payload2);
        encodedPayload = encodePayload(payload2, contentType);
        properties.content_type = contentType;
      }
      const msg = {
        type: "publish",
        topic: pubmsg.topic,
        payload: encodedPayload,
        qos: pubmsg.qos || 0,
        retain: pubmsg.retain || 0,
        properties
      };
      this.sendMessage(msg);
    };
    const subscribe2 = (submsg) => {
      let topics = submsg.topics;
      if (typeof topics == "string") {
        topics = [{ topic: topics }];
      }
      const msg = {
        type: "subscribe",
        packet_id: nextPacketId(),
        topics,
        properties: submsg.properties || {}
      };
      this.awaitingAck[msg.packet_id] = {
        type: "suback",
        nr: this.messageNr++,
        msg
      };
      this.sendMessage(msg);
    };
    const unsubscribe2 = (unsubmsg) => {
      let topics = unsubmsg.topics;
      if (typeof topics == "string") {
        topics = [topics];
      }
      const msg = {
        type: "unsubscribe",
        packet_id: nextPacketId(),
        topics,
        properties: unsubmsg.properties || {}
      };
      this.awaitingAck[msg.packet_id] = {
        type: "unsuback",
        nr: this.messageNr++,
        msg
      };
      this.sendMessage(msg);
    };
    this.keepAlive = () => {
      if (isStateWaitingPingResp()) {
        closeConnections();
      } else {
        this.isWaitPingResp = true;
        this.sendMessage({ type: "pingreq" });
      }
    };
    this.receiveMessage = (msg) => {
      this.receiveQueue.push(msg);
      if (!this.receiveTimer) {
        this.receiveTimer = setTimeout(() => {
          doReceive();
        }, 1);
      }
    };
    this.sendMessage = (msg, connecting) => {
      let isSent = false;
      if (isStateConnected() || connecting && isStateNew()) {
        switch (msg.type) {
          case "subscribe":
            msg.packet_id = nextPacketId(), this.awaitingAck[msg.packet_id] = {
              type: "suback",
              nr: this.messageNr++,
              msg
            };
            break;
          case "publish":
            switch (msg.qos) {
              case 0:
                break;
              case 1:
                msg.packet_id = nextPacketId();
                this.awaitingAck[msg.packet_id] = {
                  type: "puback",
                  nr: this.messageNr++,
                  msg
                };
                break;
              case 2:
                msg.packet_id = nextPacketId();
                this.awaitingAck[msg.packet_id] = {
                  type: "pubrec",
                  nr: this.messageNr++,
                  msg
                };
                break;
            }
            break;
          default:
            break;
        }
        isSent = this.sendTransport(msg);
      }
      if (!isSent) {
        this.queueMessage(msg);
      }
      return isSent;
    };
    this.sendTransport = (msg) => {
      let isSent = false;
      for (const conn in this.connections) {
        if (!isSent) {
          isSent = this.connections[conn].sendMessage(msg);
        }
      }
      return isSent;
    };
    this.queueMessage = (msg) => {
      switch (msg.type) {
        case "pingresp":
        case "pingreq":
          break;
        default:
          this.sendQueue.push(msg);
          break;
      }
    };
    this.disconnected = () => {
      setTimeout(() => {
        if (isStateWaitingConnAck()) {
          this.clientId = "";
        }
        this.isSentConnect = false;
        this.isWaitConnack = false;
        this.keepAliveInterval = 0;
        stopKeepAliveTimer();
      });
      publishEvent("transport/disconnected");
    };
    const isStateNew = () => {
      return !this.isSentConnect;
    };
    const isStateWaitingConnAck = () => {
      return this.isSentConnect && this.isWaitConnack;
    };
    const isStateConnected = () => {
      return this.isSentConnect && !this.isWaitConnack;
    };
    const isStateWaitingPingResp = () => {
      return this.isWaitPingResp && isStateConnected();
    };
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
    const doReceive = () => {
      for (let i2 = 0; i2 < this.receiveQueue.length; i2++) {
        handleReceivedMessage(this.receiveQueue[i2]);
      }
      this.receiveQueue = [];
      this.receiveTimer = false;
      this.isPacketReceived = true;
    };
    const resetKeepAliveTimer = () => {
      stopKeepAliveTimer();
      if (this.keepAliveInterval > 0) {
        this.keepAliveTimer = setInterval(() => {
          this.keepAlive();
        }, this.keepAliveInterval * 1e3);
      }
    };
    const stopKeepAliveTimer = () => {
      if (this.keepAliveTimer) {
        clearTimeout(this.keepAliveTimer);
        this.keepAliveTimer = false;
      }
      this.isWaitPingResp = false;
    };
    const cleanupSendQueue = (previousRoutingId) => {
      const previousBridgePrefix = "bridge/" + previousRoutingId + "/";
      const bridgePrefix = "bridge/" + this.routingId + "/";
      const q = [];
      for (const k in this.sendQueue) {
        const msg = this.sendQueue[k];
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
      this.sendQueue = q;
    };
    const sendQueuedMessages = () => {
      const queue = this.sendQueue;
      this.sendQueue = [];
      for (let k = 0; k < queue.length; k++) {
        this.sendMessage(queue[k]);
      }
    };
    const resendUnacknowledged = () => {
      const msgs = [];
      for (const packetId in this.awaitingAck) {
        const unack = this.awaitingAck[packetId];
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
      for (const k in msgs) {
        this.sendMessage(msgs[k].msg);
      }
    };
    const handleReceivedMessage = (msg) => {
      let replyMsg;
      switch (msg.type) {
        case "connack":
          if (!isStateWaitingConnAck()) {
            console2.log("Unexpected CONNACK", msg);
          }
          this.isWaitConnack = false;
          switch (msg.reason_code) {
            case MQTT_RC_SUCCESS:
              {
                const previousRoutingId = this.routingId;
                this.connectProps = msg.properties;
                if (msg.properties.assigned_client_identifier) {
                  this.clientId = msg.properties.assigned_client_identifier;
                }
                if (msg.properties["cotonic-routing-id"]) {
                  this.routingId = msg.properties["cotonic-routing-id"];
                } else {
                  this.routingId = this.clientId;
                }
                cleanupSendQueue(previousRoutingId);
                if (msg.session_present) {
                  resendUnacknowledged();
                } else {
                  this.awaitingRel = {};
                  this.awaitingAck = {};
                  this.cleanStart = false;
                }
                if (typeof this.connectProps.server_keep_alive == "number") {
                  this.keepAliveInterval = this.connectProps.server_keep_alive;
                } else {
                  this.keepAliveInterval = MQTT_KEEP_ALIVE;
                }
                resetKeepAliveTimer();
                publishStatus(true);
                sessionToBridge({
                  type: "connack",
                  is_connected: true,
                  client_id: this.clientId,
                  connack: msg
                });
                sendQueuedMessages();
              }
              break;
            case MQTT_RC_BAD_USERNAME_OR_PASSWORD:
              this.authUserPassword.username = void 0;
              this.authUserPassword.password = void 0;
            /* falls through */
            case MQTT_RC_CLIENT_ID_INVALID:
              this.clientId = "";
            /* falls through */
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
          if (this.awaitingAck[msg.packet_id]) {
            if (this.awaitingAck[msg.packet_id].type != "puback") {
              console2.log("MQTT: Unexpected puback for ", this.awaitingAck[msg.packet_id]);
            } else {
            }
            delete this.awaitingAck[msg.packet_id];
          } else {
            console2.log("MQTT: puback for unknown packet_id", msg.packet_id);
          }
          break;
        case "pubrec":
          if (this.awaitingAck[msg.packet_id]) {
          }
          if (msg.reason_code < 128) {
            if (this.awaitingAck[msg.packet_id]) {
              if (this.awaitingAck[msg.packet_id].type != "pubrec") {
                console2.log("MQTT: Unexpected pubrec for ", this.awaitingAck[msg.packet_id]);
              }
              this.awaitingAck[msg.packet_id].type = "pubcomp";
              this.awaitingAck[msg.packet_id].msg = void 0;
              replyMsg = { type: "pubrel", packet_id: msg.packet_id };
            } else {
              replyMsg = { type: "pubrel", packet_id: msg.packet_id, reason_code: MQTT_RC_PACKET_ID_NOT_FOUND };
            }
          } else {
            if (this.awaitingAck[msg.packet_id]) {
              delete this.awaitingAck[msg.packet_id];
            }
          }
          break;
        case "pubcomp":
          if (this.awaitingAck[msg.packet_id]) {
            if (this.awaitingAck[msg.packet_id].type != "pubcomp") {
              console2.log("MQTT: Unexpected pubcomp for ", this.awaitingAck[msg.packet_id]);
            }
            delete this.awaitingAck[msg.packet_id];
          }
          break;
        case "suback":
          if (this.awaitingAck[msg.packet_id]) {
            if (this.awaitingAck[msg.packet_id].type != "suback") {
              console2.log("MQTT: Unexpected suback for ", this.awaitingAck[msg.packet_id]);
            } else {
              const ackMsg = {
                type: "suback",
                topics: this.awaitingAck[msg.packet_id].topics,
                acks: msg.acks
              };
              sessionToBridge(ackMsg);
            }
            delete this.awaitingAck[msg.packet_id];
          }
          break;
        case "unsuback":
          if (this.awaitingAck[msg.packet_id]) {
            if (this.awaitingAck[msg.packet_id].type != "unsuback") {
              console2.log("MQTT: Unexpected unsuback for ", this.awaitingAck[msg.packet_id]);
            } else {
              const ackMsg = {
                type: "unsuback",
                topics: this.awaitingAck[msg.packet_id].topics,
                acks: msg.acks
              };
              sessionToBridge(ackMsg);
            }
            delete this.awaitingAck[msg.packet_id];
          }
          break;
        case "publish":
          {
            let isPubOk = false;
            let awaitRel;
            switch (msg.qos) {
              case 0:
                isPubOk = true;
                break;
              case 1:
                if (this.awaitingRel[msg.packet_id]) {
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
                if (this.awaitingRel[msg.packet_id]) {
                  awaitRel = this.awaitingRel[msg.packet_id];
                  replyMsg.reason_code = awaitRel.reason_code;
                } else {
                  isPubOk = true;
                }
                this.awaitingRel[msg.packet_id] = {
                  type: "pubrel",
                  nr: this.messageNr++
                };
            }
            if (isPubOk) {
              const ct = msg.properties.content_type;
              msg.payload = decodePayload(msg.payload, ct);
              sessionToBridge(msg);
              if (replyMsg) {
                replyMsg.reason_code = MQTT_RC_SUCCESS;
              }
              if (awaitRel) {
                awaitRel.reason_code = MQTT_RC_SUCCESS;
              }
            }
          }
          break;
        case "pubrel":
          if (this.awaitingRel[msg.packet_id]) {
            delete this.awaitingRel[msg.packet_id];
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
          this.sendMessage({ type: "pingresp" });
          break;
        case "pingresp":
          this.isWaitPingResp = false;
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
        setTimeout(() => {
          this.sendMessage(replyMsg);
        }, 0);
      }
    };
    const closeConnections = () => {
      for (const k in this.connection) {
        this.connection[k].closeConnection();
      }
      this.connection = {};
      this.isWaitPingResp = false;
      this.isSentConnect = false;
      this.isWaitConnack = false;
      this.keepAliveInterval = 0;
      stopKeepAliveTimer();
      publishStatus(false);
    };
    const nextPacketId = () => {
      do {
        this.packetId++;
        if (this.packetId > 65535) {
          this.packetId = 1;
        }
      } while (this.awaitingAck[this.packetId]);
      return this.packetId;
    };
    function localPublish(topic, msg, opts) {
      publish(topic, msg, opts);
    }
    function localSubscribe(topic, callback) {
      subscribe(topic, callback);
    }
    const publishStatus = (isConnected) => {
      localPublish(
        this.bridgeTopics.session_status,
        { is_connected: isConnected, client_id: this.clientId },
        { retain: true }
      );
    };
    const publishEvent = (event) => {
      localPublish(`${this.bridgeTopics.session_event}/${event}`, {});
    };
    const init8 = () => {
      publishStatus(false);
      localSubscribe(this.bridgeTopics.session_out, sessionToRemote);
      localSubscribe(this.bridgeTopics.session_control, sessionControl);
    };
    init8();
  }
  init2();

  // src/cotonic.mqtt_session_opener.js
  var cotonic_mqtt_session_opener_exports = {};
  __export(cotonic_mqtt_session_opener_exports, {
    deleteSession: () => deleteSession2,
    findSession: () => findSession2,
    newSession: () => newSession2
  });
  var console3 = globalThis.console;
  var sessions2 = {};
  var MQTT_KEEP_ALIVE2 = 300;
  function newSession2(remote, bridgeTopics, options) {
    remote = remote || "opener";
    if (sessions2[remote]) {
      return sessions2[remote];
    } else {
      const ch = new mqttSession2(bridgeTopics);
      sessions2[remote] = ch;
      ch.connect(remote, options);
      return ch;
    }
  }
  function findSession2(remote) {
    remote = remote || "opener";
    return sessions2[remote];
  }
  function deleteSession2(remote) {
    remote = remote || "opener";
    delete sessions2[remote];
  }
  function mqttSession2(mqttBridgeTopics) {
    this.bridgeTopics = mqttBridgeTopics;
    this.clientId = "";
    this.routingId = void 0;
    this.disconnectReason = "";
    this.keepAliveTimer = false;
    this.keepAliveInterval = MQTT_KEEP_ALIVE2;
    const sessionToRemote = (msg) => {
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
          this.sendMessage(msg.payload);
          break;
        default:
          break;
      }
    };
    function sessionControl(_msg) {
    }
    this.connect = (_remote, options) => {
      options = options || {};
      if (typeof options.client_id === "string") {
        this.clientId = options.client_id;
      }
      if (globalThis.opener) {
        resetKeepAliveTimer();
        publishEvent("transport/connected");
      } else {
        stopKeepAliveTimer();
        publishEvent("transport/disconnected");
      }
    };
    this.disconnect = (_reasonCode) => {
      stopKeepAliveTimer();
      publishStatus(false);
    };
    this.reconnect = (_remote) => {
      if (globalThis.opener) {
        resetKeepAliveTimer();
        publishEvent("transport/connected");
      } else {
        stopKeepAliveTimer();
        publishEvent("transport/disconnected");
      }
    };
    this.isConnected = () => {
      if (globalThis.opener) {
        return true;
      } else {
        return false;
      }
    };
    const publish2 = (pubmsg) => {
      const payload2 = pubmsg.payload;
      const properties = pubmsg.properties || {};
      if (typeof payload2 != "undefined" && payload2 !== null) {
        const contentType = properties.content_type || guessContentType(payload2);
        properties.content_type = contentType;
      }
      const msg = {
        type: "publish",
        topic: pubmsg.topic,
        payload: pubmsg.payload,
        qos: pubmsg.qos || 0,
        retain: pubmsg.retain || 0,
        properties
      };
      this.sendMessage(msg);
    };
    const subscribe2 = (_submsg) => {
    };
    const unsubscribe2 = (_unsubmsg) => {
    };
    this.keepAlive = () => {
      if (!globalThis.opener) {
        stopKeepAliveTimer();
        publishStatus(false);
      }
    };
    this.sendMessage = (msg) => {
      if (globalThis.opener) {
        globalThis.opener.cotonic.broker.publish_mqtt_message(msg);
        return true;
      } else {
        return false;
      }
    };
    const guessContentType = (payload2) => {
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
          console3.log("Do not know how to serialize a ", typeof payload2);
          return "application/json";
      }
    };
    const resetKeepAliveTimer = () => {
      stopKeepAliveTimer();
      if (this.keepAliveInterval > 0) {
        this.keepAliveTimer = setInterval(() => {
          this.keepAlive();
        }, this.keepAliveInterval * 1e3);
      }
    };
    const stopKeepAliveTimer = () => {
      if (this.keepAliveTimer) {
        clearTimeout(this.keepAliveTimer);
        this.keepAliveTimer = false;
      }
    };
    const localPublish = (topic, msg, opts) => {
      publish(topic, msg, opts);
    };
    const localSubscribe = (topic, callback) => {
      subscribe(topic, callback);
    };
    const publishStatus = (isConnected) => {
      localPublish(
        this.bridgeTopics.session_status,
        { is_connected: isConnected, client_id: this.clientId },
        { retain: true }
      );
    };
    const publishEvent = (event) => {
      localPublish(`${this.bridgeTopics.session_event}/${event}`, {});
    };
    const init8 = () => {
      publishStatus(false);
      localSubscribe(this.bridgeTopics.session_out, sessionToRemote);
      localSubscribe(this.bridgeTopics.session_control, sessionControl);
    };
    init8();
  }

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
  function newBridge(remote, options) {
    remote = remote || "origin";
    options = options || {};
    if (!options.mqtt_session) {
      if (remote == "opener") {
        options.mqtt_session = cotonic_mqtt_session_opener_exports;
      } else {
        options.mqtt_session = cotonic_mqtt_session_exports;
      }
    }
    let bridge = bridges[remote];
    if (!bridge) {
      bridge = new mqttBridge();
      bridges[remote] = bridge;
      bridge.connect(remote, options);
    }
    return bridge;
  }
  function disconnectBridge(remote) {
    const bridge = findBridge(remote);
    if (!bridge)
      return;
    return bridge.disconnect();
  }
  function findBridge(remote) {
    remote = remote || "origin";
    return bridges[remote];
  }
  function deleteBridge(remote) {
    remote = remote || "origin";
    delete bridges[remote];
  }
  function mqttBridge() {
    let remote;
    let name;
    let session;
    let clientId;
    let routingId = void 0;
    const local_topics = {};
    let is_connected = false;
    let is_ui_state = false;
    let session_present = false;
    let wid;
    let mqtt_session;
    this.connect = function(rmt, options) {
      mqtt_session = options.mqtt_session;
      name = options.name || rmt.replace(/[^0-9a-zA-Z\.]/g, "-");
      remote = rmt;
      wid = `bridge/${name}`;
      is_ui_state = options.is_ui_state || rmt == "origin";
      Object.assign(local_topics, {
        // Comm between local broker and bridge
        bridge_local: fill(BRIDGE_LOCAL_TOPIC, { name, topic: "#topic" }),
        bridge_status: fill(BRIDGE_STATUS_TOPIC, { name }),
        bridge_auth: fill(BRIDGE_AUTH_TOPIC, { name }),
        bridge_control: fill(BRIDGE_CONTROL_TOPIC, { name }),
        // Comm between session and bridge
        session_in: fill(SESSION_IN_TOPIC, { name }),
        session_out: fill(SESSION_OUT_TOPIC, { name }),
        session_status: fill(SESSION_STATUS_TOPIC, { name }),
        session_control: fill(SESSION_CONTROL_TOPIC, { name }),
        session_event: fill(SESSION_EVENT_TOPIC, { name })
      });
      subscribe(local_topics.bridge_local, relayOut, { wid, no_local: true });
      subscribe(local_topics.bridge_control, bridgeControl);
      subscribe(local_topics.session_in, relayIn);
      subscribe(local_topics.session_status, sessionStatus);
      session = mqtt_session.newSession(rmt, local_topics, options);
      publishStatus();
    };
    this.disconnect = function() {
      session.disconnect();
      mqtt_session.deleteSession(remote);
      session = void 0;
      mqtt_session = void 0;
      publishStatus();
    };
    function relayOut(msg, _props) {
      switch (msg.type) {
        case "publish":
          msg.topic = dropRoutingTopic(msg.topic);
          if (msg.properties && msg.properties.response_topic) {
            msg.properties.response_topic = remoteRoutingTopic(msg.properties.response_topic);
          }
          publish(local_topics.session_out, msg);
          break;
        default:
          console.log("Bridge relayOut received unknown message", msg);
          break;
      }
    }
    function relayIn(msg) {
      const relay = msg.payload;
      switch (relay.type) {
        case "publish":
          {
            const topic = relay.topic;
            const m = topic.match(/^bridge\/([^\/]+)\/(.*)/);
            if (m) {
              if (m[1] != clientId && m[1] != routingId) {
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
            publish_mqtt_message(relay, { wid });
          }
          break;
        case "connack":
          sessionConnack(relay);
          break;
        case "disconnect":
          is_connected = false;
          publishStatus();
          break;
        case "auth":
          publish(local_topics.bridge_auth, relay, { wid });
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
      const payload2 = msg.payload;
      switch (payload2.type) {
        case "subscribe":
          for (let k = 0; k < payload2.topics.length; k++) {
            payload2.topics[k].topic = dropRoutingTopic(payload2.topics[k].topic);
          }
          publish(local_topics.session_out, payload2);
          break;
        case "unsubscribe":
          break;
        case "auth":
          publish(local_topics.session_out, payload2);
          break;
        default:
          console.log("Bridge bridgeControl received unknown message", msg);
          break;
      }
    }
    function sessionConnack(msg) {
      is_connected = msg.is_connected;
      if (msg.is_connected) {
        clientId = msg.client_id;
        const props = msg.connack.properties;
        if (props && props["cotonic-routing-id"]) {
          routingId = props["cotonic-routing-id"];
        } else {
          routingId = msg.client_id;
        }
        if (!msg.connack.session_present) {
          const topics = [
            { topic: `bridge/${clientId}/#`, qos: 2, no_local: true }
          ];
          if (clientId != routingId) {
            topics.push({ topic: `bridge/${routingId}/#`, qos: 2, no_local: true });
          }
          const subscribe2 = {
            type: "subscribe",
            topics
          };
          publish(local_topics.session_out, subscribe2);
          resubscribeTopics();
          session_present = !!msg.connack.session_present;
        } else {
          session_present = true;
        }
      }
      publishStatus();
    }
    function resubscribeTopics() {
      const subs = find_subscriptions_below(`bridge/${name}`);
      const topics = {};
      for (let i2 = 0; i2 < subs.length; i2++) {
        if (subs[i2].wid == wid) {
          continue;
        }
        const sub = Object.assign({}, subs[i2].sub);
        sub.topic = remove_named_wildcards(sub.topic);
        if (!topics[sub.topic]) {
          topics[sub.topic] = sub;
        } else {
          mergeSubscription(topics[sub.topic], sub);
        }
      }
      const ts = [];
      for (const t in topics) {
        ts.push(topics[t]);
      }
      if (ts.length > 0) {
        bridgeControl({ type: "publish", payload: { type: "subscribe", topics: ts } });
      }
    }
    function sessionStatus(msg) {
      is_connected = msg.is_connected;
    }
    function remoteRoutingTopic(topic) {
      return `bridge/${routingId}/${topic}`;
    }
    function remoteClientTopic(topic) {
      return `bridge/${clientId}/${topic}`;
    }
    function localRoutingTopic(topic) {
      return `bridge/${name}/${topic}`;
    }
    function publishStatus() {
      publish(
        local_topics.bridge_status,
        {
          is_connected,
          session_present,
          client_id: clientId
        },
        { retain: true }
      );
      publish(
        "model/sessionStorage/post/mqtt$clientBridgeTopic",
        remoteClientTopic("")
      );
      if (is_ui_state) {
        const ui = {
          classes: [],
          status: {
            "remote": remote,
            "name": name
          }
        };
        if (is_connected) {
          ui.classes.push("connected");
        } else {
          ui.classes.push("disconnected");
        }
        publish("model/bridge/event/ui-status", ui);
      }
    }
  }
  function mergeSubscription(subA, subB) {
    const qosA = subA.qos || 0;
    const qosB = subB.qos || 0;
    subA.qos = Math.max(qosA, qosB);
    const rhA = subA.retain_handling || 0;
    const rhB = subB.retain_handling || 0;
    subA.retain_handling = Math.min(rhA, rhB);
    subA.retain_as_published = subA.retain_as_published || subB.retain_as_published || false;
    subA.no_local = subA.no_local && subB.no_local;
  }
  function dropRoutingTopic(topic) {
    return topic.replace(/^bridge\/[^\/]+\//, "");
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
      setCookie(bindings.key, msg.payload.value, msg.payload.exdays, msg.payload.samesite);
      if (msg.properties.response_topic) {
        publish(msg.properties.response_topic, getCookie(bindings.key));
      }
    },
    { wid: "model.document" }
  );
  function getCookie(cname) {
    const name = cname + "=";
    const ca = document.cookie.split(";");
    for (let i2 = 0; i2 < ca.length; i2++) {
      let c = ca[i2];
      while (c.charAt(0) == " ") {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
  }
  function setCookie(cname, cvalue, exdays, csamesite) {
    let expires = "";
    if (typeof exdays == "number") {
      if (exdays == 0) {
        expires = "; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      } else {
        const exmsec = (exdays != null ? exdays : 0) * 24 * 60 * 60 * 1e3;
        const d = /* @__PURE__ */ new Date();
        d.setTime(d.getTime() + exmsec);
        expires = "; expires=" + d.toUTCString();
      }
    }
    const value2 = cleanCookieValue(cvalue != null ? cvalue : "");
    const name = cleanCookieValue(cname);
    let samesite = csamesite != null ? csamesite : "None";
    switch (samesite.toLowerCase()) {
      case "strict":
        samesite = "Strict";
        break;
      case "lax":
        samesite = "Lax";
        break;
      case "none":
      default:
        samesite = "None";
        break;
    }
    let secure = "Secure; ";
    if (document.location.protocol == "http:") {
      secure = "";
    }
    document.cookie = name + "=" + value2 + expires + "; path=/; " + secure + "SameSite=" + samesite;
  }
  function cleanCookieValue(v2) {
    v2 = v2.replace(";", "").replace(",", "").replace("=", "").replace("\n", "").replace("	", "").replace("\r", "").replace("\v", "").replace("\f", "");
    return v2;
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
    const prefixes = " -webkit- -moz- -o- -ms- ".split(" ");
    const mq = function(query2) {
      return window.matchMedia(query2).matches;
    };
    if ("ontouchstart" in window || window.DocumentTouch && document instanceof DocumentTouch) {
      return true;
    }
    const query = ["(", prefixes.join("touch-enabled),("), "heartz", ")"].join("");
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
    if (transitions === void 0) return;
    const transitionPath = transitions[newState];
    if (transitionPath === void 0) return;
    for (let i2 = 0; i2 < transitionPath.length; i2++) {
      publish("model/lifecycle/event/state", transitionPath[i2], { retain: true });
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
  var redirectBackTimeout = void 0;
  function init3() {
    publish("model/location/event/ping", "pong", { retain: true });
    publishLocation(true);
    window.addEventListener("hashchange", publishLocation, false);
  }
  function publishLocation(isInit) {
    const oldhash = location.hash;
    const oldpathname = location.pathname;
    const oldsearch = location.search;
    const oldpathname_search = location.pathname_search;
    location.protocol = window.location.protocol;
    location.port = window.location.port;
    location.host = window.location.host;
    location.hostname = window.location.hostname;
    location.href = window.location.href;
    location.pathname = window.location.pathname;
    location.origin = window.location.origin;
    location.hash = window.location.hash;
    location.search = window.location.search;
    if (isInit) {
      const pathname_search = config.pathname_search || document.body && document.body.getAttribute("data-cotonic-pathname-search") || "";
      location.pathname_search = pathname_search;
    }
    if (oldsearch !== location.search || oldpathname_search !== location.pathname_search) {
      let qlist = searchParamsList(window.location.search);
      const q = searchParamsIndexed(qlist);
      if (isInit && location.pathname_search) {
        const qps = searchParamsList(location.pathname_search);
        const pathq = searchParamsIndexed(qps);
        for (let k in pathq) {
          q[k] = pathq[k];
        }
        qlist = qlist.concat(qps);
      }
      location.q = q;
      location.qlist = qlist;
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
      publish(
        "model/location/event/qlist",
        location.qlist,
        { retain: true }
      );
    }
    if (oldhash !== location.hash) {
      publish(
        "model/location/event/hash",
        location.hash === "" ? "#" : location.hash,
        { retain: true }
      );
      if (location.hash) {
        const hashTarget = document.getElementById(location.hash.substring(1));
        if (hashTarget) {
          hashTarget.scrollIntoView({ behavior: "smooth" });
        }
      }
    }
  }
  function searchParamsIndexed(ps) {
    let q = {};
    for (let i2 = 0; i2 < ps.length; i2++) {
      const name = ps[i2][0];
      const indexed = name.match(/^(.*)\[([^\[]*)\]$/);
      if (indexed) {
        const iname = indexed[1] + "[]";
        if (typeof q[iname] === "undefined") {
          q[iname] = [];
        }
        if (indexed[2].length > 0) {
          q[iname][indexed[2]] = ps[i2][1];
        } else {
          q[iname].push(ps[i2][1]);
        }
      } else {
        q[name] = ps[i2][1];
      }
    }
    return q;
  }
  function searchParamsList(qs) {
    let ps = [];
    const searchParams = new URLSearchParams(qs);
    searchParams.forEach((value2, key3) => {
      ps.push([key3, value2]);
    });
    return ps;
  }
  subscribe(
    "model/auth/event/auth-changing",
    function(msg) {
      if (!isNavigating) {
        let onauth = msg.payload.onauth || document.body.parentNode.getAttribute("data-onauth");
        if (onauth === null || onauth !== "#") {
          setTimeout(function() {
            if (onauth === null || onauth === "#reload") {
              reload();
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
  function payload_url(msg) {
    var _a, _b, _c;
    let url;
    if ((_a = msg.payload) == null ? void 0 : _a.url) {
      url = msg.payload.url;
    } else if ((_c = (_b = msg.payload) == null ? void 0 : _b.message) == null ? void 0 : _c.href) {
      url = msg.payload.message.href;
    } else if (typeof msg.payload == "string" && msg.payload) {
      url = msg.payload;
    }
    return url;
  }
  subscribe("model/location/post/push", function(msg) {
    let url = payload_url(msg);
    if (url) {
      url = new URL(url, window.location);
      window.history.pushState({}, "", url.pathname + url.search + url.hash);
      publishLocation();
    }
  }, { wid: "model.location" });
  subscribe("model/location/post/replace", function(msg) {
    let url = payload_url(msg);
    if (url) {
      url = new URL(url, window.location);
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
      publishLocation();
    }
  }, { wid: "model.location" });
  subscribe("model/location/post/push-silent", function(msg) {
    let url = payload_url(msg);
    if (url) {
      url = new URL(url, window.location);
      window.history.pushState({}, "", url.pathname + url.search + url.hash);
    }
  }, { wid: "model.location" });
  subscribe("model/location/post/replace-silent", function(msg) {
    let url = payload_url(msg);
    if (url) {
      url = new URL(url, window.location);
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    }
  }, { wid: "model.location" });
  subscribe("model/location/post/redirect", function(msg) {
    let url = payload_url(msg);
    if (url) {
      window.location = msg.payload.url;
      willNavigate();
    }
  }, { wid: "model.location" });
  subscribe("model/location/post/redirect/back", function(msg) {
    window.history.back();
    willNavigate();
    if (redirectBackTimeout) {
      clearTimeout(redirectBackTimeout);
    }
    ;
    const fallbackUrl = payload_url(msg);
    if (fallbackUrl) {
      redirectBackTimeout = setTimeout(redirectLocal, 500, fallbackUrl);
    }
  }, { wid: "model.location" });
  subscribe("model/location/post/redirect-local", function(msg) {
    redirectLocal(payload_url(msg));
  }, { wid: "model.location" });
  function redirectLocal(url) {
    if (!url)
      return;
    url = new URL(url, window.location);
    window.location = url.pathname + url.search + url.hash;
    willNavigate();
  }
  subscribe("model/location/post/reload", function(msg) {
    reload();
  }, { wid: "model.location" });
  subscribe("model/location/post/q", function(msg) {
    let args = msg.payload;
    if (typeof args == "object") {
      let s = new URLSearchParams();
      for (const p in args) {
        const v2 = args[p];
        if (Array.isArray(v2)) {
          for (let k = 0; k < v2.length; k++) {
            s.append(p, "" + v2[k]);
          }
        } else {
          s.append(p, "" + v2);
        }
      }
      window.history.replaceState({}, "", "?" + s.toString());
    } else {
      window.history.replaceState({}, "", "?");
    }
    publishLocation();
  }, { wid: "model.location" });
  subscribe("model/location/post/qlist", function(msg) {
    const args = msg.payload;
    if (Array.isArray(args) && args.length > 0) {
      let s = new URLSearchParams();
      for (let i2 = 0; i2 < args.length; i2++) {
        s.append(args[i2][0], "" + args[i2][1]);
      }
      window.history.replaceState({}, "", "?" + s.toString());
    } else {
      window.history.replaceState({}, "", "?");
    }
    publishLocation();
  }, { wid: "model.location" });
  subscribe("model/location/post/qlist/submit", function(msg) {
    var _a, _b;
    const args = (_b = (_a = msg.payload) == null ? void 0 : _a.valueList) != null ? _b : [];
    if (Array.isArray(args) && args.length > 0) {
      let s = new URLSearchParams();
      for (let i2 = 0; i2 < args.length; i2++) {
        s.append(args[i2][0], "" + args[i2][1]);
      }
      window.history.replaceState({}, "", "?" + s.toString());
    } else {
      window.history.replaceState({}, "", "?");
    }
    publishLocation();
  }, { wid: "model.location" });
  subscribe("model/location/post/hash", function(msg) {
    const hash = msg.payload;
    if (hash) {
      window.history.replaceState({}, "", "#" + hash);
    } else {
      window.history.replaceState({}, "", "#");
    }
    publishLocation();
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
  function reload() {
    window.location.replace(window.location.pathname + window.location.search);
    willNavigate();
  }
  init3();

  // src/cotonic.model.serviceWorker.js
  var console4 = globalThis.console;
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
            console4.log("Could not start serviceWorker due to a SecurityError.");
            console4.log("See https://cotonic.org/#model.serviceWorker for more information.");
            break;
          default:
            console4.log("Could not start serviceWorker: ", error.message);
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
          console4.log("Unknown event from service worker", event);
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
      { value: value2, exdays: 14, samesite: "strict" }
    );
  }
  function generate() {
    let value2 = s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();
    window.localStorage.setItem("cotonic-sid", JSON.stringify(value2));
    publish(
      "model/document/post/cookie/cotonic-sid",
      { value: value2, exdays: 4, samesite: "strict" }
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
        { value: "", exdays: 0, samesite: "strict" }
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
  var oninput_delay = [];
  var ONINPUT_DELAY = 500;
  function maybeRespond2(result, properties) {
    if (properties.response_topic) {
      publish(properties.response_topic, result);
    }
  }
  function hashCode(s) {
    let hash = 0, i2 = 0, len = s.length;
    while (i2 < len) {
      hash = (hash << 5) - hash + s.charCodeAt(i2++) << 0;
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
    const prevNodesCreated = IncrementalDOM.notifications.nodesCreated;
    IncrementalDOM.notifications.nodesCreated = function(nodes) {
      nodes.forEach((n) => {
        if (n.hasAttribute && n.hasAttribute("data-onvisible-topic")) {
          attachIntersectionObserver(n);
        }
        if (n.id) {
          publish("model/ui/event/node-created/" + n.id, { id: n.id });
        }
      });
      if (prevNodesCreated) {
        prevNodesCreated(nodes);
      }
    };
    const prevNodesDeleted = IncrementalDOM.notifications.nodesCreated;
    IncrementalDOM.notifications.nodesDeleted = function(nodes) {
      nodes.forEach((n) => {
        if (n.id) {
          publish("model/ui/event/node-deleted/" + n.id, { id: n.id });
        }
      });
      if (prevNodesDeleted) {
        prevNodesDeleted(nodes);
      }
    };
    if (globalThis.cotonic && globalThis.cotonic.bufferedEvents) {
      for (const e in globalThis.cotonic.bufferedEvents) {
        topic_event(globalThis.cotonic.bufferedEvents[e], true);
      }
      globalThis.cotonic.bufferedEvents = [];
    }
  }
  function attachIntersectionObserver(elt) {
    let observer = new IntersectionObserver((changes) => {
      changes.forEach((c) => {
        if (c.isIntersecting) {
          const event = {
            type: "visible",
            target: c.target,
            cancelable: false,
            stopPropagation: () => 0,
            preventDefault: () => 0
          };
          topic_event(event);
        }
      });
    });
    observer.observe(elt);
  }
  function initTopicEvents(elt) {
    elt.addEventListener("submit", topic_event);
    elt.addEventListener("click", topic_event);
    elt.addEventListener("input", topic_event);
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
    const ignore = getFromDataset(event.target, topicTarget, `on${event.type}Ignore`);
    switch (ignore) {
      case "1":
      case "yes":
      case "true":
        return;
      default:
        break;
    }
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
    if (event.type == "input") {
      for (let i2 = 0; i2 < oninput_delay.length; i2++) {
        if (oninput_delay[i2].element === topicTarget) {
          clearTimeout(oninput_delay[i2].timer);
          oninput_delay.splice(i2, 1);
        }
      }
      const index = oninput_delay.length;
      const timer = setTimeout(
        () => {
          clearTimeout(oninput_delay[index].timer);
          oninput_delay.splice(index, 1);
          on(topic, msg, event, topicTarget, options);
        },
        ONINPUT_DELAY
      );
      oninput_delay.push({
        element: topicTarget,
        timer
      });
    } else {
      on(topic, msg, event, topicTarget, options);
      if (event.type === "submit" && "onsubmitReset" in topicTarget.dataset) {
        topicTarget.reset();
      }
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
      let attributes2 = elt.attributes;
      for (let i2 = attributes2.length - 1; i2 >= 0; i2--) {
        let name = attributes2[i2].name;
        if (!attrs[name]) {
          attrs[name] = attributes2[i2].value;
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
    "model/ui/replace/+key",
    function(msg, bindings) {
      const p = msg.payload || "";
      let html;
      if (typeof p === "object" && p.status === "ok" && typeof p.result === "string") {
        html = p.result;
      } else {
        html = p;
      }
      maybeRespond2(replace(bindings.key, html), msg.properties);
    },
    { wid: "model.ui" }
  );
  subscribe(
    "model/ui/render-template/+key",
    function(msg, bindings) {
      const topic = msg.payload.topic;
      const data = msg.payload.data || {};
      const key3 = bindings.key;
      const dedup2 = msg.payload.dedup || false;
      const newHash = hashCode(JSON.stringify([topic, data]));
      if (!dedup2 || !render_cache[key3] || render_cache[key3].hash != newHash) {
        const serial = render_serial++;
        render_cache[key3] = {
          serial,
          dedup: dedup2,
          hash: newHash,
          topic,
          data
        };
        call(topic, data, { qos: dedup2 ? 1 : 0 }).then(function(rendermsg) {
          if (serial === render_cache[key3].serial) {
            const p = rendermsg.payload || "";
            let html;
            if (typeof p === "object" && p.status === "ok" && typeof p.result === "string") {
              html = p.result;
            } else {
              html = p;
            }
            maybeRespond2(cotonic.ui.update(key3, html), msg.properties);
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

  // src/cotonic.model.dedup.js
  var TIMEOUT = 15e3;
  var in_flight = {};
  function init7() {
    publish("model/dedup/event/ping", "pong", { retain: true });
  }
  function key2(message) {
    var _a, _b;
    const key3 = message.payload.topic + "::" + ((_b = (_a = message.properties) == null ? void 0 : _a.response_topic) != null ? _b : "");
    return btoa(key3);
  }
  function dedup(msg, key3) {
    var _a, _b;
    const timeout = (_a = msg.payload.timeout) != null ? _a : TIMEOUT;
    let m = in_flight[key3];
    if (m) {
      m.queued_message = msg;
      m.queued_timeout = Date.now() + timeout;
    } else {
      m = {
        response_topic: (_b = msg.properties) == null ? void 0 : _b.response_topic,
        queued_message: void 0,
        queued_timeout: void 0,
        timeout: setTimeout(() => {
          done(false, key3);
        }, timeout)
      };
      in_flight[key3] = m;
      const options = {
        qos: msg.qos,
        properties: {
          response_topic: "model/dedup/post/done/" + key3
        }
      };
      publish(msg.payload.topic, msg.payload.payload, options);
    }
  }
  function done(response, key3) {
    var _a;
    const m = in_flight[key3];
    if (m) {
      delete in_flight[key3];
      if (m.timeout) {
        clearTimeout(m.timeout);
      }
      if (response !== false && m.response_topic) {
        publish(m.response_topic, response.payload, { qos: (_a = response.qos) != null ? _a : 0 });
      }
      if (m.queued_message && Date.now() < m.queued_timeout) {
        dedup(m.queued_message, key3);
      }
    }
  }
  subscribe("model/dedup/post/done/+key", (msg, bindings) => {
    done(msg, bindings.key);
  });
  subscribe(
    "model/dedup/post/message",
    (msg) => {
      dedup(msg, key2(msg));
    },
    { wid: "model.dedup" }
  );
  subscribe(
    "model/dedup/post/message/+key",
    (msg, bindings) => {
      dedup(msg, bindings.key);
    },
    { wid: "model.dedup" }
  );
  init7();

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
  cotonic2.mqtt_session_opener = cotonic_mqtt_session_opener_exports;
  cotonic2.mqtt_bridge = cotonic_mqtt_bridge_exports;
  cotonic2.keyserver = cotonic_keyserver_exports;
  triggerCotonicReady();
})();
/**
 * @preserve
 * Copyright 2024 The Cotonic Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
/**
 * @preserve
 * Copyright 2016-2023 The Cotonic Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0.
 */
