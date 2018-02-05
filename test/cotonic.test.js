//
// HTML Worker Tests.
//

"use strict";

QUnit.test("Spawn workers", function(assert) {
    var worker_id1 = cotonic.spawn("test-worker.js");
    assert.deepEqual(worker_id1, 1,  "The first worker spawned has id 1");

    var worker_id2 = cotonic.spawn("test-worker.js");
    assert.deepEqual(worker_id2, 2,  "The second worker spawned has id 2");
});
