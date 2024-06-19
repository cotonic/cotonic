//
// HTML Form serialize tests.
//

import "/src-idom/index-bundle.js";

import "/src/default_broker_init.js";
import * as ui from "/src/cotonic.ui.js";

QUnit.test("Form serialize test", function(assert) {

    let form = document.getElementById("form-a");
    let s = ui.serializeFormToList(form);

    assert.deepEqual([
            [ "t1", "" ],
            [ "v[]", "2" ],
            [ "v[]", "3" ],
            [ "v[]", "4" ],
            [ "t2", "" ],
            [ "v[]", "1" ],
            [ "t3", "" ],
            [ "v[]", "" ],
            [ "t4", "" ],
            [ "v[]", "" ]
        ],
        s);

    form = document.getElementById("form-b");
    s = ui.serializeFormToList(form);

    assert.deepEqual([
            [ "t1", "" ],
            [ "v[]", "2" ],
            [ "v[]", "3" ],
            [ "v[]", "4" ],
            [ "t2", "t2" ],
            [ "v[]", "1" ],
            [ "t3", "" ],
            [ "v[]", "" ],
            [ "t4", "t4" ],
            [ "v[]", "3" ]
        ],
        s);

    assert.ok(true);
});

