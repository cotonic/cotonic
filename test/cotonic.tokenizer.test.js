//
// HTML Tokenizer Tests.
//

"use strict";

var tokenizer = cotonic.tokenizer;

QUnit.test("Tokenize empty strings", function(assert) {
    assert.deepEqual(tokenizer.tokens(""), [], "Parsing nothing");
});
        
QUnit.test("Tokenize start tokens", function(assert) {
    assert.deepEqual(tokenizer.tokens("<foo>"), [{type: "open", tag: "foo", attributes: []}] );
    assert.deepEqual( tokenizer.tokens("<FOO>"), [{type: "open", tag: "FOO", attributes: []}]);
    assert.deepEqual( tokenizer.tokens("<span>"), [{type: "open", tag: "span", attributes: []}]);
    
    assert.deepEqual(tokenizer.tokens("<SPAN>"), [{type: "open", tag: "span", attributes: []}], "HTML elements should be lowered");
    
    assert.deepEqual(tokenizer.tokens("<p><p><p>"), [{type: "open", tag: "p", attributes: []},
        {type: "open", tag: "p", attributes: []},
        {type: "open", tag: "p", attributes: []} ], "Three tokens");
        
    assert.deepEqual([{type: "void", tag: "img", attributes: []}], tokenizer.tokens("<img>"), "Self closing element");
    
    assert.deepEqual([{type: "void", tag: "i", attributes: []}], tokenizer.tokens("<i/>"), "Element closed");
}); 

        
QUnit.test("Parsing start tokens with attributes", function(assert) {
    assert.deepEqual(tokenizer.tokens("<foo a>"), [{type: "open", tag: "foo", attributes: ["a", "a"]}], 
        "Single attribute, no equals");
    assert.deepEqual(tokenizer.tokens("<foo a b>"), [{type: "open", tag: "foo", attributes: ["a", "a", "b", "b"]}], 
         "Two attribute, no equals");
    assert.deepEqual(tokenizer.tokens("<foo \n\n\na   \t\tb>"), [{type: "open", tag: "foo", attributes: ["a", "a", "b", "b"]}], 
        "Two attribute, no equals, lots of whitespace");
        
     assert.deepEqual(tokenizer.tokens("<foo a=b>"), [{type: "open", tag: "foo", attributes: ["a", "b"]}], 
        "Unquoted attribute");
     assert.deepEqual(tokenizer.tokens("<foo foo=bar>"), [{type: "open", tag: "foo", attributes: ["foo", "bar"]}], 
        "Unquoted attribute");
        
     assert.deepEqual(tokenizer.tokens('<foo a="b">'), [{type: "open", tag: "foo", attributes: ["a", "b"]}], 
        "Double quoted attribute");
        
     assert.deepEqual(tokenizer.tokens("<foo a='b'>"), [{type: "open", tag: "foo", attributes: ["a", "b"]}], 
        "Single quoted attribute");
        
     assert.deepEqual(tokenizer.tokens("<foo foo=bar baz=\"boo\" spam='eggs' >"), 
         [{type: "open", tag: "foo", attributes: ["foo", "bar", "baz", "boo", "spam", "eggs"]}], 
        "All tokens together");
        
      assert.deepEqual(tokenizer.tokens("<foo foo=bar baz=\"boo\" spam='eggs' />"), 
         [{type: "void", tag: "foo", attributes: ["foo", "bar", "baz", "boo", "spam", "eggs"]}], 
        "Together, and self closing");
        
      assert.deepEqual(tokenizer.tokens("<foo foo='bar' baz=\"boo\" spam=eggs/>"), 
         [{type: "void", tag: "foo", attributes: ["foo", "bar", "baz", "boo", "spam", "eggs"]}], 
        "Together, and self closing");
        
      assert.deepEqual(tokenizer.tokens("<foo foo='\nbar' baz=\"boo\" spam=eggs/>"), 
         [{type: "void", tag: "foo", attributes: ["foo", "\nbar", "baz", "boo", "spam", "eggs"]}], 
        "Together, and self closing");

      assert.deepEqual(tokenizer.tokens('<foo a="a &amp; b">'), 
              [{type: "open", tag: "foo", attributes: ["a", "a & b"]}], 
              "Attribute with charref");

      assert.deepEqual(tokenizer.tokens('<foo a="a &#x1f4a9; b">'), 
              [{type: "open", tag: "foo", attributes: ["a", "a 💩 b"]}], 
              "Attribute with numeric charref");

      assert.deepEqual(tokenizer.tokens('<foo a="a &#x1f4a9 b">'), 
              [{type: "open", tag: "foo", attributes: ["a", "a 💩 b"]}], 
              "Attribute with numeric charref, missing colon");

      assert.deepEqual(tokenizer.tokens('<foo a="a &invalid; b">'), 
              [{type: "open", tag: "foo", attributes: ["a", "a &invalid; b"]}], 
              "Attribute invalid charref");

      assert.deepEqual(tokenizer.tokens('<foo a="a & b">'), 
              [{type: "open", tag: "foo", attributes: ["a", "a & b"]}], 
              "Attribute invalid charref");

      assert.deepEqual(tokenizer.tokens('<foo a=a&b>'), 
              [{type: "open", tag: "foo", attributes: ["a", "a&b"]}], 
              "Attribute invalid charref");

      assert.deepEqual(tokenizer.tokens('<foo a=a&gt;b>'), 
              [{type: "open", tag: "foo", attributes: ["a", "a>b"]}], 
              "Unquoted attribute with charref");

     assert.deepEqual(tokenizer.tokens('<DD ID="foo">'),
              [{type: "open", tag: "dd", attributes: ["id", "foo"]}],
              "Uppercase html tags with uppercase html attributes");
});


QUnit.test("Close tags", function(assert) {
    assert.deepEqual(tokenizer.tokens('</foo>'), 
            [{type: "close", tag: "foo" }], "Single close tag");
    assert.deepEqual(tokenizer.tokens('</foo></bar>'), 
            [{type: "close", tag: "foo"}, {type: "close", tag: "bar"} ], 
            "Two close tags");
    assert.deepEqual(tokenizer.tokens('</foo></bar></baz>'), 
            [{type: "close", tag: "foo"}, {type: "close", tag: "bar"}, {type: "close", tag: "baz"} ], 
            "Three close tags");
    assert.deepEqual(tokenizer.tokens('</foo      ></bar  ></baz>'), 
            [{type: "close", tag: "foo"}, {type: "close", tag: "bar"}, {type: "close", tag: "baz"} ], 
            "Three close tags, with whitespace");
}),

        
QUnit.test("Processing Instructions", function(assert) {
    assert.deepEqual(tokenizer.tokens("<?xml:namespace prefix=\"o\" ns=\"urn:schemas-microsoft-com:office:office\"?>"), 
        [{type: "pi", tag: "xml:namespace", 
            attributes: ["prefix", "o", "ns", "urn:schemas-microsoft-com:office:office"]}], "XML processing instruction");
            
    assert.deepEqual(tokenizer.tokens("<foo><?xml:namespace prefix=\"o\" ns=\"urn:schemas-microsoft-com:office:office\"?></foo>"), 
        [{type: "open", tag: "foo", attributes: []}, 
         {type: "pi", tag: "xml:namespace", 
            attributes: ["prefix", "o", "ns", "urn:schemas-microsoft-com:office:office"]},
         {type: "close", tag: "foo"}], "XML processing instruction surrounded by tags");
})

QUnit.test("Data", function(assert) {
    assert.deepEqual(tokenizer.tokens("data"), [{type: "text", data: "data"}], "Simple data");
    assert.deepEqual(tokenizer.tokens("&lt;"), [{type: "text", data: "<"}], "A charref");
    assert.deepEqual(tokenizer.tokens("data < DATA"), 
            [{type: "text", data: "data "}, {type: "text", data: "< DATA"}], 
            "Not even html");
});
        
QUnit.test("Entity refs", function(assert) {
     assert.equal(tokenizer.charref("amp;"), "&");
     assert.equal(tokenizer.charref("amp"), "&");
     assert.equal(tokenizer.charref("yopf;").codePointAt(0), 0x1D56A);
     assert.equal(tokenizer.charref("yopf").codePointAt(0), 0x1D56A);
     assert.equal(tokenizer.charref("wreath").codePointAt(0), 0x02240);
     assert.equal(tokenizer.charref("yen;"), "¥");
     assert.equal(tokenizer.charref("yen"), "¥");
});

QUnit.test("Doctypes", function(assert) {
    assert.deepEqual(tokenizer.tokens("<!DOCTYPE html>"), 
            [{type: "doctype", attributes: ["html"]}], "Simple html doctype");
    assert.deepEqual(tokenizer.tokens("<!DOCTYPE todo \"quotes\">"), 
            [{type: "doctype", attributes: ["todo", "quotes"]}], "Simple html doctype");
    assert.deepEqual(tokenizer.tokens("<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.0 Transitional//EN\" \"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd\">"), 
            [{type: "doctype", attributes: ["html", "PUBLIC", 
                "-//W3C//DTD XHTML 1.0 Transitional//EN", 
                "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"]}], "Longer html doctype");
});
        
QUnit.test("Textarea and script tags", function(assert) {
    assert.deepEqual(tokenizer.tokens("<script></script>"), 
              [ {tag: "script", attributes: [], type: "open" },
                {tag: "script",  type: "close"}], "Empty script tag");

    assert.deepEqual(tokenizer.tokens("<script>test < 10\n\n</script>"), 
      [ {tag: "script", attributes: [], type: "open" },
        {data: "test < 10\n\n", type: "text" },
        {tag: "script",  type: "close"}], "Script tag with formula");
            
    assert.deepEqual(tokenizer.tokens("<textarea>test < 10</textarea>"),
        [ {tag: "textarea", attributes: [], type: "open" },
          {data: "test < 10", type: "text" },
          {tag: "textarea",  type: "close"}], 
            [], "Textarea with formula");
            
    assert.deepEqual(tokenizer.tokens("<TEXTAREA></tExTArea><img />"),
        [ {tag: "textarea", attributes: [], type: "open" },
          {tag: "textarea",  type: "close"},
          {tag: "img", attributes: [], type: "void"}
        ], "Textarea with mixed case tags");
});

QUnit.test("Comments", function(assert) {
    assert.deepEqual(tokenizer.tokens("<!-- comment -->"), 
            [{type: "comment", data: " comment "}], "Comment");
    assert.deepEqual(tokenizer.tokens("<!-- \n\ncomment\n\n -->"), 
            [{type: "comment", data: " \n\ncomment\n\n "}], "Comment with newlines");
});


QUnit.test("Missing closing '>' at the end of input", function(assert) {
    assert.deepEqual(tokenizer.tokens('</foo'), 
            [{type: "close", tag: "foo" }], "Close tag with a missing '>'");
    assert.deepEqual(tokenizer.tokens('<foo'), 
            [{type: "open", tag: "foo", attributes: []}], "Start tag with a missing '>'");
    assert.deepEqual(tokenizer.tokens('<foo /'), 
            [{type: "void", tag: "foo", attributes: []}], "Void tag with a missing '>'");
});

