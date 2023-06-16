
// HTML Worker Tests.
//

import * as cotonic from "cotonic";

QUnit.test("Spawn workers", function(assert) {
    var worker_id1 = cotonic.spawn("http://localhost:6227/test/hello-page-worker.js", ["worker_id1"]);
    var worker_id2 = cotonic.spawn("http://localhost:6227/test/hello-page-worker.js", ["worker_id2"]);
    
    assert.equal(worker_id1 == worker_id2, false, "The workers should have differents wids");
});

