
(function(global) {
    if(!(global.Promise && global.fetch && String.prototype.startsWith && String.prototype.codePointAt)) {
        //const src = https://polyfill.io/v3/polyfill.min.js?features=String.prototype.startsWith%2CString.prototype.codePointAt%2cPromise
        const src = "https://polyfill.io/v3/polyfill.js?features=String.prototype.startsWith%2CString.prototype.codePointAt%2CPromise"

        if(typeof global.document !== "undefined") {
            const js = document.createElement('script');

            js.type = "text/javascript";
            js.async = false;
            js.src = src;
            document.head.appendChild(js);
        } else {
            importScripts(src);
        }
    } 
}(this));

