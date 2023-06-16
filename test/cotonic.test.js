
// HTML Worker Tests.
//

import * as cotonic from "cotonic";

QUnit.test("Spawn workers", function(assert) {
    var worker_id1 = cotonic.spawn("http://localhost:6227/test/hello-page-worker.js", ["worker_id1"]);
    var worker_id2 = cotonic.spawn("http://localhost:6227/test/hello-page-worker.js", ["worker_id2"]);
    
    assert.equal(worker_id1 == worker_id2, false, "The workers should have differents wids");
});

QUnit.test("Send a message to a worker, and receive message back.", function(assert) {
    var done = assert.async();
    
    cotonic.receive(function(msg, msg_wid) {
	if(msg_wid != wid) return;

	assert.equal(msg, "Hello page!", "Got hello page!");
	done();
    });

    var wid = cotonic.spawn("http://localhost:6227/test/hello-page-worker.js", ["worker"]);
    console.log(wid);
    cotonic.send(wid, "Hello worker!");
    console.log("sent hello");
});

QUnit.test("Spawn a worker and pass argumenst, and receive message back.", function(assert) {
    var done = assert.async();

    cotonic.receive(function(msg, msg_wid) {
	if(msg_wid != wid) return;

	assert.equal(msg, "Hello page, I'm Alice!", "Expected a response with a name");
	done();
    });

    var wid = cotonic.spawn("http://localhost:6227/test/hello-page-worker.js", ["Alice"]);
    cotonic.send(wid, "Hello worker!");
});
