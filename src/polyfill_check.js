"use strict";

(function(global) {
    function hasAllFeatures() {
        return global.Promise && global.fetch && String.prototype.codePointAt;
    }

    function loadScript(src, done) {
        if(document) {
            var js = document.createElement('script');
            js.src = src;
            js.onload = done.bind(null, {needed: true, loaded: true});
            js.onerror = function() {
                done({needed: true,
                    loaded: false,
                    error: new Error('Failed to load script ' + src)
                });
            };
            document.head.appendChild(js);
        } else {
            importScript(src);
            done({needed: true, loaded: true});
        }
    }

    if(hasAllFeatures()) {
        main.bind(global)({needed: false});
    } else {
        loadScript("https://polyfill.io/v3/polyfill.min.js?features=Promise%2Cfetch%2CString.prototype.codePointAt",
            main.bind(global));
    }

    function main(polyfillStatus) {
        // SPLIT HERE
        global.cotonic = cotonic;
    }

}(this))
