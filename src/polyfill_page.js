
(function(global) {
    if(!(global.Promise && global.fetch && String.prototype.startsWith && String.prototype.codePointAt)) {
        loadScript("https://polyfill.io/v3/polyfill.min.js?features=String.prototype.startsWith%2CString.prototype.codePointAt%2Cfetch%2CPromise%2CObject.assign");
    }

    if(!(global.TextEncoder && global.TextDecoder)) {
        loadScript("https://unpkg.com/fast-text-encoding@1.0.0/text.min.js");
    }

    if(!Uint8Array.prototype.slice) {
        Object.defineProperty(Uint8Array.prototype, 'slice', {
            value: function (begin, end)
            {
                return new Uint8Array(Array.prototype.slice.call(this, begin, end));
            }
        });
    }

    function loadScript(src) {
        const js = document.createElement('script');
        js.type = "text/javascript";
        js.async = false;
        js.src = src;
        js.crossorigin = 'anonymous';
        document.head.appendChild(js);
    }
}(this));

