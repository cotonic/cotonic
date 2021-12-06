//
// Event Tests.
//

"use strict";

QUnit.test("cotonic.event has resolved cotonic.ready promise", function(assert) {
    assert.timeout(1000);
    let done = assert.async();

    cotonic.ready.then(
        function() {
            assert.ok(true);
            done();
        }
    );
});

QUnit.test("cotonic.event has fired cotonic-ready event", function(assert) {
    assert.equal(cotonicReadyFired, true);
});

