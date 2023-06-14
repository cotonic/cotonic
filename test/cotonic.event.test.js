//
// Event Tests.
//

import { ready } from "cotonic";
import * as event from "cotonic.event";

QUnit.test("cotonic.event has resolved cotonic.ready promise", function(assert) {
    assert.timeout(1000);
    let done = assert.async();

    ready.then(
        function() {
            assert.ok(true);
            done();
        }
    );
});

QUnit.test("cotonic.event has fired cotonic-ready event", function(assert) {
    assert.equal(cotonicReadyFired, true);
});

