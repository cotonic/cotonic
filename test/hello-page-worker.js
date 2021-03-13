//
//

let my_name;

function on_init(name) {
    my_name = name;
}

self.onmessage = function(msg) {
    if(my_name) {
        postMessage("Hello page, I'm " + my_name + "!");
    } else {
        postMessage("Hello page!");
    }
}
