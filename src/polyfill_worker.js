
(function(global) {
    if(!(global.Promise && global.fetch && String.prototype.startsWith && String.prototype.codePointAt)) {
        const src = "https://polyfill.io/v3/polyfill.min.js?features=String.prototype.startsWith%2CString.prototype.codePointAt%2cPromise%2cObject.assign"
        importScripts(src);
    } 
}(this));

