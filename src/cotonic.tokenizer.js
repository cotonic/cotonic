/**
 * Copyright 2016-2023 The Cotonic Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Tokenizer based on the erlang html tokenizer in https://github.com/mochi/mochiweb

(function (cotonic) {
"use strict";
    cotonic = cotonic || {};
    const TAB = 9,
          NEWLINE = 10,
          SPACE = 32,
          RETURN = 13,

          DASH = 45,
          LT = 60,
          GT = 62,

          SLASH = 47,
          UNDERSCORE = 95,
          AMPERSAND = 38,
          EQUALS = 61,
          QUESTION_MARK = 63,
          COLON = 59,

          QUOTE = 34,
          SQUOTE = 39,

          CHAR_A = 65,
          CHAR_Z = 90,

          CHAR_a = 97,
          CHAR_z = 122,

          DONE = 0,
          SCRIPT = 1,
          TEXTAREA = 2,
          NORMAL = 3;


    function TokenBuilder(acc) {
        /*
         * Token builder functions, this allows one to customize the tokens being generated.
         * Or call incrementalDOM directly during tokenization
         */

        function addKey(token, attributes) {
            for(let i=0; i < attributes.length; i = i + 2) {
                if(attributes[i] === "key") {
                    token.key = attributes[i+1];
                    break;
                }
            }
        }

        this.elementOpen = function (tag, attributes) {
            const t = { type: "open", tag: tag, attributes: attributes };
            addKey(t, attributes);
            acc.push(t);
        };

        this.elementVoid = function (tag, attributes) {
            const t = { type: "void", tag: tag, attributes: attributes };
            addKey(t, attributes);
            acc.push(t);
        };

        this.elementClose = function (tag) {
            acc.push({ type: "close", tag: tag });
        };

        this.processingInstruction = function (tag, attributes) {
            acc.push({ type: "pi", tag: tag, attributes: attributes });
        };

        this.doctype = function (attributes) {
            acc.push({ type: "doctype", attributes: attributes });
        };

        this.comment = function (data) {
            acc.push({ type: "comment", data: data });
        };

        this.text = function (data) {
            acc.push({ type: "text", data: data });
        };

        this.result = acc;
    }

    /*
     * Decoder State
     */
    function Decoder(builder) {
        this.line = 1;
        this.column = 1;
        this.offset = 0;

        this.builder = builder;

        this.adv_col = function (n) {
            this.column = this.column + n;
            this.offset = this.offset + n;
            return this;
        };

        this.inc_col = function () {
            this.column += 1;
            this.offset += 1;

            return this;
        };

        this.inc_line = function () {
            this.line += 1;
            this.column = 1;
            this.offset += 1;

            return this;
        };

        this.inc_char = function (c) {
            if (c === NEWLINE) {
                this.inc_line();
            } else {
                this.inc_col();
            }
            return this;
        };
    }

    let tokens = function (data, tokenBuilder) {
        if (tokenBuilder === undefined) {
            tokenBuilder = new TokenBuilder([]);
        }

        let decoder = new Decoder(tokenBuilder);
        tokens3(data, tokenBuilder, decoder);
        return tokenBuilder.result;
    };

    function tokens3(data, builder, decoder) {
        let cont=true;

        while (cont) {
            if (data.length <= decoder.offset) {
                return;
            }

            let rv = tokenize(data, builder, decoder);

            if (rv === DONE) {
                return;
            } else if (rv === NORMAL) {
                continue;
            } else if (rv === SCRIPT) {
                tokenize_script(data, decoder);
            } else if (rv === TEXTAREA) {
                tokenize_textarea(data, decoder);
            } else {
                throw "internal_error";
            }
        }
    }

    function tokenize(data, builder, d) {
        let tag, attributes, text_data, has_slash,
            c0, c1, c2, c3, c4, c5, c6, c7, c8;

        c0 = data.charAt(d.offset);
        if (c0 === undefined)
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

        if (c0 === "<" && c1 === "!" && c2 === "D" && c3 === "O" && c4 === "C"
            && c5 === "T" && c6 === "Y" && c7 === "P" && c8 === "E")
            return tokenize_doctype(data, d.adv_col(10));

        if (c0 === "<" && c1 === "!" && c2 === "d" && c3 === "o" && c4 === "c"
            && c5 === "t" && c6 === "y" && c7 === "p" && c8 === "e")
            return tokenize_doctype(data, d.adv_col(10));

        if (c0 === "<" && c1 === "!" && c2 === "[" && c3 === "C" && c4 === "D"
            && c5 === "A" && c6 === "T" && c7 === "A" && c8 === "[")
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

        // end-tag
        if (c0 === "<" && c1 === "/") {
            tag = tokenize_literal(data, d.adv_col(2), "tag");
            has_slash = find_gt(data, d);

            builder.elementClose(tag.value);
            return NORMAL;
        }

        // data
        if (c0 === "<" && (is_whitespace(data.codePointAt(d.offset + 1))
            || !is_start_literal_safe(data.codePointAt(d.offset + 1)))) {
            // we are not doing strict html
            text_data = tokenize_data(data, d.inc_col(1));
            builder.text("<" + text_data.value);

            return NORMAL;
        }

        // open tag
        if (c0 === "<") {
            tag = tokenize_literal(data, d.inc_col(), "tag");
            attributes = tokenize_attributes(data, d);
            has_slash = find_gt(data, d);

            if (has_slash.value || is_singleton(tag.value)) {
                builder.elementVoid(tag.value, attributes.value);
            } else {
                builder.elementOpen(tag.value, attributes.value);
            }

            if (tag.value === "textarea") return TEXTAREA;
            if (tag.value === "script") return SCRIPT;

            return NORMAL;
        }

        // data
        text_data = tokenize_data(data, d);
        builder.text(text_data.value);

        return NORMAL;
    }

    function tokenize_textarea(data, d) {
        let cont=true, offsetStart = d.offset, lt, slash, n;

        while (cont) {
            lt = data.codePointAt(d.offset);
            if (lt === undefined) {
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
        let cont=true, offsetStart = d.offset, lt, slash, n;

        while (cont) {
            lt = data.codePointAt(d.offset);
            if (lt === undefined) {
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

    /*
     * Tokenizeirs
     */

    function tokenize_doctype(data, d) {
        let c, acc = [], word, cont=true;

        while (cont) {
            c = data.codePointAt(d.offset);

            if (c === undefined || c === GT) {
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
        let offsetStart = d.offset, cont=true;

        while (cont) {
            let c1 = data.codePointAt(d.offset);
            let c2 = data.codePointAt(d.offset + 1);
            let c3 = data.codePointAt(d.offset + 2);

            if (c1 === DASH && c2 === DASH && c3 === GT) {
                d.builder.comment(data.slice(offsetStart, d.offset));
                d.adv_col(3);

                return NORMAL;
            }

            if (c1 === undefined) {
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
        let acc = [], i=0, cont=true;

        while (cont) {
            let c = data.codePointAt(d.offset);
            if (c === undefined) {
                return value(acc.join(""), d);
            }

            if (c === quote) {
                d.inc_col();
                return value(acc.join(""), d);
            }

            if (c === AMPERSAND) {
                let charref = tokenize_charref(data, d.inc_col());
                acc[i++] = charref.value;
            }

            acc[i++] = data[d.offset];
            d.inc_char(c);
        }
    }

    function tokenize_data(data, d) {
        let offsetStart = d.offset, cont=true;

        while (cont) {
            let c = data.codePointAt(d.offset);
            if (c === undefined || c === LT || c === AMPERSAND) {
                return value(data.slice(offsetStart, d.offset), d);
            }

            d.inc_char(c);
        }
    }

    function tokenize_literal(data, d, type) {
        let literal = [], i=0, cont=true, c = data.codePointAt(d.offset);

        // Handle case where tokenize_literal would consume
        // 0 chars. http://github.com/mochi/mochiweb/pull/13
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

            if(c !== undefined)  {
                if (!((is_whitespace(c) || (c === GT) || (c === SLASH) || (c === EQUALS)))) {
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
        let cont=true, attributes = [], attribute, attribute_value;

        while (cont) {
            let c = data.codePointAt(d.offset);

            if (c === undefined)
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
        let has_slash = false, c, cont=true;

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

            if (c === undefined) {
                return value(has_slash, d);
            }

            d.inc_char(c);
        }
    }

    function find_qgt(data, d) {
        let cont = true, offsetStart = d.offset, c1, c2;

        while (cont) {
            c1 = data.codePointAt(d.offset);

            if (c1 === undefined) {
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

            // Should not be reached. Tokenize attributes takes care of this.
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
        if (c === undefined)
            return value("", d);


        if (c === QUOTE || c === SQUOTE) {
            return tokenize_quoted_attr_value(data, c, d.inc_col());
        }

        return tokenize_unquoted_attr_value(data, d);
    }

    function tokenize_quoted_attr_value(data, start_quote, d) {
        let v = [], i=0, cont = true;

        while (cont) {
            let c = data.codePointAt(d.offset);

            if (c === undefined) {
                return value(v.join(""), d);
            }

            if (c === AMPERSAND) {
                let charref = tokenize_charref(data, d.inc_col());

                v[i++] = charref.value;
                continue;
            }

            if (c === start_quote) { // Found the closing quote
                return value(v.join(""), d.inc_col());
            }

            v[i++] = data[d.offset];

            d.inc_char(c);
        }
    }

    function tokenize_unquoted_attr_value(data, d) {
        let v = [], i=0, cont = true;

        while (cont) {
            let c = data.codePointAt(d.offset);

            if (c === undefined) {
                return value(v.join(""), d);
            }

            if (c === AMPERSAND) {
                let charref = tokenize_charref(data, d.inc_col());
                v[i++] = charref.value;
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
        if (is_html_tag(ltag)) return ltag;

        return tag;
    }

    function tokenize_attribute_name(name) {
        let lname = name.toLowerCase();
        if (is_html_attr(lname)) return lname;

        return name;
    }

    function tokenize_charref(data, d) {
        let column = d.column, line = d.line, offset = d.offset;

        try {
            return tokenize_charref1(data, d);
        } catch (err) {
            if (err !== "invalid_charref") throw err;

            // Reset the offset;
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

            if (c === undefined)
                throw "invalid_charref";

            if (is_whitespace(c) || c === QUOTE || c === SQUOTE || c === SLASH
                || c === LT || c === GT || c === AMPERSAND) {

                u = charref(data.slice(offsetStart, d.offset));
                if (u === null) {
                    // Not a charref, use as-is
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
        let cont=true;

        while (cont) {
            let c = data.codePointAt(d.offset);
            if (is_whitespace(c)) {
                d.inc_char(c);
            }

            cont = false;
        }
    }

    function is_whitespace(c) {
        return (c === SPACE) || (c === NEWLINE) || (c === TAB) || (c === RETURN);
    }

    function is_start_literal_safe(c) {
        return (c >= CHAR_A && c <= CHAR_Z)
            || (c >= CHAR_a && c <= CHAR_z)
            || (c === UNDERSCORE);
    }

    function is_html_tag(tag) {
        return html_tags.hasOwnProperty(tag);
    }

    function is_html_attr(name) {
        return html_attrs.hasOwnProperty(name);
    }

    function is_singleton(tag) {
        let v = html_tags[tag];

        if (v === undefined)
            return false;

        return v;
    }

    function value(val, line, column, offset) {
        return { value: val, line: line, column: column, offset: offset };
    }

    // When an element is in the table it is a html tag, the boolean value
    // indicates wether the element is a sintleton tag.
    let html_tags = {
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

    let html_attrs = {
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

    /**
     * Convert a decimal, hex, or html entity to a unicode char
     * Returns undefined on failure.
     *
     * Assumes the code can use document. Does not work inside a worker.
     */
    let charref = (function () {
        let element = document.createElement("div");

        const cache = {};

        return function (raw) {
            let d = cache[raw];
            if(d !== undefined) return d;

            if (raw.slice(-1) === ";") {
                element.innerHTML = "&" + raw;
            } else {
                element.innerHTML = "&" + raw + ";";
            }

            d = element.textContent;
            element.innerHTML = "";

            if (Array.from(d).length !== 1) {
                d = null; // This was not a charref;
            }

            cache[raw] = d;
            return d;
        };
    })();

    cotonic.tokenizer = cotonic.tokenizer || {};
    cotonic.tokenizer.tokens = tokens;
    cotonic.tokenizer.charref = charref;
}(cotonic));
