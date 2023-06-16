//
//

let my_name;

self.on_init = function(name) {
    console.log("on-init", name);
    my_name = name;
}

self.onmessage = function(msg) {
    console.log(msg);

    if(my_name) {
        postMessage("Hello page, I'm " + my_name + "!");
    } else {
        postMessage("Hello page!");
    }
}

console.log("Worker initialized", self.onmessage);

