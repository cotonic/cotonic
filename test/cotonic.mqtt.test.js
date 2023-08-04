//
// mqtt topic match tests
//

import * as mqtt from "/src/cotonic.mqtt.js";

QUnit.test("matches() supports patterns with no wildcards", function (assert) {
    assert.ok(mqtt.matches("foo/bar/baz", "foo/bar/baz"), "Matched topic");
});

QUnit.test("matches() doesn't match different topics", function (assert) {
    assert.notOk(mqtt.matches("foo/bar/baz", "baz/bar/foo"), "Didn't match topic");
});

QUnit.test("matches() supports patterns with # at the beginning", function (assert) {
    assert.ok(mqtt.matches("#", "foo/bar/baz"), "Matched topic");
});

QUnit.test("matches() supports patterns with # at the end", function (assert) {
    assert.ok(mqtt.matches("foo/#", "foo/bar/baz"), "Matched topic");
});

QUnit.test("matches() supports patterns with # at the end and topic has no children", function (assert) {
    assert.ok(mqtt.matches("foo/bar/#", "foo/bar"), "Matched childless topic");
});

QUnit.test("matches() doesn't support # wildcards with more after them", function (assert) {
    assert.notOk(mqtt.matches("#/bar/baz", "foo/bar/baz"), "Didn't match topic");
});

QUnit.test("matches() supports patterns with + at the beginning", function (assert) {
    assert.ok(mqtt.matches("+/bar/baz", "foo/bar/baz"), "Matched topic");
});

QUnit.test("matches() supports patterns with + at the end", function (assert) {
    assert.ok(mqtt.matches("foo/bar/+", "foo/bar/baz"), "Matched topic");
});

QUnit.test("matches() supports patterns with + in the middle", function (assert) {
    assert.ok(mqtt.matches("foo/+/baz", "foo/bar/baz"), "Matched topic");
});

QUnit.test("matches() supports patterns multiple wildcards", function (assert) {
    assert.ok(mqtt.matches("foo/+/#", "foo/bar/baz"), "Matched topic");
});

QUnit.test("matches() supports named wildcards", function (assert) {
    assert.ok(mqtt.matches("foo/+something/#else", "foo/bar/baz"), "Matched topic");
});

QUnit.test("matches() supports leading slashes", function (assert) {
    assert.ok(mqtt.matches("/foo/bar", "/foo/bar"), "Matched topic");
    assert.notOk(mqtt.matches("/foo/bar", "/bar/foo"), "Didn't match invalid topic");
});

QUnit.test("extract() returns empty object of there's nothing to extract", function (assert) {
    assert.deepEqual(mqtt.extract("foo/bar/baz", "foo/bar/baz"), {}, "Extracted empty object");
});

QUnit.test("extract() returns empty object if wildcards don't have label", function (assert) {
    assert.deepEqual(mqtt.extract("foo/+/#", "foo/bar/baz"), {}, "Extracted empty object");
});

QUnit.test("extract() returns object with an array for # wildcard", function (assert) {
    assert.deepEqual(mqtt.extract("foo/#something", "foo/bar/baz"), {
	something: ["bar", "baz"]
    }, "Extracted param");
});

QUnit.test("extract() returns object with a string for + wildcard", function (assert) {
    assert.deepEqual(mqtt.extract("foo/+hello/+world", "foo/bar/baz"), {
	hello: "bar",
	world: "baz"
    }, "Extracted params");
});

QUnit.test("extract() parses params from all wildcards", function (assert) {
    assert.deepEqual(mqtt.extract("+hello/+world/#wow", "foo/bar/baz/fizz"), {
	hello: "foo",
	world: "bar",
	wow: ["baz", "fizz"]
    }, "Extracted params");
});

QUnit.test("exec() returns null if it doesn't match", function (assert) {
    assert.equal(mqtt.exec("hello/world", "foo/bar/baz"), null, "Got null");
});

QUnit.test("exec() returns params if they can be parsed", function(assert){
    assert.deepEqual(mqtt.exec("foo/+hello/#world", "foo/bar/baz"), {
	hello: "bar",
	world: ["baz"]
    }, "Extracted params");
});

QUnit.test("fill() fills in pattern with both types of wildcards", function(assert){
    assert.deepEqual(mqtt.fill("foo/+hello/#world", {
	hello: "Hello",
	world: ["the", "world", "wow"],
    }), "foo/Hello/the/world/wow", "Filled in params");
});

QUnit.test("fill() fills missing + params with undefined", function(assert){
    assert.deepEqual(mqtt.fill("foo/+hello", {}), "foo/undefined", "Filled in params");
});

QUnit.test("fill() ignores empty # params", function(assert){
    assert.deepEqual( mqtt.fill("foo/#hello", {}), "foo", "Filled in params");
});

QUnit.test("fill() ignores non-named # params", function (assert) {
    assert.deepEqual(mqtt.fill("foo/#", {}), "foo", "Filled in params");
});

QUnit.test("fill() uses `undefined` for non-named + params", function(assert){
    assert.deepEqual(mqtt.fill("foo/+", {}), "foo/undefined", "Filled in params");
});

QUnit.test("remove_named_wildcards() keeps patterns without wildcards intact", function(assert) {
    assert.deepEqual(mqtt.remove_named_wildcards("foo"), "foo", "No wildcards");
    assert.deepEqual(mqtt.remove_named_wildcards("foo/bar"), "foo/bar", "No wildcards");
    assert.deepEqual(mqtt.remove_named_wildcards("/a/b/c"), "/a/b/c", "No wildcards");
});

QUnit.test("remove_named_wildcards() without named wildcards", function(assert) {
    assert.deepEqual(mqtt.remove_named_wildcards("foo/+/bar"), "foo/+/bar", "Single level wildcard");
    assert.deepEqual(mqtt.remove_named_wildcards("+/foo/bar"), "+/foo/bar", "Single level wildcard");
    assert.deepEqual(mqtt.remove_named_wildcards("+/+/bar"), "+/+/bar", "Single level wildcard");
    assert.deepEqual(mqtt.remove_named_wildcards("+/+/#"), "+/+/#", "Single and multilevel wildcards");
    assert.deepEqual(mqtt.remove_named_wildcards("#"), "#", "Multi level wildcard");
});

QUnit.test("remove_named_wildcards() with named wildcards", function(assert) {
    assert.deepEqual(mqtt.remove_named_wildcards("foo/+a/bar"), "foo/+/bar", "Single level wildcard");
    assert.deepEqual(mqtt.remove_named_wildcards("+a/foo/bar"), "+/foo/bar", "Single level wildcard");
    assert.deepEqual(mqtt.remove_named_wildcards("+a/+b/bar"), "+/+/bar", "Single level wildcard");
    assert.deepEqual(mqtt.remove_named_wildcards("+a/+b/#"), "+/+/#", "Single and multilevel wildcards");
    assert.deepEqual(mqtt.remove_named_wildcards("#a"), "#", "Multi level wildcard");
});
