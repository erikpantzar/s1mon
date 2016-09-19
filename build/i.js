(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function(self) {
  'use strict';

  if (self.fetch) {
    return
  }

  var support = {
    searchParams: 'URLSearchParams' in self,
    iterable: 'Symbol' in self && 'iterator' in Symbol,
    blob: 'FileReader' in self && 'Blob' in self && (function() {
      try {
        new Blob()
        return true
      } catch(e) {
        return false
      }
    })(),
    formData: 'FormData' in self,
    arrayBuffer: 'ArrayBuffer' in self
  }

  function normalizeName(name) {
    if (typeof name !== 'string') {
      name = String(name)
    }
    if (/[^a-z0-9\-#$%&'*+.\^_`|~]/i.test(name)) {
      throw new TypeError('Invalid character in header field name')
    }
    return name.toLowerCase()
  }

  function normalizeValue(value) {
    if (typeof value !== 'string') {
      value = String(value)
    }
    return value
  }

  // Build a destructive iterator for the value list
  function iteratorFor(items) {
    var iterator = {
      next: function() {
        var value = items.shift()
        return {done: value === undefined, value: value}
      }
    }

    if (support.iterable) {
      iterator[Symbol.iterator] = function() {
        return iterator
      }
    }

    return iterator
  }

  function Headers(headers) {
    this.map = {}

    if (headers instanceof Headers) {
      headers.forEach(function(value, name) {
        this.append(name, value)
      }, this)

    } else if (headers) {
      Object.getOwnPropertyNames(headers).forEach(function(name) {
        this.append(name, headers[name])
      }, this)
    }
  }

  Headers.prototype.append = function(name, value) {
    name = normalizeName(name)
    value = normalizeValue(value)
    var list = this.map[name]
    if (!list) {
      list = []
      this.map[name] = list
    }
    list.push(value)
  }

  Headers.prototype['delete'] = function(name) {
    delete this.map[normalizeName(name)]
  }

  Headers.prototype.get = function(name) {
    var values = this.map[normalizeName(name)]
    return values ? values[0] : null
  }

  Headers.prototype.getAll = function(name) {
    return this.map[normalizeName(name)] || []
  }

  Headers.prototype.has = function(name) {
    return this.map.hasOwnProperty(normalizeName(name))
  }

  Headers.prototype.set = function(name, value) {
    this.map[normalizeName(name)] = [normalizeValue(value)]
  }

  Headers.prototype.forEach = function(callback, thisArg) {
    Object.getOwnPropertyNames(this.map).forEach(function(name) {
      this.map[name].forEach(function(value) {
        callback.call(thisArg, value, name, this)
      }, this)
    }, this)
  }

  Headers.prototype.keys = function() {
    var items = []
    this.forEach(function(value, name) { items.push(name) })
    return iteratorFor(items)
  }

  Headers.prototype.values = function() {
    var items = []
    this.forEach(function(value) { items.push(value) })
    return iteratorFor(items)
  }

  Headers.prototype.entries = function() {
    var items = []
    this.forEach(function(value, name) { items.push([name, value]) })
    return iteratorFor(items)
  }

  if (support.iterable) {
    Headers.prototype[Symbol.iterator] = Headers.prototype.entries
  }

  function consumed(body) {
    if (body.bodyUsed) {
      return Promise.reject(new TypeError('Already read'))
    }
    body.bodyUsed = true
  }

  function fileReaderReady(reader) {
    return new Promise(function(resolve, reject) {
      reader.onload = function() {
        resolve(reader.result)
      }
      reader.onerror = function() {
        reject(reader.error)
      }
    })
  }

  function readBlobAsArrayBuffer(blob) {
    var reader = new FileReader()
    reader.readAsArrayBuffer(blob)
    return fileReaderReady(reader)
  }

  function readBlobAsText(blob) {
    var reader = new FileReader()
    reader.readAsText(blob)
    return fileReaderReady(reader)
  }

  function Body() {
    this.bodyUsed = false

    this._initBody = function(body) {
      this._bodyInit = body
      if (typeof body === 'string') {
        this._bodyText = body
      } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
        this._bodyBlob = body
      } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
        this._bodyFormData = body
      } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
        this._bodyText = body.toString()
      } else if (!body) {
        this._bodyText = ''
      } else if (support.arrayBuffer && ArrayBuffer.prototype.isPrototypeOf(body)) {
        // Only support ArrayBuffers for POST method.
        // Receiving ArrayBuffers happens via Blobs, instead.
      } else {
        throw new Error('unsupported BodyInit type')
      }

      if (!this.headers.get('content-type')) {
        if (typeof body === 'string') {
          this.headers.set('content-type', 'text/plain;charset=UTF-8')
        } else if (this._bodyBlob && this._bodyBlob.type) {
          this.headers.set('content-type', this._bodyBlob.type)
        } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
          this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8')
        }
      }
    }

    if (support.blob) {
      this.blob = function() {
        var rejected = consumed(this)
        if (rejected) {
          return rejected
        }

        if (this._bodyBlob) {
          return Promise.resolve(this._bodyBlob)
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as blob')
        } else {
          return Promise.resolve(new Blob([this._bodyText]))
        }
      }

      this.arrayBuffer = function() {
        return this.blob().then(readBlobAsArrayBuffer)
      }

      this.text = function() {
        var rejected = consumed(this)
        if (rejected) {
          return rejected
        }

        if (this._bodyBlob) {
          return readBlobAsText(this._bodyBlob)
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as text')
        } else {
          return Promise.resolve(this._bodyText)
        }
      }
    } else {
      this.text = function() {
        var rejected = consumed(this)
        return rejected ? rejected : Promise.resolve(this._bodyText)
      }
    }

    if (support.formData) {
      this.formData = function() {
        return this.text().then(decode)
      }
    }

    this.json = function() {
      return this.text().then(JSON.parse)
    }

    return this
  }

  // HTTP methods whose capitalization should be normalized
  var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT']

  function normalizeMethod(method) {
    var upcased = method.toUpperCase()
    return (methods.indexOf(upcased) > -1) ? upcased : method
  }

  function Request(input, options) {
    options = options || {}
    var body = options.body
    if (Request.prototype.isPrototypeOf(input)) {
      if (input.bodyUsed) {
        throw new TypeError('Already read')
      }
      this.url = input.url
      this.credentials = input.credentials
      if (!options.headers) {
        this.headers = new Headers(input.headers)
      }
      this.method = input.method
      this.mode = input.mode
      if (!body) {
        body = input._bodyInit
        input.bodyUsed = true
      }
    } else {
      this.url = input
    }

    this.credentials = options.credentials || this.credentials || 'omit'
    if (options.headers || !this.headers) {
      this.headers = new Headers(options.headers)
    }
    this.method = normalizeMethod(options.method || this.method || 'GET')
    this.mode = options.mode || this.mode || null
    this.referrer = null

    if ((this.method === 'GET' || this.method === 'HEAD') && body) {
      throw new TypeError('Body not allowed for GET or HEAD requests')
    }
    this._initBody(body)
  }

  Request.prototype.clone = function() {
    return new Request(this)
  }

  function decode(body) {
    var form = new FormData()
    body.trim().split('&').forEach(function(bytes) {
      if (bytes) {
        var split = bytes.split('=')
        var name = split.shift().replace(/\+/g, ' ')
        var value = split.join('=').replace(/\+/g, ' ')
        form.append(decodeURIComponent(name), decodeURIComponent(value))
      }
    })
    return form
  }

  function headers(xhr) {
    var head = new Headers()
    var pairs = (xhr.getAllResponseHeaders() || '').trim().split('\n')
    pairs.forEach(function(header) {
      var split = header.trim().split(':')
      var key = split.shift().trim()
      var value = split.join(':').trim()
      head.append(key, value)
    })
    return head
  }

  Body.call(Request.prototype)

  function Response(bodyInit, options) {
    if (!options) {
      options = {}
    }

    this.type = 'default'
    this.status = options.status
    this.ok = this.status >= 200 && this.status < 300
    this.statusText = options.statusText
    this.headers = options.headers instanceof Headers ? options.headers : new Headers(options.headers)
    this.url = options.url || ''
    this._initBody(bodyInit)
  }

  Body.call(Response.prototype)

  Response.prototype.clone = function() {
    return new Response(this._bodyInit, {
      status: this.status,
      statusText: this.statusText,
      headers: new Headers(this.headers),
      url: this.url
    })
  }

  Response.error = function() {
    var response = new Response(null, {status: 0, statusText: ''})
    response.type = 'error'
    return response
  }

  var redirectStatuses = [301, 302, 303, 307, 308]

  Response.redirect = function(url, status) {
    if (redirectStatuses.indexOf(status) === -1) {
      throw new RangeError('Invalid status code')
    }

    return new Response(null, {status: status, headers: {location: url}})
  }

  self.Headers = Headers
  self.Request = Request
  self.Response = Response

  self.fetch = function(input, init) {
    return new Promise(function(resolve, reject) {
      var request
      if (Request.prototype.isPrototypeOf(input) && !init) {
        request = input
      } else {
        request = new Request(input, init)
      }

      var xhr = new XMLHttpRequest()

      function responseURL() {
        if ('responseURL' in xhr) {
          return xhr.responseURL
        }

        // Avoid security warnings on getResponseHeader when not allowed by CORS
        if (/^X-Request-URL:/m.test(xhr.getAllResponseHeaders())) {
          return xhr.getResponseHeader('X-Request-URL')
        }

        return
      }

      xhr.onload = function() {
        var options = {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: headers(xhr),
          url: responseURL()
        }
        var body = 'response' in xhr ? xhr.response : xhr.responseText
        resolve(new Response(body, options))
      }

      xhr.onerror = function() {
        reject(new TypeError('Network request failed'))
      }

      xhr.ontimeout = function() {
        reject(new TypeError('Network request failed'))
      }

      xhr.open(request.method, request.url, true)

      if (request.credentials === 'include') {
        xhr.withCredentials = true
      }

      if ('responseType' in xhr && support.blob) {
        xhr.responseType = 'blob'
      }

      request.headers.forEach(function(value, name) {
        xhr.setRequestHeader(name, value)
      })

      xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit)
    })
  }
  self.fetch.polyfill = true
})(typeof self !== 'undefined' ? self : this);

},{}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

require('whatwg-fetch');

var API = 'https://h1score.herokuapp.com/api';
//const API = "http://localhost:8080/api";

var hiscoreContainer = document.createElement('section');
hiscoreContainer.classList.add('hiscores');
document.body.appendChild(hiscoreContainer);

var hiscore = {
    getScores: function getScores() {
        fetch(API + '/h1score').then(function (res) {
            return res.json();
        }).then(function (hiscores) {
            hiscoreContainer.innerHTML = "";
            hiscore.scoreHandler(hiscores);
        });
    },
    scoreHandler: function scoreHandler(scores) {
        scores.forEach(function (score) {
            var item = document.createElement('div');
            item.classList.add('hiscores-score');
            item.innerHTML = '\n                       <span class="result">' + score.score + '</span>\n                       <span class="name">' + score.name + '</span>\n                      <span class="time">' + score.time + '</span>\n          ';
            hiscoreContainer.appendChild(item);
        });
    }
};

setInterval(hiscore.getScores, 25000);
hiscore.getScores();

exports.default = hiscore;

},{"whatwg-fetch":1}],3:[function(require,module,exports){
'use strict';

var _simon = require('./simon');

var _simon2 = _interopRequireDefault(_simon);

var _hiscores = require('./hiscores');

var _hiscores2 = _interopRequireDefault(_hiscores);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// when fail game, send score with name?
// send score when fail.... ?


// set the stage
_simon2.default.init();
_simon2.default.startGame();

},{"./hiscores":2,"./simon":4}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

require('whatwg-fetch');

// simon says
var INTERVAL = 750;
var BUTTONS = 3;
var orderArr = [1, 2, 3];
var timeOfPlay = 0;

var API = 'https://h1score.herokuapp.com/api/h1score';
// const API = '/api/h1score';

function init() {
    for (var i = BUTTONS; i > 0; i--) {
        var button = document.createElement('button');
        button.dataset.simon = i;
        document.body.appendChild(button);
    }

    document.body.addEventListener('keypress', function (evt) {
        switch (evt.key) {
            case 'z':
                clickHandler(1);
                break;
            case 'x':
                clickHandler(2);
                break;
            case 'c':
                clickHandler(3);
                break;
            default:
                break;
        }
    });

    document.body.addEventListener('click', function (el) {
        var idx = el.target.dataset.simon;
        clickHandler(idx);
    });

    var scoreKeeper = document.createElement('div');
    scoreKeeper.classList.add('score');
    scoreKeeper.innerHTML = "0";
    document.body.appendChild(scoreKeeper);
}

function clickHandler(idx) {
    lightButton(idx);

    if (idx == orderArr[timeOfPlay]) {
        timeOfPlay++;

        if (timeOfPlay == orderArr.length) {
            drawScore(timeOfPlay);
            setTimeout(function () {
                return addNewMoves(orderArr);
            }, 1200);
        }
    } else {
        endGame();
        return false;
    }
}

function randomButton() {
    var max = BUTTONS;
    var min = 0;
    return Math.floor(Math.random() * (max - min) + 1);
}

// startGame for amount of orders
// first time play, push to the array.
function startGame() {
    var order = arguments.length <= 0 || arguments[0] === undefined ? 0 : arguments[0];

    timeOfPlay = 0;
    drawScore(0);
    if (order < orderArr.length) {
        playMoves(orderArr);
    }
}

function addNewMoves(arr) {
    timeOfPlay = 0;
    playMoves(arr);

    var index = randomButton();
    setTimeout(function () {
        lightButton(index);
        orderArr.push(index);
    }, INTERVAL * orderArr.length);
}

function playMoves(arr) {
    timeOfPlay = 0;
    if (arr.length > 0) {
        var index = arr[0];
        lightButton(index);
        setTimeout(function () {
            playMoves(arr.slice(1));
        }, INTERVAL);
    }
}

function endGame() {
    document.body.classList.add('failed');

    getName();

    setTimeout(function () {
        document.body.classList.remove('failed');
        orderArr = [1, 2, 3];
        drawScore(0);
        setTimeout(startGame(), 1600);
    }, 1500);
}

var playerName = "";
var nameTemplate = '\n  <div class="form-name__new">\n  <input placeholder="Name">\n  <button class="button--secondary" type="button">skip..</button>\n  </div>\n  \n  <div class="form-name__exist">\n  <h2 class="name-form__title"><span>Are you</span> ' + playerName + '?</h2>\n  <button type="button">no.</button>\n  </div>\n';

var formContainer = document.createElement('form');
formContainer.classList.add('name-form');
formContainer.dataset.state = 'unset';
formContainer.innerHTML = nameTemplate;
document.body.appendChild(formContainer);

var nameHandler = {
    init: function init() {},
    submit: function submit() {}
};

function lightButton(index) {
    var speed = arguments.length <= 1 || arguments[1] === undefined ? 200 : arguments[1];

    var button = document.querySelectorAll('[data-simon="' + index + '"]')[0];
    button.classList.toggle('active');
    var audio = new Audio('beeps/beep' + index + '.wav');
    audio.volume = 0.1;
    audio.play();

    setTimeout(function () {
        button.classList.toggle('active');
    }, speed);
}

function drawScore() {
    var score = arguments.length <= 0 || arguments[0] === undefined ? 0 : arguments[0];

    var keeper = document.querySelector('.score');
    keeper.classList.toggle('updated');
    keeper.innerHTML = score;
    setTimeout(function () {
        keeper.classList.toggle('updated');
    }, 100);
}

function postScore(name) {
    // POST scores
    if (orderArr.length > 2) {
        var data = {
            method: 'POST',
            body: JSON.stringify({ name: name, score: orderArr.length }),
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        };

        var request = new Request(API, data);
        fetch(request).then(function (response) {
            return response.json();
        }).then(function (res) {
            // console.log(res);
        });
    }
}

var simon = {
    init: init,
    startGame: startGame,
    endGame: endGame
};

exports.default = simon;

},{"whatwg-fetch":1}]},{},[3])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvd2hhdHdnLWZldGNoL2ZldGNoLmpzIiwic3JjL2hpc2NvcmVzLmpzIiwic3JjL2luZGV4LmpzIiwic3JjL3NpbW9uLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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WDs7QUFTQSxZQUFJLFVBQVUsSUFBSSxPQUFKLENBQVksR0FBWixFQUFpQixJQUFqQixDQUFkO0FBQ0EsY0FBTSxPQUFOLEVBQWUsSUFBZixDQUFvQixVQUFDLFFBQUQsRUFBYTtBQUMvQixtQkFBTyxTQUFTLElBQVQsRUFBUDtBQUNELFNBRkQsRUFFRyxJQUZILENBRVEsVUFBQyxHQUFELEVBQU87QUFDYjtBQUNELFNBSkQ7QUFLRDtBQUNGOztBQUVELElBQU0sUUFBUTtBQUNaLGNBRFk7QUFFWix3QkFGWTtBQUdaO0FBSFksQ0FBZDs7a0JBTWUsSyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIoZnVuY3Rpb24oc2VsZikge1xuICAndXNlIHN0cmljdCc7XG5cbiAgaWYgKHNlbGYuZmV0Y2gpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIHZhciBzdXBwb3J0ID0ge1xuICAgIHNlYXJjaFBhcmFtczogJ1VSTFNlYXJjaFBhcmFtcycgaW4gc2VsZixcbiAgICBpdGVyYWJsZTogJ1N5bWJvbCcgaW4gc2VsZiAmJiAnaXRlcmF0b3InIGluIFN5bWJvbCxcbiAgICBibG9iOiAnRmlsZVJlYWRlcicgaW4gc2VsZiAmJiAnQmxvYicgaW4gc2VsZiAmJiAoZnVuY3Rpb24oKSB7XG4gICAgICB0cnkge1xuICAgICAgICBuZXcgQmxvYigpXG4gICAgICAgIHJldHVybiB0cnVlXG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgfSkoKSxcbiAgICBmb3JtRGF0YTogJ0Zvcm1EYXRhJyBpbiBzZWxmLFxuICAgIGFycmF5QnVmZmVyOiAnQXJyYXlCdWZmZXInIGluIHNlbGZcbiAgfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZU5hbWUobmFtZSkge1xuICAgIGlmICh0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIG5hbWUgPSBTdHJpbmcobmFtZSlcbiAgICB9XG4gICAgaWYgKC9bXmEtejAtOVxcLSMkJSYnKisuXFxeX2B8fl0vaS50ZXN0KG5hbWUpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGNoYXJhY3RlciBpbiBoZWFkZXIgZmllbGQgbmFtZScpXG4gICAgfVxuICAgIHJldHVybiBuYW1lLnRvTG93ZXJDYXNlKClcbiAgfVxuXG4gIGZ1bmN0aW9uIG5vcm1hbGl6ZVZhbHVlKHZhbHVlKSB7XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHZhbHVlID0gU3RyaW5nKHZhbHVlKVxuICAgIH1cbiAgICByZXR1cm4gdmFsdWVcbiAgfVxuXG4gIC8vIEJ1aWxkIGEgZGVzdHJ1Y3RpdmUgaXRlcmF0b3IgZm9yIHRoZSB2YWx1ZSBsaXN0XG4gIGZ1bmN0aW9uIGl0ZXJhdG9yRm9yKGl0ZW1zKSB7XG4gICAgdmFyIGl0ZXJhdG9yID0ge1xuICAgICAgbmV4dDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IGl0ZW1zLnNoaWZ0KClcbiAgICAgICAgcmV0dXJuIHtkb25lOiB2YWx1ZSA9PT0gdW5kZWZpbmVkLCB2YWx1ZTogdmFsdWV9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuaXRlcmFibGUpIHtcbiAgICAgIGl0ZXJhdG9yW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGl0ZXJhdG9yXG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGl0ZXJhdG9yXG4gIH1cblxuICBmdW5jdGlvbiBIZWFkZXJzKGhlYWRlcnMpIHtcbiAgICB0aGlzLm1hcCA9IHt9XG5cbiAgICBpZiAoaGVhZGVycyBpbnN0YW5jZW9mIEhlYWRlcnMpIHtcbiAgICAgIGhlYWRlcnMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkge1xuICAgICAgICB0aGlzLmFwcGVuZChuYW1lLCB2YWx1ZSlcbiAgICAgIH0sIHRoaXMpXG5cbiAgICB9IGVsc2UgaWYgKGhlYWRlcnMpIHtcbiAgICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGhlYWRlcnMpLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgICB0aGlzLmFwcGVuZChuYW1lLCBoZWFkZXJzW25hbWVdKVxuICAgICAgfSwgdGhpcylcbiAgICB9XG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5hcHBlbmQgPSBmdW5jdGlvbihuYW1lLCB2YWx1ZSkge1xuICAgIG5hbWUgPSBub3JtYWxpemVOYW1lKG5hbWUpXG4gICAgdmFsdWUgPSBub3JtYWxpemVWYWx1ZSh2YWx1ZSlcbiAgICB2YXIgbGlzdCA9IHRoaXMubWFwW25hbWVdXG4gICAgaWYgKCFsaXN0KSB7XG4gICAgICBsaXN0ID0gW11cbiAgICAgIHRoaXMubWFwW25hbWVdID0gbGlzdFxuICAgIH1cbiAgICBsaXN0LnB1c2godmFsdWUpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZVsnZGVsZXRlJ10gPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgZGVsZXRlIHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIHZhbHVlcyA9IHRoaXMubWFwW25vcm1hbGl6ZU5hbWUobmFtZSldXG4gICAgcmV0dXJuIHZhbHVlcyA/IHZhbHVlc1swXSA6IG51bGxcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmdldEFsbCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5tYXBbbm9ybWFsaXplTmFtZShuYW1lKV0gfHwgW11cbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmhhcyA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gdGhpcy5tYXAuaGFzT3duUHJvcGVydHkobm9ybWFsaXplTmFtZShuYW1lKSlcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uKG5hbWUsIHZhbHVlKSB7XG4gICAgdGhpcy5tYXBbbm9ybWFsaXplTmFtZShuYW1lKV0gPSBbbm9ybWFsaXplVmFsdWUodmFsdWUpXVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUuZm9yRWFjaCA9IGZ1bmN0aW9uKGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModGhpcy5tYXApLmZvckVhY2goZnVuY3Rpb24obmFtZSkge1xuICAgICAgdGhpcy5tYXBbbmFtZV0uZm9yRWFjaChmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICBjYWxsYmFjay5jYWxsKHRoaXNBcmcsIHZhbHVlLCBuYW1lLCB0aGlzKVxuICAgICAgfSwgdGhpcylcbiAgICB9LCB0aGlzKVxuICB9XG5cbiAgSGVhZGVycy5wcm90b3R5cGUua2V5cyA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpdGVtcyA9IFtdXG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7IGl0ZW1zLnB1c2gobmFtZSkgfSlcbiAgICByZXR1cm4gaXRlcmF0b3JGb3IoaXRlbXMpXG4gIH1cblxuICBIZWFkZXJzLnByb3RvdHlwZS52YWx1ZXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaXRlbXMgPSBbXVxuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSkgeyBpdGVtcy5wdXNoKHZhbHVlKSB9KVxuICAgIHJldHVybiBpdGVyYXRvckZvcihpdGVtcylcbiAgfVxuXG4gIEhlYWRlcnMucHJvdG90eXBlLmVudHJpZXMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaXRlbXMgPSBbXVxuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSwgbmFtZSkgeyBpdGVtcy5wdXNoKFtuYW1lLCB2YWx1ZV0pIH0pXG4gICAgcmV0dXJuIGl0ZXJhdG9yRm9yKGl0ZW1zKVxuICB9XG5cbiAgaWYgKHN1cHBvcnQuaXRlcmFibGUpIHtcbiAgICBIZWFkZXJzLnByb3RvdHlwZVtTeW1ib2wuaXRlcmF0b3JdID0gSGVhZGVycy5wcm90b3R5cGUuZW50cmllc1xuICB9XG5cbiAgZnVuY3Rpb24gY29uc3VtZWQoYm9keSkge1xuICAgIGlmIChib2R5LmJvZHlVc2VkKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IFR5cGVFcnJvcignQWxyZWFkeSByZWFkJykpXG4gICAgfVxuICAgIGJvZHkuYm9keVVzZWQgPSB0cnVlXG4gIH1cblxuICBmdW5jdGlvbiBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgcmVhZGVyLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXNvbHZlKHJlYWRlci5yZXN1bHQpXG4gICAgICB9XG4gICAgICByZWFkZXIub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QocmVhZGVyLmVycm9yKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICBmdW5jdGlvbiByZWFkQmxvYkFzQXJyYXlCdWZmZXIoYmxvYikge1xuICAgIHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpXG4gICAgcmVhZGVyLnJlYWRBc0FycmF5QnVmZmVyKGJsb2IpXG4gICAgcmV0dXJuIGZpbGVSZWFkZXJSZWFkeShyZWFkZXIpXG4gIH1cblxuICBmdW5jdGlvbiByZWFkQmxvYkFzVGV4dChibG9iKSB7XG4gICAgdmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKClcbiAgICByZWFkZXIucmVhZEFzVGV4dChibG9iKVxuICAgIHJldHVybiBmaWxlUmVhZGVyUmVhZHkocmVhZGVyKVxuICB9XG5cbiAgZnVuY3Rpb24gQm9keSgpIHtcbiAgICB0aGlzLmJvZHlVc2VkID0gZmFsc2VcblxuICAgIHRoaXMuX2luaXRCb2R5ID0gZnVuY3Rpb24oYm9keSkge1xuICAgICAgdGhpcy5fYm9keUluaXQgPSBib2R5XG4gICAgICBpZiAodHlwZW9mIGJvZHkgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHRoaXMuX2JvZHlUZXh0ID0gYm9keVxuICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LmJsb2IgJiYgQmxvYi5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICB0aGlzLl9ib2R5QmxvYiA9IGJvZHlcbiAgICAgIH0gZWxzZSBpZiAoc3VwcG9ydC5mb3JtRGF0YSAmJiBGb3JtRGF0YS5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICB0aGlzLl9ib2R5Rm9ybURhdGEgPSBib2R5XG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuc2VhcmNoUGFyYW1zICYmIFVSTFNlYXJjaFBhcmFtcy5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihib2R5KSkge1xuICAgICAgICB0aGlzLl9ib2R5VGV4dCA9IGJvZHkudG9TdHJpbmcoKVxuICAgICAgfSBlbHNlIGlmICghYm9keSkge1xuICAgICAgICB0aGlzLl9ib2R5VGV4dCA9ICcnXG4gICAgICB9IGVsc2UgaWYgKHN1cHBvcnQuYXJyYXlCdWZmZXIgJiYgQXJyYXlCdWZmZXIucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgLy8gT25seSBzdXBwb3J0IEFycmF5QnVmZmVycyBmb3IgUE9TVCBtZXRob2QuXG4gICAgICAgIC8vIFJlY2VpdmluZyBBcnJheUJ1ZmZlcnMgaGFwcGVucyB2aWEgQmxvYnMsIGluc3RlYWQuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Vuc3VwcG9ydGVkIEJvZHlJbml0IHR5cGUnKVxuICAgICAgfVxuXG4gICAgICBpZiAoIXRoaXMuaGVhZGVycy5nZXQoJ2NvbnRlbnQtdHlwZScpKSB7XG4gICAgICAgIGlmICh0eXBlb2YgYm9keSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB0aGlzLmhlYWRlcnMuc2V0KCdjb250ZW50LXR5cGUnLCAndGV4dC9wbGFpbjtjaGFyc2V0PVVURi04JylcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5QmxvYiAmJiB0aGlzLl9ib2R5QmxvYi50eXBlKSB7XG4gICAgICAgICAgdGhpcy5oZWFkZXJzLnNldCgnY29udGVudC10eXBlJywgdGhpcy5fYm9keUJsb2IudHlwZSlcbiAgICAgICAgfSBlbHNlIGlmIChzdXBwb3J0LnNlYXJjaFBhcmFtcyAmJiBVUkxTZWFyY2hQYXJhbXMucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoYm9keSkpIHtcbiAgICAgICAgICB0aGlzLmhlYWRlcnMuc2V0KCdjb250ZW50LXR5cGUnLCAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkO2NoYXJzZXQ9VVRGLTgnKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHN1cHBvcnQuYmxvYikge1xuICAgICAgdGhpcy5ibG9iID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciByZWplY3RlZCA9IGNvbnN1bWVkKHRoaXMpXG4gICAgICAgIGlmIChyZWplY3RlZCkge1xuICAgICAgICAgIHJldHVybiByZWplY3RlZFxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX2JvZHlCbG9iKSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5QmxvYilcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLl9ib2R5Rm9ybURhdGEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2NvdWxkIG5vdCByZWFkIEZvcm1EYXRhIGJvZHkgYXMgYmxvYicpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShuZXcgQmxvYihbdGhpcy5fYm9keVRleHRdKSlcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aGlzLmFycmF5QnVmZmVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmJsb2IoKS50aGVuKHJlYWRCbG9iQXNBcnJheUJ1ZmZlcilcbiAgICAgIH1cblxuICAgICAgdGhpcy50ZXh0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciByZWplY3RlZCA9IGNvbnN1bWVkKHRoaXMpXG4gICAgICAgIGlmIChyZWplY3RlZCkge1xuICAgICAgICAgIHJldHVybiByZWplY3RlZFxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuX2JvZHlCbG9iKSB7XG4gICAgICAgICAgcmV0dXJuIHJlYWRCbG9iQXNUZXh0KHRoaXMuX2JvZHlCbG9iKVxuICAgICAgICB9IGVsc2UgaWYgKHRoaXMuX2JvZHlGb3JtRGF0YSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignY291bGQgbm90IHJlYWQgRm9ybURhdGEgYm9keSBhcyB0ZXh0JylcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHRoaXMuX2JvZHlUZXh0KVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudGV4dCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmVqZWN0ZWQgPSBjb25zdW1lZCh0aGlzKVxuICAgICAgICByZXR1cm4gcmVqZWN0ZWQgPyByZWplY3RlZCA6IFByb21pc2UucmVzb2x2ZSh0aGlzLl9ib2R5VGV4dClcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc3VwcG9ydC5mb3JtRGF0YSkge1xuICAgICAgdGhpcy5mb3JtRGF0YSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy50ZXh0KCkudGhlbihkZWNvZGUpXG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5qc29uID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy50ZXh0KCkudGhlbihKU09OLnBhcnNlKVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICAvLyBIVFRQIG1ldGhvZHMgd2hvc2UgY2FwaXRhbGl6YXRpb24gc2hvdWxkIGJlIG5vcm1hbGl6ZWRcbiAgdmFyIG1ldGhvZHMgPSBbJ0RFTEVURScsICdHRVQnLCAnSEVBRCcsICdPUFRJT05TJywgJ1BPU1QnLCAnUFVUJ11cblxuICBmdW5jdGlvbiBub3JtYWxpemVNZXRob2QobWV0aG9kKSB7XG4gICAgdmFyIHVwY2FzZWQgPSBtZXRob2QudG9VcHBlckNhc2UoKVxuICAgIHJldHVybiAobWV0aG9kcy5pbmRleE9mKHVwY2FzZWQpID4gLTEpID8gdXBjYXNlZCA6IG1ldGhvZFxuICB9XG5cbiAgZnVuY3Rpb24gUmVxdWVzdChpbnB1dCwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG4gICAgdmFyIGJvZHkgPSBvcHRpb25zLmJvZHlcbiAgICBpZiAoUmVxdWVzdC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihpbnB1dCkpIHtcbiAgICAgIGlmIChpbnB1dC5ib2R5VXNlZCkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBbHJlYWR5IHJlYWQnKVxuICAgICAgfVxuICAgICAgdGhpcy51cmwgPSBpbnB1dC51cmxcbiAgICAgIHRoaXMuY3JlZGVudGlhbHMgPSBpbnB1dC5jcmVkZW50aWFsc1xuICAgICAgaWYgKCFvcHRpb25zLmhlYWRlcnMpIHtcbiAgICAgICAgdGhpcy5oZWFkZXJzID0gbmV3IEhlYWRlcnMoaW5wdXQuaGVhZGVycylcbiAgICAgIH1cbiAgICAgIHRoaXMubWV0aG9kID0gaW5wdXQubWV0aG9kXG4gICAgICB0aGlzLm1vZGUgPSBpbnB1dC5tb2RlXG4gICAgICBpZiAoIWJvZHkpIHtcbiAgICAgICAgYm9keSA9IGlucHV0Ll9ib2R5SW5pdFxuICAgICAgICBpbnB1dC5ib2R5VXNlZCA9IHRydWVcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy51cmwgPSBpbnB1dFxuICAgIH1cblxuICAgIHRoaXMuY3JlZGVudGlhbHMgPSBvcHRpb25zLmNyZWRlbnRpYWxzIHx8IHRoaXMuY3JlZGVudGlhbHMgfHwgJ29taXQnXG4gICAgaWYgKG9wdGlvbnMuaGVhZGVycyB8fCAhdGhpcy5oZWFkZXJzKSB7XG4gICAgICB0aGlzLmhlYWRlcnMgPSBuZXcgSGVhZGVycyhvcHRpb25zLmhlYWRlcnMpXG4gICAgfVxuICAgIHRoaXMubWV0aG9kID0gbm9ybWFsaXplTWV0aG9kKG9wdGlvbnMubWV0aG9kIHx8IHRoaXMubWV0aG9kIHx8ICdHRVQnKVxuICAgIHRoaXMubW9kZSA9IG9wdGlvbnMubW9kZSB8fCB0aGlzLm1vZGUgfHwgbnVsbFxuICAgIHRoaXMucmVmZXJyZXIgPSBudWxsXG5cbiAgICBpZiAoKHRoaXMubWV0aG9kID09PSAnR0VUJyB8fCB0aGlzLm1ldGhvZCA9PT0gJ0hFQUQnKSAmJiBib2R5KSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdCb2R5IG5vdCBhbGxvd2VkIGZvciBHRVQgb3IgSEVBRCByZXF1ZXN0cycpXG4gICAgfVxuICAgIHRoaXMuX2luaXRCb2R5KGJvZHkpXG4gIH1cblxuICBSZXF1ZXN0LnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgUmVxdWVzdCh0aGlzKVxuICB9XG5cbiAgZnVuY3Rpb24gZGVjb2RlKGJvZHkpIHtcbiAgICB2YXIgZm9ybSA9IG5ldyBGb3JtRGF0YSgpXG4gICAgYm9keS50cmltKCkuc3BsaXQoJyYnKS5mb3JFYWNoKGZ1bmN0aW9uKGJ5dGVzKSB7XG4gICAgICBpZiAoYnl0ZXMpIHtcbiAgICAgICAgdmFyIHNwbGl0ID0gYnl0ZXMuc3BsaXQoJz0nKVxuICAgICAgICB2YXIgbmFtZSA9IHNwbGl0LnNoaWZ0KCkucmVwbGFjZSgvXFwrL2csICcgJylcbiAgICAgICAgdmFyIHZhbHVlID0gc3BsaXQuam9pbignPScpLnJlcGxhY2UoL1xcKy9nLCAnICcpXG4gICAgICAgIGZvcm0uYXBwZW5kKGRlY29kZVVSSUNvbXBvbmVudChuYW1lKSwgZGVjb2RlVVJJQ29tcG9uZW50KHZhbHVlKSlcbiAgICAgIH1cbiAgICB9KVxuICAgIHJldHVybiBmb3JtXG4gIH1cblxuICBmdW5jdGlvbiBoZWFkZXJzKHhocikge1xuICAgIHZhciBoZWFkID0gbmV3IEhlYWRlcnMoKVxuICAgIHZhciBwYWlycyA9ICh4aHIuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzKCkgfHwgJycpLnRyaW0oKS5zcGxpdCgnXFxuJylcbiAgICBwYWlycy5mb3JFYWNoKGZ1bmN0aW9uKGhlYWRlcikge1xuICAgICAgdmFyIHNwbGl0ID0gaGVhZGVyLnRyaW0oKS5zcGxpdCgnOicpXG4gICAgICB2YXIga2V5ID0gc3BsaXQuc2hpZnQoKS50cmltKClcbiAgICAgIHZhciB2YWx1ZSA9IHNwbGl0LmpvaW4oJzonKS50cmltKClcbiAgICAgIGhlYWQuYXBwZW5kKGtleSwgdmFsdWUpXG4gICAgfSlcbiAgICByZXR1cm4gaGVhZFxuICB9XG5cbiAgQm9keS5jYWxsKFJlcXVlc3QucHJvdG90eXBlKVxuXG4gIGZ1bmN0aW9uIFJlc3BvbnNlKGJvZHlJbml0LCBvcHRpb25zKSB7XG4gICAgaWYgKCFvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0ge31cbiAgICB9XG5cbiAgICB0aGlzLnR5cGUgPSAnZGVmYXVsdCdcbiAgICB0aGlzLnN0YXR1cyA9IG9wdGlvbnMuc3RhdHVzXG4gICAgdGhpcy5vayA9IHRoaXMuc3RhdHVzID49IDIwMCAmJiB0aGlzLnN0YXR1cyA8IDMwMFxuICAgIHRoaXMuc3RhdHVzVGV4dCA9IG9wdGlvbnMuc3RhdHVzVGV4dFxuICAgIHRoaXMuaGVhZGVycyA9IG9wdGlvbnMuaGVhZGVycyBpbnN0YW5jZW9mIEhlYWRlcnMgPyBvcHRpb25zLmhlYWRlcnMgOiBuZXcgSGVhZGVycyhvcHRpb25zLmhlYWRlcnMpXG4gICAgdGhpcy51cmwgPSBvcHRpb25zLnVybCB8fCAnJ1xuICAgIHRoaXMuX2luaXRCb2R5KGJvZHlJbml0KVxuICB9XG5cbiAgQm9keS5jYWxsKFJlc3BvbnNlLnByb3RvdHlwZSlcblxuICBSZXNwb25zZS5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKHRoaXMuX2JvZHlJbml0LCB7XG4gICAgICBzdGF0dXM6IHRoaXMuc3RhdHVzLFxuICAgICAgc3RhdHVzVGV4dDogdGhpcy5zdGF0dXNUZXh0LFxuICAgICAgaGVhZGVyczogbmV3IEhlYWRlcnModGhpcy5oZWFkZXJzKSxcbiAgICAgIHVybDogdGhpcy51cmxcbiAgICB9KVxuICB9XG5cbiAgUmVzcG9uc2UuZXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcmVzcG9uc2UgPSBuZXcgUmVzcG9uc2UobnVsbCwge3N0YXR1czogMCwgc3RhdHVzVGV4dDogJyd9KVxuICAgIHJlc3BvbnNlLnR5cGUgPSAnZXJyb3InXG4gICAgcmV0dXJuIHJlc3BvbnNlXG4gIH1cblxuICB2YXIgcmVkaXJlY3RTdGF0dXNlcyA9IFszMDEsIDMwMiwgMzAzLCAzMDcsIDMwOF1cblxuICBSZXNwb25zZS5yZWRpcmVjdCA9IGZ1bmN0aW9uKHVybCwgc3RhdHVzKSB7XG4gICAgaWYgKHJlZGlyZWN0U3RhdHVzZXMuaW5kZXhPZihzdGF0dXMpID09PSAtMSkge1xuICAgICAgdGhyb3cgbmV3IFJhbmdlRXJyb3IoJ0ludmFsaWQgc3RhdHVzIGNvZGUnKVxuICAgIH1cblxuICAgIHJldHVybiBuZXcgUmVzcG9uc2UobnVsbCwge3N0YXR1czogc3RhdHVzLCBoZWFkZXJzOiB7bG9jYXRpb246IHVybH19KVxuICB9XG5cbiAgc2VsZi5IZWFkZXJzID0gSGVhZGVyc1xuICBzZWxmLlJlcXVlc3QgPSBSZXF1ZXN0XG4gIHNlbGYuUmVzcG9uc2UgPSBSZXNwb25zZVxuXG4gIHNlbGYuZmV0Y2ggPSBmdW5jdGlvbihpbnB1dCwgaW5pdCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHZhciByZXF1ZXN0XG4gICAgICBpZiAoUmVxdWVzdC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihpbnB1dCkgJiYgIWluaXQpIHtcbiAgICAgICAgcmVxdWVzdCA9IGlucHV0XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXF1ZXN0ID0gbmV3IFJlcXVlc3QoaW5wdXQsIGluaXQpXG4gICAgICB9XG5cbiAgICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKVxuXG4gICAgICBmdW5jdGlvbiByZXNwb25zZVVSTCgpIHtcbiAgICAgICAgaWYgKCdyZXNwb25zZVVSTCcgaW4geGhyKSB7XG4gICAgICAgICAgcmV0dXJuIHhoci5yZXNwb25zZVVSTFxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQXZvaWQgc2VjdXJpdHkgd2FybmluZ3Mgb24gZ2V0UmVzcG9uc2VIZWFkZXIgd2hlbiBub3QgYWxsb3dlZCBieSBDT1JTXG4gICAgICAgIGlmICgvXlgtUmVxdWVzdC1VUkw6L20udGVzdCh4aHIuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzKCkpKSB7XG4gICAgICAgICAgcmV0dXJuIHhoci5nZXRSZXNwb25zZUhlYWRlcignWC1SZXF1ZXN0LVVSTCcpXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgeGhyLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgb3B0aW9ucyA9IHtcbiAgICAgICAgICBzdGF0dXM6IHhoci5zdGF0dXMsXG4gICAgICAgICAgc3RhdHVzVGV4dDogeGhyLnN0YXR1c1RleHQsXG4gICAgICAgICAgaGVhZGVyczogaGVhZGVycyh4aHIpLFxuICAgICAgICAgIHVybDogcmVzcG9uc2VVUkwoKVxuICAgICAgICB9XG4gICAgICAgIHZhciBib2R5ID0gJ3Jlc3BvbnNlJyBpbiB4aHIgPyB4aHIucmVzcG9uc2UgOiB4aHIucmVzcG9uc2VUZXh0XG4gICAgICAgIHJlc29sdmUobmV3IFJlc3BvbnNlKGJvZHksIG9wdGlvbnMpKVxuICAgICAgfVxuXG4gICAgICB4aHIub25lcnJvciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZWplY3QobmV3IFR5cGVFcnJvcignTmV0d29yayByZXF1ZXN0IGZhaWxlZCcpKVxuICAgICAgfVxuXG4gICAgICB4aHIub250aW1lb3V0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJlamVjdChuZXcgVHlwZUVycm9yKCdOZXR3b3JrIHJlcXVlc3QgZmFpbGVkJykpXG4gICAgICB9XG5cbiAgICAgIHhoci5vcGVuKHJlcXVlc3QubWV0aG9kLCByZXF1ZXN0LnVybCwgdHJ1ZSlcblxuICAgICAgaWYgKHJlcXVlc3QuY3JlZGVudGlhbHMgPT09ICdpbmNsdWRlJykge1xuICAgICAgICB4aHIud2l0aENyZWRlbnRpYWxzID0gdHJ1ZVxuICAgICAgfVxuXG4gICAgICBpZiAoJ3Jlc3BvbnNlVHlwZScgaW4geGhyICYmIHN1cHBvcnQuYmxvYikge1xuICAgICAgICB4aHIucmVzcG9uc2VUeXBlID0gJ2Jsb2InXG4gICAgICB9XG5cbiAgICAgIHJlcXVlc3QuaGVhZGVycy5mb3JFYWNoKGZ1bmN0aW9uKHZhbHVlLCBuYW1lKSB7XG4gICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKG5hbWUsIHZhbHVlKVxuICAgICAgfSlcblxuICAgICAgeGhyLnNlbmQodHlwZW9mIHJlcXVlc3QuX2JvZHlJbml0ID09PSAndW5kZWZpbmVkJyA/IG51bGwgOiByZXF1ZXN0Ll9ib2R5SW5pdClcbiAgICB9KVxuICB9XG4gIHNlbGYuZmV0Y2gucG9seWZpbGwgPSB0cnVlXG59KSh0eXBlb2Ygc2VsZiAhPT0gJ3VuZGVmaW5lZCcgPyBzZWxmIDogdGhpcyk7XG4iLCJpbXBvcnQgJ3doYXR3Zy1mZXRjaCc7XG5cbmNvbnN0IEFQSSA9ICdodHRwczovL2gxc2NvcmUuaGVyb2t1YXBwLmNvbS9hcGknO1xuLy9jb25zdCBBUEkgPSBcImh0dHA6Ly9sb2NhbGhvc3Q6ODA4MC9hcGlcIjtcblxubGV0IGhpc2NvcmVDb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzZWN0aW9uJyk7XG5oaXNjb3JlQ29udGFpbmVyLmNsYXNzTGlzdC5hZGQoJ2hpc2NvcmVzJyk7XG5kb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGhpc2NvcmVDb250YWluZXIpO1xuXG5jb25zdCBoaXNjb3JlID0ge1xuICAgIGdldFNjb3JlczogKCk9PiB7XG4gICAgICAgIGZldGNoKGAke0FQSX0vaDFzY29yZWApXG4gICAgICAgICAgICAudGhlbigocmVzKT0+IHJlcy5qc29uKCkpXG4gICAgICAgICAgICAudGhlbigoaGlzY29yZXMpPT4ge1xuICAgICAgICAgICAgICAgIGhpc2NvcmVDb250YWluZXIuaW5uZXJIVE1MID0gXCJcIjtcbiAgICAgICAgICAgICAgICBoaXNjb3JlLnNjb3JlSGFuZGxlcihoaXNjb3Jlcyk7XG4gICAgICAgICAgICB9KTtcbiAgICB9LFxuICAgIHNjb3JlSGFuZGxlcjogKHNjb3Jlcyk9PiB7XG4gICAgICAgIHNjb3Jlcy5mb3JFYWNoKChzY29yZSk9PiB7XG4gICAgICAgICAgICBsZXQgaXRlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgICAgaXRlbS5jbGFzc0xpc3QuYWRkKCdoaXNjb3Jlcy1zY29yZScpO1xuICAgICAgICAgICAgaXRlbS5pbm5lckhUTUwgPSBgXG4gICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwicmVzdWx0XCI+JHtzY29yZS5zY29yZX08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwibmFtZVwiPiR7c2NvcmUubmFtZX08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJ0aW1lXCI+JHtzY29yZS50aW1lfTwvc3Bhbj5cbiAgICAgICAgICBgO1xuICAgICAgICAgICAgaGlzY29yZUNvbnRhaW5lci5hcHBlbmRDaGlsZChpdGVtKTtcbiAgICAgICAgfSlcbiAgICB9XG59O1xuXG5zZXRJbnRlcnZhbChoaXNjb3JlLmdldFNjb3JlcywgMjUwMDApO1xuaGlzY29yZS5nZXRTY29yZXMoKTtcblxuZXhwb3J0IGRlZmF1bHQgaGlzY29yZTtcbiIsImltcG9ydCBzaW1vbiBmcm9tICcuL3NpbW9uJztcbmltcG9ydCBoaXNjb3JlcyBmcm9tICcuL2hpc2NvcmVzJztcblxuXG4vLyB3aGVuIGZhaWwgZ2FtZSwgc2VuZCBzY29yZSB3aXRoIG5hbWU/XG4vLyBzZW5kIHNjb3JlIHdoZW4gZmFpbC4uLi4gP1xuXG5cbi8vIHNldCB0aGUgc3RhZ2VcbnNpbW9uLmluaXQoKTtcbnNpbW9uLnN0YXJ0R2FtZSgpO1xuXG5cbiIsImltcG9ydCAnd2hhdHdnLWZldGNoJztcbi8vIHNpbW9uIHNheXNcbmNvbnN0IElOVEVSVkFMID0gNzUwO1xuY29uc3QgQlVUVE9OUyA9IDM7XG5sZXQgb3JkZXJBcnIgPSBbMSwyLDNdO1xubGV0IHRpbWVPZlBsYXkgPSAwO1xuXG5jb25zdCBBUEkgPSAnaHR0cHM6Ly9oMXNjb3JlLmhlcm9rdWFwcC5jb20vYXBpL2gxc2NvcmUnO1xuLy8gY29uc3QgQVBJID0gJy9hcGkvaDFzY29yZSc7XG5cbmZ1bmN0aW9uIGluaXQoKSB7XG4gIGZvcihsZXQgaT1CVVRUT05TO2k+MDtpLS0pIHtcbiAgICBsZXQgYnV0dG9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7XG4gICAgYnV0dG9uLmRhdGFzZXQuc2ltb24gPSBpO1xuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoYnV0dG9uKTtcbiAgfVxuXG4gIGRvY3VtZW50LmJvZHkuYWRkRXZlbnRMaXN0ZW5lcigna2V5cHJlc3MnLCAoZXZ0KSA9PiB7XG4gICAgc3dpdGNoKGV2dC5rZXkpIHtcbiAgICAgIGNhc2UgJ3onOlxuICAgICAgY2xpY2tIYW5kbGVyKDEpXG4gICAgICBicmVhaztcbiAgICAgY2FzZSAneCc6XG4gICAgICBjbGlja0hhbmRsZXIoMilcbiAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnYyc6XG4gICAgICBjbGlja0hhbmRsZXIoMyk7XG4gICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICBicmVhaztcbiAgICB9XG4gIH0pO1xuXG4gIGRvY3VtZW50LmJvZHkuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZWwpID0+IHtcbiAgICBsZXQgaWR4ID0gZWwudGFyZ2V0LmRhdGFzZXQuc2ltb247XG4gICAgY2xpY2tIYW5kbGVyKGlkeCk7XG4gIH0pO1xuXG4gIGNvbnN0IHNjb3JlS2VlcGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gIHNjb3JlS2VlcGVyLmNsYXNzTGlzdC5hZGQoJ3Njb3JlJyk7XG4gIHNjb3JlS2VlcGVyLmlubmVySFRNTCA9IFwiMFwiO1xuICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHNjb3JlS2VlcGVyKTtcblxufVxuXG5cbmZ1bmN0aW9uIGNsaWNrSGFuZGxlcihpZHgpIHtcbiAgICBsaWdodEJ1dHRvbihpZHgpO1xuICAgXG4gICAgaWYgKGlkeCA9PSBvcmRlckFyclt0aW1lT2ZQbGF5XSkge1xuICAgICAgICB0aW1lT2ZQbGF5Kys7XG4gICAgICAgIFxuICAgICAgICBpZiAodGltZU9mUGxheSA9PSBvcmRlckFyci5sZW5ndGgpIHtcbiAgICAgICAgICAgIGRyYXdTY29yZSh0aW1lT2ZQbGF5KTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4gYWRkTmV3TW92ZXMob3JkZXJBcnIpLCAxMjAwKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGVuZEdhbWUoKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gcmFuZG9tQnV0dG9uKCkge1xuICAgIGxldCBtYXggPSBCVVRUT05TO1xuICAgIGxldCBtaW4gPSAwO1xuICAgIHJldHVybiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluKSArIDEpO1xufVxuXG4vLyBzdGFydEdhbWUgZm9yIGFtb3VudCBvZiBvcmRlcnNcbi8vIGZpcnN0IHRpbWUgcGxheSwgcHVzaCB0byB0aGUgYXJyYXkuXG5mdW5jdGlvbiBzdGFydEdhbWUob3JkZXI9MCkge1xuICAgIHRpbWVPZlBsYXkgPSAwO1xuICAgIGRyYXdTY29yZSgwKTtcbiAgICBpZiAob3JkZXIgPCBvcmRlckFyci5sZW5ndGgpIHtcbiAgICAgICAgcGxheU1vdmVzKG9yZGVyQXJyKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGFkZE5ld01vdmVzKGFycikge1xuICAgIHRpbWVPZlBsYXkgPSAwO1xuICAgIHBsYXlNb3ZlcyhhcnIpO1xuICAgIFxuICAgIGxldCBpbmRleCA9IHJhbmRvbUJ1dHRvbigpO1xuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICBsaWdodEJ1dHRvbihpbmRleCk7XG4gICAgICAgIG9yZGVyQXJyLnB1c2goaW5kZXgpO1xuICAgIH0sIChJTlRFUlZBTCAqIG9yZGVyQXJyLmxlbmd0aCkpO1xufVxuXG5mdW5jdGlvbiBwbGF5TW92ZXMoYXJyKSB7XG4gICAgdGltZU9mUGxheSA9IDA7XG4gICAgaWYoYXJyLmxlbmd0aD4wKSB7XG4gICAgICAgIGxldCBpbmRleCA9IGFyclswXTtcbiAgICAgICAgbGlnaHRCdXR0b24oaW5kZXgpO1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIHBsYXlNb3ZlcyhhcnIuc2xpY2UoMSkpO1xuICAgICAgICB9LCBJTlRFUlZBTCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBlbmRHYW1lKCkge1xuICAgIGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LmFkZCgnZmFpbGVkJyk7XG5cbiAgZ2V0TmFtZSgpO1xuXG4gICAgc2V0VGltZW91dCgoKT0+IHtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QucmVtb3ZlKCdmYWlsZWQnKTtcbiAgICAgICAgb3JkZXJBcnIgPSBbMSwyLDNdO1xuICAgICAgICBkcmF3U2NvcmUoMCk7XG4gICAgICAgIHNldFRpbWVvdXQoc3RhcnRHYW1lKCksIDE2MDApO1xuICAgIH0sIDE1MDApOyAgICBcbn1cblxuXG5sZXQgcGxheWVyTmFtZSA9IFwiXCI7XG5jb25zdCBuYW1lVGVtcGxhdGUgPSBgXG4gIDxkaXYgY2xhc3M9XCJmb3JtLW5hbWVfX25ld1wiPlxuICA8aW5wdXQgcGxhY2Vob2xkZXI9XCJOYW1lXCI+XG4gIDxidXR0b24gY2xhc3M9XCJidXR0b24tLXNlY29uZGFyeVwiIHR5cGU9XCJidXR0b25cIj5za2lwLi48L2J1dHRvbj5cbiAgPC9kaXY+XG4gIFxuICA8ZGl2IGNsYXNzPVwiZm9ybS1uYW1lX19leGlzdFwiPlxuICA8aDIgY2xhc3M9XCJuYW1lLWZvcm1fX3RpdGxlXCI+PHNwYW4+QXJlIHlvdTwvc3Bhbj4gJHtwbGF5ZXJOYW1lfT88L2gyPlxuICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIj5uby48L2J1dHRvbj5cbiAgPC9kaXY+XG5gO1xuXG5sZXQgZm9ybUNvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2Zvcm0nKTtcbmZvcm1Db250YWluZXIuY2xhc3NMaXN0LmFkZCgnbmFtZS1mb3JtJyk7XG5mb3JtQ29udGFpbmVyLmRhdGFzZXQuc3RhdGUgPSAndW5zZXQnO1xuZm9ybUNvbnRhaW5lci5pbm5lckhUTUwgPSBuYW1lVGVtcGxhdGU7XG5kb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGZvcm1Db250YWluZXIpO1xuXG5cbmNvbnN0IG5hbWVIYW5kbGVyID0ge1xuICAgIGluaXQ6ICgpPT4ge30sXG4gICAgc3VibWl0OiAoKT0+IHt9XG59O1xuXG5mdW5jdGlvbiBsaWdodEJ1dHRvbihpbmRleCwgc3BlZWQ9MjAwKSB7XG4gICAgbGV0IGJ1dHRvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoYFtkYXRhLXNpbW9uPVwiJHtpbmRleH1cIl1gKVswXTtcbiAgICBidXR0b24uY2xhc3NMaXN0LnRvZ2dsZSgnYWN0aXZlJyk7XG4gICAgbGV0IGF1ZGlvID0gbmV3IEF1ZGlvKGBiZWVwcy9iZWVwJHtpbmRleH0ud2F2YCk7XG4gICAgYXVkaW8udm9sdW1lID0gMC4xO1xuICAgIGF1ZGlvLnBsYXkoKTtcblxuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICBidXR0b24uY2xhc3NMaXN0LnRvZ2dsZSgnYWN0aXZlJyk7XG4gICAgfSwgc3BlZWQpO1xufVxuXG5mdW5jdGlvbiBkcmF3U2NvcmUoc2NvcmU9MCkge1xuICAgIGxldCBrZWVwZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuc2NvcmUnKTtcbiAgICBrZWVwZXIuY2xhc3NMaXN0LnRvZ2dsZSgndXBkYXRlZCcpO1xuICAgIGtlZXBlci5pbm5lckhUTUwgPSBzY29yZTtcbiAgICBzZXRUaW1lb3V0KCgpPT4ge1xuICAgICAgICBrZWVwZXIuY2xhc3NMaXN0LnRvZ2dsZSgndXBkYXRlZCcpO1xuICAgIH0sIDEwMCk7XG59XG5cbmZ1bmN0aW9uIHBvc3RTY29yZShuYW1lKSB7XG4gIC8vIFBPU1Qgc2NvcmVzXG4gIGlmKG9yZGVyQXJyLmxlbmd0aCA+IDIpIHtcbiAgICBsZXQgZGF0YSA9IHtcbiAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBuYW1lLCBzY29yZTogb3JkZXJBcnIubGVuZ3RoIH0pLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICAnQWNjZXB0JzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nXG4gICAgICB9XG4gICAgfTtcblxuICAgIGxldCByZXF1ZXN0ID0gbmV3IFJlcXVlc3QoQVBJLCBkYXRhKTtcbiAgICBmZXRjaChyZXF1ZXN0KS50aGVuKChyZXNwb25zZSk9PiB7XG4gICAgICByZXR1cm4gcmVzcG9uc2UuanNvbigpXG4gICAgfSkudGhlbigocmVzKT0+e1xuICAgICAgLy8gY29uc29sZS5sb2cocmVzKTtcbiAgICB9KTtcbiAgfVxufVxuXG5jb25zdCBzaW1vbiA9IHtcbiAgaW5pdCxcbiAgc3RhcnRHYW1lLFxuICBlbmRHYW1lXG59O1xuXG5leHBvcnQgZGVmYXVsdCBzaW1vbjtcbiJdfQ==
