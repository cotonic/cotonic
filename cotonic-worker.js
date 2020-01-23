/**
 * (c) 2018 Taylor Hakes
 * https://github.com/taylorhakes/promise-polyfill
 * License: MIT
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (factory());
}(this, (function () { 'use strict';

/**
 * @this {Promise}
 */
function finallyConstructor(callback) {
  var constructor = this.constructor;
  return this.then(
    function(value) {
      return constructor.resolve(callback()).then(function() {
        return value;
      });
    },
    function(reason) {
      return constructor.resolve(callback()).then(function() {
        return constructor.reject(reason);
      });
    }
  );
}

// Store setTimeout reference so promise-polyfill will be unaffected by
// other code modifying setTimeout (like sinon.useFakeTimers())
var setTimeoutFunc = setTimeout;

function noop() {}

// Polyfill for Function.prototype.bind
function bind(fn, thisArg) {
  return function() {
    fn.apply(thisArg, arguments);
  };
}

/**
 * @constructor
 * @param {Function} fn
 */
function Promise(fn) {
  if (!(this instanceof Promise))
    throw new TypeError('Promises must be constructed via new');
  if (typeof fn !== 'function') throw new TypeError('not a function');
  /** @type {!number} */
  this._state = 0;
  /** @type {!boolean} */
  this._handled = false;
  /** @type {Promise|undefined} */
  this._value = undefined;
  /** @type {!Array<!Function>} */
  this._deferreds = [];

  doResolve(fn, this);
}

function handle(self, deferred) {
  while (self._state === 3) {
    self = self._value;
  }
  if (self._state === 0) {
    self._deferreds.push(deferred);
    return;
  }
  self._handled = true;
  Promise._immediateFn(function() {
    var cb = self._state === 1 ? deferred.onFulfilled : deferred.onRejected;
    if (cb === null) {
      (self._state === 1 ? resolve : reject)(deferred.promise, self._value);
      return;
    }
    var ret;
    try {
      ret = cb(self._value);
    } catch (e) {
      reject(deferred.promise, e);
      return;
    }
    resolve(deferred.promise, ret);
  });
}

function resolve(self, newValue) {
  try {
    // Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
    if (newValue === self)
      throw new TypeError('A promise cannot be resolved with itself.');
    if (
      newValue &&
      (typeof newValue === 'object' || typeof newValue === 'function')
    ) {
      var then = newValue.then;
      if (newValue instanceof Promise) {
        self._state = 3;
        self._value = newValue;
        finale(self);
        return;
      } else if (typeof then === 'function') {
        doResolve(bind(then, newValue), self);
        return;
      }
    }
    self._state = 1;
    self._value = newValue;
    finale(self);
  } catch (e) {
    reject(self, e);
  }
}

function reject(self, newValue) {
  self._state = 2;
  self._value = newValue;
  finale(self);
}

function finale(self) {
  if (self._state === 2 && self._deferreds.length === 0) {
    Promise._immediateFn(function() {
      if (!self._handled) {
        Promise._unhandledRejectionFn(self._value);
      }
    });
  }

  for (var i = 0, len = self._deferreds.length; i < len; i++) {
    handle(self, self._deferreds[i]);
  }
  self._deferreds = null;
}

/**
 * @constructor
 */
function Handler(onFulfilled, onRejected, promise) {
  this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
  this.onRejected = typeof onRejected === 'function' ? onRejected : null;
  this.promise = promise;
}

/**
 * Take a potentially misbehaving resolver function and make sure
 * onFulfilled and onRejected are only called once.
 *
 * Makes no guarantees about asynchrony.
 */
function doResolve(fn, self) {
  var done = false;
  try {
    fn(
      function(value) {
        if (done) return;
        done = true;
        resolve(self, value);
      },
      function(reason) {
        if (done) return;
        done = true;
        reject(self, reason);
      }
    );
  } catch (ex) {
    if (done) return;
    done = true;
    reject(self, ex);
  }
}

Promise.prototype['catch'] = function(onRejected) {
  return this.then(null, onRejected);
};

Promise.prototype.then = function(onFulfilled, onRejected) {
  // @ts-ignore
  var prom = new this.constructor(noop);

  handle(this, new Handler(onFulfilled, onRejected, prom));
  return prom;
};

Promise.prototype['finally'] = finallyConstructor;

Promise.all = function(arr) {
  return new Promise(function(resolve, reject) {
    if (!arr || typeof arr.length === 'undefined')
      throw new TypeError('Promise.all accepts an array');
    var args = Array.prototype.slice.call(arr);
    if (args.length === 0) return resolve([]);
    var remaining = args.length;

    function res(i, val) {
      try {
        if (val && (typeof val === 'object' || typeof val === 'function')) {
          var then = val.then;
          if (typeof then === 'function') {
            then.call(
              val,
              function(val) {
                res(i, val);
              },
              reject
            );
            return;
          }
        }
        args[i] = val;
        if (--remaining === 0) {
          resolve(args);
        }
      } catch (ex) {
        reject(ex);
      }
    }

    for (var i = 0; i < args.length; i++) {
      res(i, args[i]);
    }
  });
};

Promise.resolve = function(value) {
  if (value && typeof value === 'object' && value.constructor === Promise) {
    return value;
  }

  return new Promise(function(resolve) {
    resolve(value);
  });
};

Promise.reject = function(value) {
  return new Promise(function(resolve, reject) {
    reject(value);
  });
};

Promise.race = function(values) {
  return new Promise(function(resolve, reject) {
    for (var i = 0, len = values.length; i < len; i++) {
      values[i].then(resolve, reject);
    }
  });
};

// Use polyfill for setImmediate for performance gains
Promise._immediateFn =
  (typeof setImmediate === 'function' &&
    function(fn) {
      setImmediate(fn);
    }) ||
  function(fn) {
    setTimeoutFunc(fn, 0);
  };

Promise._unhandledRejectionFn = function _unhandledRejectionFn(err) {
  if (typeof console !== 'undefined' && console) {
    console.warn('Possible Unhandled Promise Rejection:', err); // eslint-disable-line no-console
  }
};

/** @suppress {undefinedVars} */
var globalNS = (function() {
  // the only reliable means to get the global object is
  // `Function('return this')()`
  // However, this causes CSP violations in Chrome apps.
  if (typeof self !== 'undefined') {
    return self;
  }
  if (typeof window !== 'undefined') {
    return window;
  }
  if (typeof global !== 'undefined') {
    return global;
  }
  throw new Error('unable to locate global object');
})();

if (!('Promise' in globalNS)) {
  globalNS['Promise'] = Promise;
} else if (!globalNS.Promise.prototype['finally']) {
  globalNS.Promise.prototype['finally'] = finallyConstructor;
}

})));/**
 * (c) 2018 GitHub Inc.
 * https://github.com/github/fetch
 * License: MIT
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (factory((global.WHATWGFetch = {})));
}(this, (function (exports) { 'use strict';

  var support = {
    searchParams: 'URLSearchParams' in self,
    iterable: 'Symbol' in self && 'iterator' in Symbol,
    blob:
      'FileReader' in self &&
      'Blob' in self &&
      (function() {
        try {
          new Blob();
          return true
        } catch (e) {
          return false
        }
      })(),
    formData: 'FormData' in self,
    arrayBuffer: 'ArrayBuffer' in self
  };

  function isDataView(obj) {
    return obj && DataView.prototype.isPrototypeOf(obj)
  }

  if (support.arrayBuffer) {
    var viewClasses = [
      '[object Int8Array]',
      '[object Uint8Array]',
      '[object Uint8ClampedArray]',
      '[object Int16Array]',
      '[object Uint16Array]',
      '[object Int32Array]',
      '[object Uint32Array]',
      '[object Float32Array]',
      '[object Float64Array]'
    ];

    var isArrayBufferView =
      ArrayBuffer.isView ||
      function(obj) {
        return obj && viewClasses.indexOf(Object.prototype.toString.call(obj)) > -1
      };
  }

  function normalizeName(name) {
    if (typeof name !== 'string') {
      name = String(name);
    }
    if (/[^a-z0-9\-#$%&'*+.^_`|~]/i.test(name)) {
      throw new TypeError('Invalid character in header field name')
    }
    return name.toLowerCase()
  }

  function normalizeValue(value) {
    if (typeof value !== 'string') {
      value = String(value);
    }
    return value
  }

  // Build a destructive iterator for the value list
  function iteratorFor(items) {
    var iterator = {
      next: function() {
        var value = items.shift();
        return {done: value === undefined, value: value}
      }
    };

    if (support.iterable) {
      iterator[Symbol.iterator] = function() {
        return iterator
      };
    }

    return iterator
  }

  function Headers(headers) {
    this.map = {};

    if (headers instanceof Headers) {
      headers.forEach(function(value, name) {
        this.append(name, value);
      }, this);
    } else if (Array.isArray(headers)) {
      headers.forEach(function(header) {
        this.append(header[0], header[1]);
      }, this);
    } else if (headers) {
      Object.getOwnPropertyNames(headers).forEach(function(name) {
        this.append(name, headers[name]);
      }, this);
    }
  }

  Headers.prototype.append = function(name, value) {
    name = normalizeName(name);
    value = normalizeValue(value);
    var oldValue = this.map[name];
    this.map[name] = oldValue ? oldValue + ', ' + value : value;
  };

  Headers.prototype['delete'] = function(name) {
    delete this.map[normalizeName(name)];
  };

  Headers.prototype.get = function(name) {
    name = normalizeName(name);
    return this.has(name) ? this.map[name] : null
  };

  Headers.prototype.has = function(name) {
    return this.map.hasOwnProperty(normalizeName(name))
  };

  Headers.prototype.set = function(name, value) {
    this.map[normalizeName(name)] = normalizeValue(value);
  };

  Headers.prototype.forEach = function(callback, thisArg) {
    for (var name in this.map) {
      if (this.map.hasOwnProperty(name)) {
        callback.call(thisArg, this.map[name], name, this);
      }
    }
  };

  Headers.prototype.keys = function() {
    var items = [];
    this.forEach(function(value, name) {
      items.push(name);
    });
    return iteratorFor(items)
  };

  Headers.prototype.values = function() {
    var items = [];
    this.forEach(function(value) {
      items.push(value);
    });
    return iteratorFor(items)
  };

  Headers.prototype.entries = function() {
    var items = [];
    this.forEach(function(value, name) {
      items.push([name, value]);
    });
    return iteratorFor(items)
  };

  if (support.iterable) {
    Headers.prototype[Symbol.iterator] = Headers.prototype.entries;
  }

  function consumed(body) {
    if (body.bodyUsed) {
      return Promise.reject(new TypeError('Already read'))
    }
    body.bodyUsed = true;
  }

  function fileReaderReady(reader) {
    return new Promise(function(resolve, reject) {
      reader.onload = function() {
        resolve(reader.result);
      };
      reader.onerror = function() {
        reject(reader.error);
      };
    })
  }

  function readBlobAsArrayBuffer(blob) {
    var reader = new FileReader();
    var promise = fileReaderReady(reader);
    reader.readAsArrayBuffer(blob);
    return promise
  }

  function readBlobAsText(blob) {
    var reader = new FileReader();
    var promise = fileReaderReady(reader);
    reader.readAsText(blob);
    return promise
  }

  function readArrayBufferAsText(buf) {
    var view = new Uint8Array(buf);
    var chars = new Array(view.length);

    for (var i = 0; i < view.length; i++) {
      chars[i] = String.fromCharCode(view[i]);
    }
    return chars.join('')
  }

  function bufferClone(buf) {
    if (buf.slice) {
      return buf.slice(0)
    } else {
      var view = new Uint8Array(buf.byteLength);
      view.set(new Uint8Array(buf));
      return view.buffer
    }
  }

  function Body() {
    this.bodyUsed = false;

    this._initBody = function(body) {
      this._bodyInit = body;
      if (!body) {
        this._bodyText = '';
      } else if (typeof body === 'string') {
        this._bodyText = body;
      } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
        this._bodyBlob = body;
      } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
        this._bodyFormData = body;
      } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
        this._bodyText = body.toString();
      } else if (support.arrayBuffer && support.blob && isDataView(body)) {
        this._bodyArrayBuffer = bufferClone(body.buffer);
        // IE 10-11 can't handle a DataView body.
        this._bodyInit = new Blob([this._bodyArrayBuffer]);
      } else if (support.arrayBuffer && (ArrayBuffer.prototype.isPrototypeOf(body) || isArrayBufferView(body))) {
        this._bodyArrayBuffer = bufferClone(body);
      } else {
        throw new Error('unsupported BodyInit type')
      }

      if (!this.headers.get('content-type')) {
        if (typeof body === 'string') {
          this.headers.set('content-type', 'text/plain;charset=UTF-8');
        } else if (this._bodyBlob && this._bodyBlob.type) {
          this.headers.set('content-type', this._bodyBlob.type);
        } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
          this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
        }
      }
    };

    if (support.blob) {
      this.blob = function() {
        var rejected = consumed(this);
        if (rejected) {
          return rejected
        }

        if (this._bodyBlob) {
          return Promise.resolve(this._bodyBlob)
        } else if (this._bodyArrayBuffer) {
          return Promise.resolve(new Blob([this._bodyArrayBuffer]))
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as blob')
        } else {
          return Promise.resolve(new Blob([this._bodyText]))
        }
      };

      this.arrayBuffer = function() {
        if (this._bodyArrayBuffer) {
          return consumed(this) || Promise.resolve(this._bodyArrayBuffer)
        } else {
          return this.blob().then(readBlobAsArrayBuffer)
        }
      };
    }

    this.text = function() {
      var rejected = consumed(this);
      if (rejected) {
        return rejected
      }

      if (this._bodyBlob) {
        return readBlobAsText(this._bodyBlob)
      } else if (this._bodyArrayBuffer) {
        return Promise.resolve(readArrayBufferAsText(this._bodyArrayBuffer))
      } else if (this._bodyFormData) {
        throw new Error('could not read FormData body as text')
      } else {
        return Promise.resolve(this._bodyText)
      }
    };

    if (support.formData) {
      this.formData = function() {
        return this.text().then(decode)
      };
    }

    this.json = function() {
      return this.text().then(JSON.parse)
    };

    return this
  }

  // HTTP methods whose capitalization should be normalized
  var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT'];

  function normalizeMethod(method) {
    var upcased = method.toUpperCase();
    return methods.indexOf(upcased) > -1 ? upcased : method
  }

  function Request(input, options) {
    options = options || {};
    var body = options.body;

    if (input instanceof Request) {
      if (input.bodyUsed) {
        throw new TypeError('Already read')
      }
      this.url = input.url;
      this.credentials = input.credentials;
      if (!options.headers) {
        this.headers = new Headers(input.headers);
      }
      this.method = input.method;
      this.mode = input.mode;
      this.signal = input.signal;
      if (!body && input._bodyInit != null) {
        body = input._bodyInit;
        input.bodyUsed = true;
      }
    } else {
      this.url = String(input);
    }

    this.credentials = options.credentials || this.credentials || 'same-origin';
    if (options.headers || !this.headers) {
      this.headers = new Headers(options.headers);
    }
    this.method = normalizeMethod(options.method || this.method || 'GET');
    this.mode = options.mode || this.mode || null;
    this.signal = options.signal || this.signal;
    this.referrer = null;

    if ((this.method === 'GET' || this.method === 'HEAD') && body) {
      throw new TypeError('Body not allowed for GET or HEAD requests')
    }
    this._initBody(body);
  }

  Request.prototype.clone = function() {
    return new Request(this, {body: this._bodyInit})
  };

  function decode(body) {
    var form = new FormData();
    body
      .trim()
      .split('&')
      .forEach(function(bytes) {
        if (bytes) {
          var split = bytes.split('=');
          var name = split.shift().replace(/\+/g, ' ');
          var value = split.join('=').replace(/\+/g, ' ');
          form.append(decodeURIComponent(name), decodeURIComponent(value));
        }
      });
    return form
  }

  function parseHeaders(rawHeaders) {
    var headers = new Headers();
    // Replace instances of \r\n and \n followed by at least one space or horizontal tab with a space
    // https://tools.ietf.org/html/rfc7230#section-3.2
    var preProcessedHeaders = rawHeaders.replace(/\r?\n[\t ]+/g, ' ');
    preProcessedHeaders.split(/\r?\n/).forEach(function(line) {
      var parts = line.split(':');
      var key = parts.shift().trim();
      if (key) {
        var value = parts.join(':').trim();
        headers.append(key, value);
      }
    });
    return headers
  }

  Body.call(Request.prototype);

  function Response(bodyInit, options) {
    if (!options) {
      options = {};
    }

    this.type = 'default';
    this.status = options.status === undefined ? 200 : options.status;
    this.ok = this.status >= 200 && this.status < 300;
    this.statusText = 'statusText' in options ? options.statusText : 'OK';
    this.headers = new Headers(options.headers);
    this.url = options.url || '';
    this._initBody(bodyInit);
  }

  Body.call(Response.prototype);

  Response.prototype.clone = function() {
    return new Response(this._bodyInit, {
      status: this.status,
      statusText: this.statusText,
      headers: new Headers(this.headers),
      url: this.url
    })
  };

  Response.error = function() {
    var response = new Response(null, {status: 0, statusText: ''});
    response.type = 'error';
    return response
  };

  var redirectStatuses = [301, 302, 303, 307, 308];

  Response.redirect = function(url, status) {
    if (redirectStatuses.indexOf(status) === -1) {
      throw new RangeError('Invalid status code')
    }

    return new Response(null, {status: status, headers: {location: url}})
  };

  exports.DOMException = self.DOMException;
  try {
    new exports.DOMException();
  } catch (err) {
    exports.DOMException = function(message, name) {
      this.message = message;
      this.name = name;
      var error = Error(message);
      this.stack = error.stack;
    };
    exports.DOMException.prototype = Object.create(Error.prototype);
    exports.DOMException.prototype.constructor = exports.DOMException;
  }

  function fetch(input, init) {
    return new Promise(function(resolve, reject) {
      var request = new Request(input, init);

      if (request.signal && request.signal.aborted) {
        return reject(new exports.DOMException('Aborted', 'AbortError'))
      }

      var xhr = new XMLHttpRequest();

      function abortXhr() {
        xhr.abort();
      }

      xhr.onload = function() {
        var options = {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: parseHeaders(xhr.getAllResponseHeaders() || '')
        };
        options.url = 'responseURL' in xhr ? xhr.responseURL : options.headers.get('X-Request-URL');
        var body = 'response' in xhr ? xhr.response : xhr.responseText;
        resolve(new Response(body, options));
      };

      xhr.onerror = function() {
        reject(new TypeError('Network request failed'));
      };

      xhr.ontimeout = function() {
        reject(new TypeError('Network request failed'));
      };

      xhr.onabort = function() {
        reject(new exports.DOMException('Aborted', 'AbortError'));
      };

      xhr.open(request.method, request.url, true);

      if (request.credentials === 'include') {
        xhr.withCredentials = true;
      } else if (request.credentials === 'omit') {
        xhr.withCredentials = false;
      }

      if ('responseType' in xhr && support.blob) {
        xhr.responseType = 'blob';
      }

      request.headers.forEach(function(value, name) {
        xhr.setRequestHeader(name, value);
      });

      if (request.signal) {
        request.signal.addEventListener('abort', abortXhr);

        xhr.onreadystatechange = function() {
          // DONE (success or failure)
          if (xhr.readyState === 4) {
            request.signal.removeEventListener('abort', abortXhr);
          }
        };
      }

      xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit);
    })
  }

  fetch.polyfill = true;

  if (!self.fetch) {
    self.fetch = fetch;
    self.Headers = Headers;
    self.Request = Request;
    self.Response = Response;
  }

  exports.Headers = Headers;
  exports.Request = Request;
  exports.Response = Response;
  exports.fetch = fetch;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
/**
 * Copyright 2018 The Cotonic Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* Originial code from https://github.com/RangerMauve/mqtt-pattern */

"use strict";

var cotonic = cotonic || {};

(function(cotonic) {
    
    const SEPARATOR = "/";
    const SINGLE = "+";
    const ALL = "#";


    function exec(pattern, topic) {
	return matches(pattern, topic) ? extract(pattern, topic) : null;
    }

    function matches(pattern, topic) {
	var patternSegments = pattern.split(SEPARATOR);
	var topicSegments = topic.split(SEPARATOR);

	var patternLength = patternSegments.length;
	var topicLength = topicSegments.length;
	var lastIndex = patternLength - 1;

	for(var i = 0; i < patternLength; i++){
	    var currentPattern = patternSegments[i];
	    var patternChar = currentPattern[0];
	    var currentTopic = topicSegments[i];

            if(!currentTopic && !currentPattern)
                continue;

	    if(!currentTopic && currentPattern !== ALL) return false;

	    // Only allow # at end
	    if(patternChar === ALL)
		return i === lastIndex;
	    if(patternChar !== SINGLE && currentPattern !== currentTopic)
		return false;
	}

	return patternLength === topicLength;
    }

    function fill(pattern, params){
	var patternSegments = pattern.split(SEPARATOR);
	var patternLength = patternSegments.length;

	var result = [];

	for (var i = 0; i < patternLength; i++) {
	    var currentPattern = patternSegments[i];
	    var patternChar = currentPattern[0];
	    var patternParam = currentPattern.slice(1);
	    var paramValue = params[patternParam];

	    if(patternChar === ALL){
		// Check that it isn't undefined
		if(paramValue !== void 0)
		    result.push([].concat(paramValue).join(SEPARATOR)); // Ensure it's an array

		// Since # wildcards are always at the end, break out of the loop
		break;
	    } else if (patternChar === SINGLE)
		// Coerce param into a string, missing params will be undefined
		result.push("" + paramValue);
	    else result.push(currentPattern);
	}

	return result.join(SEPARATOR);
    }


    function extract(pattern, topic) {
	var params = {};
	var patternSegments = pattern.split(SEPARATOR);
	var topicSegments = topic.split(SEPARATOR);

	var patternLength = patternSegments.length;

	for(var i = 0; i < patternLength; i++){
	    var currentPattern = patternSegments[i];
	    var patternChar = currentPattern[0];

	    if(currentPattern.length === 1)
		continue;

	    if(patternChar === ALL){
		params[currentPattern.slice(1)] = topicSegments.slice(i);
		break;
	    } else if(patternChar === SINGLE){
		params[currentPattern.slice(1)] = topicSegments[i];
	    }
	}

	return params;
    }

    function remove_named_wildcards(pattern) {
	var patternSegments = pattern.split(SEPARATOR);
	var patternLength = patternSegments.length;
        var mqttPattern = [];

	for(var i = 0; i < patternLength; i++) {
	    var currentPattern = patternSegments[i];
	    var patternChar = currentPattern[0];

            if(patternChar === ALL || patternChar == SINGLE) {
                mqttPattern.push(patternChar);
            } else {
                mqttPattern.push(currentPattern);
            }
        }

        return mqttPattern.join(SEPARATOR);
    }

    cotonic.mqtt = cotonic.mqtt || {};
    cotonic.mqtt.matches = matches;
    cotonic.mqtt.extract = extract;
    cotonic.mqtt.exec = exec;
    cotonic.mqtt.fill = fill;
    cotonic.mqtt.remove_named_wildcards = remove_named_wildcards;
 
})(cotonic);
/**
 * Copyright 2016, 2017, 2018 The Cotonic Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

var cotonic = cotonic || {};

/* Cotonic worker code */

(function(self) {

    let model = {
        client_id: undefined,   // Set to the wid
        name: undefined,        // Name if named spawn

        response_topic_prefix: undefined,
        response_topic_nr: 1,
        response_handlers: {},  // response_topic -> { timeout, handler }

        connected: false,
        connecting: false,

        packet_id: 1,
        subscriptions: {},      // topic -> [callback]
        pending_acks: {},       // sub-id -> callback

        selfClose: self.close
    }

    model.present = function(data) {
        /* State changes happen here */
        if(state.connected(model)) {
            // PUBLISH
            if(data.type == "publish") {
                if(data.from == "client") {
                    // publish to broker
                    let options = data.options || {};
                    let msg = {
                        type: "publish",
                        topic: data.topic,
                        payload: data.payload,
                        qos: options.qos || 0,
                        retain: options.retain || false,
                        properties: options.properties || {}
                    }
                    self.postMessage(msg);
                } else {
                    if (typeof model.response_handlers[data.topic] === 'object') {
                        // Reply to a temp response handler for a call
                        try {
                            clearTimeout(model.response_handlers[data.topic].timeout);
                            model.response_handlers[data.topic].handler(data);
                            delete model.response_handlers[data.topic];
                        } catch(e) {
                            console.error("Error during callback of: " + data.topic, e);
                        }
                    } else {
                        // Receive publish from broker, call matching subscription callbacks
                        for(let pattern in model.subscriptions) {
                            if(cotonic.mqtt.matches(pattern, data.topic)) {
                                let subs = model.subscriptions[pattern];
                                for(let i=0; i < subs.length; i++) {
                                    let subscription = subs[i];
                                    try {
                                        subscription.callback(data,
                                                              cotonic.mqtt.extract(
                                                                  subscription.topic, data.topic));
                                    } catch(e) {
                                        console.error("Error during callback of: " + pattern, e);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // SUBSCRIBE
            if(data.type == "subscribe" && data.from == "client") {
                let new_subs = [];
                let new_topics = [];
                let packet_id = model.packet_id++;

                for (let k = 0; k < data.topics.length; k++) {
                    let t = data.topics[k];
                    let mqtt_topic = cotonic.mqtt.remove_named_wildcards(t.topic);

                    // Check if there is a subscription with the same MQTT topic.
                    if (model.subscriptions[mqtt_topic]) {
                        // TODO: check qos / retain_handling
                        //       if qos > or retain_handling < then resubscribe
                        already_subscribed = true;

                        let subs = model.subscriptions[mqtt_topic];
                        subs.push({topic: t.topic, callback: data.callback})
                        if(data.ack_callback) {
                            setTimeout(data.ack_callback, 0);
                        }
                    } else {
                        let newsub = {
                            topic: mqtt_topic,
                            qos: t.qos || 0,
                            retain_handling: t.retain_handling || 0,
                            retain_as_published: t.retain_as_published || false,
                            no_local: t.no_local || false
                        };
                        new_subs.push(newsub);
                        new_topics.push(t.topic);
                    }
                }

                if(new_topics.length > 0) {
                    self.postMessage({type: "subscribe", topics: new_subs, packet_id: packet_id});
                    data.subs = new_subs;
                    data.topics = new_topics;
                    model.pending_acks[packet_id] = data;
                }
            }

            // SUBACK
            if(data.type == "suback" && data.from == "broker") {
                let pending = model.pending_acks[data.packet_id];
                if(pending) {
                    delete model.pending_acks[data.packet_id];

                    for(let k = 0; k < pending.topics.length; k++) {
                        let subreq = pending.subs[k];
                        let mqtt_topic = subreq.topic;
                        if(model.subscriptions[mqtt_topic] === undefined) {
                            model.subscriptions[mqtt_topic] = [];
                        }

                        if(data.acks[k] < 0x80) {
                            model.subscriptions[mqtt_topic].push({
                                topic: pending.topics[k],
                                sub: subreq,
                                callback: pending.callback
                            });
                        }
                        if(pending.ack_callback) {
                            setTimeout(pending.ack_callback, 0, mqtt_topic, data.acks[k], subreq);
                        }
                    }
                    if(pending.ack_callback) {
                        delete pending.ack_callback;
                    }
                }
            }

            // UNSUBSCRIBE
            // TODO: use a subscriber tag to know which subscription is canceled
            //       now we unsubscribe all subscribers
            if(data.type == "unsubscribe" && data.from == "client") {
                let packet_id = model.packet_id++;
                let mqtt_topics = [];
                for (let k = 0; k < data.topics.length; k++) {
                    let t = data.topics[k];
                    let mqtt_topic = cotonic.mqtt.remove_named_wildcards(t);
                    mqtt_topics.push(mqtt_topic);
                }
                self.postMessage({type: "unsubscribe", topics: mqtt_topics, packet_id: packet_id});
                data.mqtt_topics = mqtt_topics;
                model.pending_acks[packet_id] = data;
            }

            // UNSUBACK
            if(data.type == "unsuback" && data.from == "broker") {
                let pending = model.pending_acks[data.packet_id];
                if(pending) {
                    delete model.pending_acks[data.packet_id];

                    for(let i = 0; i < pending.mqtt_topics.length; i++) {
                        let mqtt_topic = pending.mqtt_topics[i];
                        if (data.acks[i] < 0x80) {
                            let subs = model.subscriptions[mqtt_topic];
                            for (let k = subs.length-1; k >= 0; k--) {
                                delete subs[k].callback;
                                delete subs[k];
                            }
                            delete model.subscriptions[mqtt_topic];
                        }

                        if(pending.ack_callback) {
                            setTimeout(pending.ack_callback, 0, mqtt_topic, data.acks[k]);
                        }
                    }
                    if(pending.ack_callback) {
                        delete pending.ack_callback;
                    }
                }
            }

            // PING
            if(data.type == "pingreq" && data.from == "client") {
                // TODO: if broker doesn't answer then stop this worker
                self.postMessage({type: "pingreq"});
            }

            if(data.type == "pingresp" && data.from == "broker") {
                // TODO: Connection and broker are alive, we can stay alive
            }

            // Response topic handling
            if(data.type == "subscribe_response_handler" && data.from == "client") {
                model.response_handlers[data.topic] = data.handler;
                model.response_topic_nr++;
            }

            if(data.type == "remove_response_handler" && data.from == "client") {
                delete model.response_handlers[data.topic];
            }

        } else if(state.disconnected(model)) {
            if(data.type == "connect") {
                // console.log("worker - connect");
                // model.client_id = data.client_id;
                model.connected = false;
                model.connecting = true;
                self.postMessage({
                    type: "connect",
                    client_id: model.client_id,
                    will_topic: data.will_topic,
                    will_payload: data.will_payload
                });
            } else {
                // message before connect, queue?
                console.error("Message during disconnect state", data);
            }
        } else if(state.connecting(model)) {
            if(data.type == "connack" && data.from == "broker") {
                // assume reason_code == 0
                // register assigned client identifier?
                model.connecting = false;
                model.connected = true;
                setTimeout(self.connack_received, 0);
            } else if(data.connect_timeout) {
                model.connected = false;
                model.connecting = false;
                if(self.on_error) {
                    self.on_error("connect_timeout");
                }
            }
        } else {
            // TODO
        }

        state.render(model);
    }

    /** View */
    let view = {};

    view.display = function(representation) {
        // TODO. Could be used to represent debug information.
    }

    /** State */
    let state = {view: view};

    state.representation = function(model) {
        // TODO, could be debug information.
        let representation;
        state.view.display(representation);
    }

    state.nextAction = function(model) {
        if(state.connecting(model)) {
            // We are connecting, trigger a connect timeout
            actions.connect_timeout({}, model.present);
        }
    }

    state.render = function(model) {
        state.representation(model);
        state.nextAction(model);
    }

    model.state = state;

    state.disconnected = function(model) {
        return (!model.connected && !model.connecting);
    }

    state.connected = function(model) {
        return (model.connected && !model.connecting);
    }

    state.connecting = function(model) {
        return (!model.connected && model.connecting);
    }

    /** Actions */

    let actions = {};

    function client_cmd(type, data, present) {
        present = present || model.present;
        data.from = "client";
        data.type = type;
        present(data);
    }

    actions.on_message = function(e) {
        let data = e.data;
        if(data.type) {
            data.from = "broker";
            model.present(e.data);
        }
    }

    actions.on_error = function(e) {
    }

    actions.disconnect = client_cmd.bind(null, "disconnect");
    actions.connect = client_cmd.bind(null, "connect");
    actions.subscribe = client_cmd.bind(null, "subscribe");
    actions.unsubscribe = client_cmd.bind(null, "unsubscribe");
    actions.publish = client_cmd.bind(null, "publish");
    actions.pingreq = client_cmd.bind(null, "pingreq");
    actions.subscribe_response_handler = client_cmd.bind(null, "subscribe_response_handler");
    actions.remove_response_handler = client_cmd.bind(null, "remove_response_handler");

    actions.connect_timeout = function(data, present) {
        present = present || model.present;
        let d = data, p = present;

        setTimeout(function() {
            d.connect_timeout = true;
            p(d);
        }, 1000);
    }

    /** External api */
    self.is_connected = function() {
        return state.connected();
    }

    self.close = function() {
        actions.close();
    }

    self.connect = function(willTopic, willPayload) {
        actions.connect({
            will_topic: willTopic,
            will_payload: willPayload
        });
    }

    self.subscribe = function(topics, callback, ack_callback) {
        let ts;

        if (typeof(topics) == "string") {
            ts = [
                {
                    topic: topics,
                    qos: 0,
                    retain_handling: 0,
                    retain_as_published: false,
                    no_local: false
                }
            ];
        } else {
            // Assume array with topic subscriptions
            ts = topics;
        }
        actions.subscribe({topics: ts, callback: callback, ack_callback: ack_callback});
    }

    self.unsubscribe = function(topics, callback, ack_callback) {
        let ts;

        if (typeof(topics) == "string") {
            ts = [ topics ];
        } else {
            ts = topics;
        }
        actions.unsubscribe({topics: ts, callback: callback, ack_callback: ack_callback});
    }

    self.publish = function(topic, payload, options) {
        actions.publish({topic: topic, payload: payload, options: options});
    }

    self.pingreq = function() {
        actions.pingreq();
    }

    self.disconnect = function() {
        actions.disconnect();
    }

    // Publish to a topic, return a promise for the response_topic publication
    self.call = function(topic, payload, options) {
        options = options || {};
        let timeout = options.timeout || 15000;
        var willRespond = new Promise(
            function(resolve, reject) {
                let response_topic = model.response_topic_prefix + model.response_topic_nr;
                let timer = setTimeout(function() {
                                actions.remove_response_handler({ topic: response_topic });
                                let reason = new Error("Timeout waiting for response on " + topic);
                                reject(reason);
                            }, timeout);
                let handler = {
                    handler: resolve,
                    timeout: timer
                };
                actions.subscribe_response_handler({ topic: response_topic, handler: handler });
                let pubdata = {
                    topic: topic,
                    payload: payload,
                    options: {
                        properties: {
                            response_topic: response_topic
                        }
                    }
                };
                actions.publish(pubdata);
            });
        return willRespond;
    }

    self.connack_received = function() {
        self.subscribe(model.response_topic_prefix + "+", self.response, self.on_connect);
    };

    self.abs_url = function(path) {
        return model.location.origin + path;
    }

    function init(e) {
        if(e.data[0] !== "init")
            throw("Worker init error. Wrong init message.");

        self.removeEventListener("message", init);
        self.addEventListener("message", actions.on_message);
        self.addEventListener("error", actions.on_error);

        model.client_id = e.data[1].wid;
        model.name = e.data[1].name || undefined;
        model.location = e.data[1].location;
        model.response_topic_prefix = "worker/" + model.client_id + "/response/";

        const url = e.data[1].url;
        const args = e.data[1].args;

        if(url) {
            importScripts(url);
        }
        if(self.worker_init) {
            worker_init.apply(null, args);
        }
    }

    self.addEventListener("message", init);
})(self);

