"no use strict";
(function (e) {
  if (typeof e.window != "undefined" && e.document) return;
  (e.console = function () {
    var e = Array.prototype.slice.call(arguments, 0);
    postMessage({ type: "log", data: e });
  }),
    (e.console.error = e.console.warn = e.console.log = e.console.trace = e.console),
    (e.window = e),
    (e.ace = e),
    (e.onerror = function (e, t, n, r, i) {
      console.error("Worker " + (i ? i.stack : e));
    }),
    (e.normalizeModule = function (t, n) {
      if (n.indexOf("!") !== -1) {
        var r = n.split("!");
        return e.normalizeModule(t, r[0]) + "!" + e.normalizeModule(t, r[1]);
      }
      if (n.charAt(0) == ".") {
        var i = t.split("/").slice(0, -1).join("/");
        n = (i ? i + "/" : "") + n;
        while (n.indexOf(".") !== -1 && s != n) {
          var s = n;
          n = n
            .replace(/^\.\//, "")
            .replace(/\/\.\//, "/")
            .replace(/[^\/]+\/\.\.\//, "");
        }
      }
      return n;
    }),
    (e.require = function (t, n) {
      n || ((n = t), (t = null));
      if (!n.charAt) throw new Error("worker.js require() accepts only (parentId, id) as arguments");
      n = e.normalizeModule(t, n);
      var r = e.require.modules[n];
      if (r) return r.initialized || ((r.initialized = !0), (r.exports = r.factory().exports)), r.exports;
      var i = n.split("/");
      if (!e.require.tlns) return console.log("unable to load " + n);
      i[0] = e.require.tlns[i[0]] || i[0];
      var s = i.join("/") + ".js";
      return (e.require.id = n), importScripts(s), e.require(t, n);
    }),
    (e.require.modules = {}),
    (e.require.tlns = {}),
    (e.define = function (t, n, r) {
      arguments.length == 2
        ? ((r = n), typeof t != "string" && ((n = t), (t = e.require.id)))
        : arguments.length == 1 && ((r = t), (n = []), (t = e.require.id)),
        n.length || (n = ["require", "exports", "module"]);
      if (t.indexOf("text!") === 0) return;
      var i = function (n) {
        return e.require(t, n);
      };
      e.require.modules[t] = {
        exports: {},
        factory: function () {
          var e = this,
            t = r.apply(
              this,
              n.map(function (t) {
                switch (t) {
                  case "require":
                    return i;
                  case "exports":
                    return e.exports;
                  case "module":
                    return e;
                  default:
                    return i(t);
                }
              })
            );
          return t && (e.exports = t), e;
        },
      };
    }),
    (e.define.amd = {}),
    (e.initBaseUrls = function (e) {
      require.tlns = e;
    }),
    (e.initSender = function () {
      var t = e.require("ace/lib/event_emitter").EventEmitter,
        n = e.require("ace/lib/oop"),
        r = function () {};
      return (
        function () {
          n.implement(this, t),
            (this.callback = function (e, t) {
              postMessage({ type: "call", id: t, data: e });
            }),
            (this.emit = function (e, t) {
              postMessage({ type: "event", name: e, data: t });
            });
        }.call(r.prototype),
        new r()
      );
    });
  var t = (e.main = null),
    n = (e.sender = null);
  e.onmessage = function (r) {
    var i = r.data;
    if (i.command) {
      if (!t[i.command]) throw new Error("Unknown command:" + i.command);
      t[i.command].apply(t, i.args);
    } else if (i.init) {
      initBaseUrls(i.tlns), require("ace/lib/es5-shim"), (n = e.sender = initSender());
      var s = require(i.module)[i.classname];
      t = e.main = new s(n);
    } else i.event && n && n._signal(i.event, i.data);
  };
})(this),
  define(
    "ace/mode/javascript_worker",
    ["require", "exports", "module", "ace/lib/oop", "ace/worker/mirror", "ace/mode/javascript/jshint"],
    function (require, exports, module) {
      function startRegex(e) {
        return RegExp("^(" + e.join("|") + ")");
      }
      var oop = require("../lib/oop"),
        Mirror = require("../worker/mirror").Mirror,
        lint = require("./javascript/jshint").JSHINT,
        disabledWarningsRe = startRegex(["Bad for in variable '(.+)'.", 'Missing "use strict"']),
        errorsRe = startRegex([
          "Unexpected",
          "Expected ",
          "Confusing (plus|minus)",
          "\\{a\\} unterminated regular expression",
          "Unclosed ",
          "Unmatched ",
          "Unbegun comment",
          "Bad invocation",
          "Missing space after",
          "Missing operator at",
        ]),
        infoRe = startRegex([
          "Expected an assignment",
          "Bad escapement of EOL",
          "Unexpected comma",
          "Unexpected space",
          "Missing radix parameter.",
          "A leading decimal point can",
          "\\['{a}'\\] is better written in dot notation.",
          "'{a}' used out of scope",
        ]),
        JavaScriptWorker = (exports.JavaScriptWorker = function (e) {
          Mirror.call(this, e), this.setTimeout(500), this.setOptions();
        });
      oop.inherits(JavaScriptWorker, Mirror),
        function () {
          (this.setOptions = function (e) {
            (this.options = e || {
              esnext: !0,
              moz: !0,
              devel: !0,
              browser: !0,
              node: !0,
              laxcomma: !0,
              laxbreak: !0,
              lastsemic: !0,
              onevar: !1,
              passfail: !1,
              maxerr: 100,
              expr: !0,
              multistr: !0,
              globalstrict: !0,
            }),
              this.doc.getValue() && this.deferredUpdate.schedule(100);
          }),
            (this.changeOptions = function (e) {
              oop.mixin(this.options, e), this.doc.getValue() && this.deferredUpdate.schedule(100);
            }),
            (this.isValidJS = function (str) {
              try {
                eval("throw 0;" + str);
              } catch (e) {
                if (e === 0) return !0;
              }
              return !1;
            }),
            (this.onUpdate = function () {
              var e = this.doc.getValue();
              e = e.replace(/^#!.*\n/, "\n");
              if (!e) {
                this.sender.emit("jslint", []);
                return;
              }
              var t = [],
                n = this.isValidJS(e) ? "warning" : "error";
              lint(e, this.options);
              var r = lint.errors,
                i = !1;
              for (var s = 0; s < r.length; s++) {
                var o = r[s];
                if (!o) continue;
                var u = o.raw,
                  a = "warning";
                if (u == "Missing semicolon.") {
                  var f = o.evidence.substr(o.character);
                  (f = f.charAt(f.search(/\S/))),
                    n == "error" && f && /[\w\d{(['"]/.test(f)
                      ? ((o.reason = 'Missing ";" before statement'), (a = "error"))
                      : (a = "info");
                } else {
                  if (disabledWarningsRe.test(u)) continue;
                  infoRe.test(u)
                    ? (a = "info")
                    : errorsRe.test(u)
                    ? ((i = !0), (a = n))
                    : u == "'{a}' is not defined."
                    ? (a = "warning")
                    : u == "'{a}' is defined but never used." && (a = "info");
                }
                t.push({ row: o.line - 1, column: o.character - 1, text: o.reason, type: a, raw: u }), i;
              }
              this.sender.emit("jslint", t);
            });
        }.call(JavaScriptWorker.prototype);
    }
  ),
  define("ace/lib/oop", ["require", "exports", "module"], function (e, t, n) {
    (t.inherits = function (e, t) {
      (e.super_ = t),
        (e.prototype = Object.create(t.prototype, {
          constructor: { value: e, enumerable: !1, writable: !0, configurable: !0 },
        }));
    }),
      (t.mixin = function (e, t) {
        for (var n in t) e[n] = t[n];
        return e;
      }),
      (t.implement = function (e, n) {
        t.mixin(e, n);
      });
  }),
  define("ace/worker/mirror", ["require", "exports", "module", "ace/document", "ace/lib/lang"], function (e, t, n) {
    var r = e("../document").Document,
      i = e("../lib/lang"),
      s = (t.Mirror = function (e) {
        this.sender = e;
        var t = (this.doc = new r("")),
          n = (this.deferredUpdate = i.delayedCall(this.onUpdate.bind(this))),
          s = this;
        e.on("change", function (e) {
          t.applyDeltas(e.data);
          if (s.$timeout) return n.schedule(s.$timeout);
          s.onUpdate();
        });
      });
    (function () {
      (this.$timeout = 500),
        (this.setTimeout = function (e) {
          this.$timeout = e;
        }),
        (this.setValue = function (e) {
          this.doc.setValue(e), this.deferredUpdate.schedule(this.$timeout);
        }),
        (this.getValue = function (e) {
          this.sender.callback(this.doc.getValue(), e);
        }),
        (this.onUpdate = function () {}),
        (this.isPending = function () {
          return this.deferredUpdate.isPending();
        });
    }.call(s.prototype));
  }),
  define("ace/lib/es5-shim", ["require", "exports", "module"], function (e, t, n) {
    function r() {}
    function i(e) {
      try {
        return Object.defineProperty(e, "sentinel", {}), "sentinel" in e;
      } catch (t) {}
    }
    function s(e) {
      return (
        (e = +e),
        e !== e ? (e = 0) : e !== 0 && e !== 1 / 0 && e !== -1 / 0 && (e = (e > 0 || -1) * Math.floor(Math.abs(e))),
        e
      );
    }
    function o(e) {
      var t = typeof e;
      return e === null || t === "undefined" || t === "boolean" || t === "number" || t === "string";
    }
    function u(e) {
      var t, n, r;
      if (o(e)) return e;
      n = e.valueOf;
      if (typeof n == "function") {
        t = n.call(e);
        if (o(t)) return t;
      }
      r = e.toString;
      if (typeof r == "function") {
        t = r.call(e);
        if (o(t)) return t;
      }
      throw new TypeError();
    }
    Function.prototype.bind ||
      (Function.prototype.bind = function (e) {
        var t = this;
        if (typeof t != "function") throw new TypeError("Function.prototype.bind called on incompatible " + t);
        var n = c.call(arguments, 1),
          i = function () {
            if (this instanceof i) {
              var r = t.apply(this, n.concat(c.call(arguments)));
              return Object(r) === r ? r : this;
            }
            return t.apply(e, n.concat(c.call(arguments)));
          };
        return t.prototype && ((r.prototype = t.prototype), (i.prototype = new r()), (r.prototype = null)), i;
      });
    var a = Function.prototype.call,
      f = Array.prototype,
      l = Object.prototype,
      c = f.slice,
      h = a.bind(l.toString),
      p = a.bind(l.hasOwnProperty),
      d,
      v,
      m,
      g,
      y;
    if ((y = p(l, "__defineGetter__")))
      (d = a.bind(l.__defineGetter__)),
        (v = a.bind(l.__defineSetter__)),
        (m = a.bind(l.__lookupGetter__)),
        (g = a.bind(l.__lookupSetter__));
    if ([1, 2].splice(0).length != 2)
      if (
        !(function () {
          function e(e) {
            var t = new Array(e + 2);
            return (t[0] = t[1] = 0), t;
          }
          var t = [],
            n;
          t.splice.apply(t, e(20)), t.splice.apply(t, e(26)), (n = t.length), t.splice(5, 0, "XXX"), n + 1 == t.length;
          if (n + 1 == t.length) return !0;
        })()
      )
        Array.prototype.splice = function (e, t) {
          var n = this.length;
          e > 0 ? e > n && (e = n) : e == void 0 ? (e = 0) : e < 0 && (e = Math.max(n + e, 0)),
            e + t < n || (t = n - e);
          var r = this.slice(e, e + t),
            i = c.call(arguments, 2),
            s = i.length;
          if (e === n) s && this.push.apply(this, i);
          else {
            var o = Math.min(t, n - e),
              u = e + o,
              a = u + s - o,
              f = n - u,
              l = n - o;
            if (a < u) for (var h = 0; h < f; ++h) this[a + h] = this[u + h];
            else if (a > u) for (h = f; h--; ) this[a + h] = this[u + h];
            if (s && e === l) (this.length = l), this.push.apply(this, i);
            else {
              this.length = l + s;
              for (h = 0; h < s; ++h) this[e + h] = i[h];
            }
          }
          return r;
        };
      else {
        var b = Array.prototype.splice;
        Array.prototype.splice = function (e, t) {
          return arguments.length
            ? b.apply(this, [e === void 0 ? 0 : e, t === void 0 ? this.length - e : t].concat(c.call(arguments, 2)))
            : [];
        };
      }
    Array.isArray ||
      (Array.isArray = function (e) {
        return h(e) == "[object Array]";
      });
    var w = Object("a"),
      E = w[0] != "a" || !(0 in w);
    Array.prototype.forEach ||
      (Array.prototype.forEach = function (e) {
        var t = F(this),
          n = E && h(this) == "[object String]" ? this.split("") : t,
          r = arguments[1],
          i = -1,
          s = n.length >>> 0;
        if (h(e) != "[object Function]") throw new TypeError();
        while (++i < s) i in n && e.call(r, n[i], i, t);
      }),
      Array.prototype.map ||
        (Array.prototype.map = function (e) {
          var t = F(this),
            n = E && h(this) == "[object String]" ? this.split("") : t,
            r = n.length >>> 0,
            i = Array(r),
            s = arguments[1];
          if (h(e) != "[object Function]") throw new TypeError(e + " is not a function");
          for (var o = 0; o < r; o++) o in n && (i[o] = e.call(s, n[o], o, t));
          return i;
        }),
      Array.prototype.filter ||
        (Array.prototype.filter = function (e) {
          var t = F(this),
            n = E && h(this) == "[object String]" ? this.split("") : t,
            r = n.length >>> 0,
            i = [],
            s,
            o = arguments[1];
          if (h(e) != "[object Function]") throw new TypeError(e + " is not a function");
          for (var u = 0; u < r; u++) u in n && ((s = n[u]), e.call(o, s, u, t) && i.push(s));
          return i;
        }),
      Array.prototype.every ||
        (Array.prototype.every = function (e) {
          var t = F(this),
            n = E && h(this) == "[object String]" ? this.split("") : t,
            r = n.length >>> 0,
            i = arguments[1];
          if (h(e) != "[object Function]") throw new TypeError(e + " is not a function");
          for (var s = 0; s < r; s++) if (s in n && !e.call(i, n[s], s, t)) return !1;
          return !0;
        }),
      Array.prototype.some ||
        (Array.prototype.some = function (e) {
          var t = F(this),
            n = E && h(this) == "[object String]" ? this.split("") : t,
            r = n.length >>> 0,
            i = arguments[1];
          if (h(e) != "[object Function]") throw new TypeError(e + " is not a function");
          for (var s = 0; s < r; s++) if (s in n && e.call(i, n[s], s, t)) return !0;
          return !1;
        }),
      Array.prototype.reduce ||
        (Array.prototype.reduce = function (e) {
          var t = F(this),
            n = E && h(this) == "[object String]" ? this.split("") : t,
            r = n.length >>> 0;
          if (h(e) != "[object Function]") throw new TypeError(e + " is not a function");
          if (!r && arguments.length == 1) throw new TypeError("reduce of empty array with no initial value");
          var i = 0,
            s;
          if (arguments.length >= 2) s = arguments[1];
          else
            do {
              if (i in n) {
                s = n[i++];
                break;
              }
              if (++i >= r) throw new TypeError("reduce of empty array with no initial value");
            } while (!0);
          for (; i < r; i++) i in n && (s = e.call(void 0, s, n[i], i, t));
          return s;
        }),
      Array.prototype.reduceRight ||
        (Array.prototype.reduceRight = function (e) {
          var t = F(this),
            n = E && h(this) == "[object String]" ? this.split("") : t,
            r = n.length >>> 0;
          if (h(e) != "[object Function]") throw new TypeError(e + " is not a function");
          if (!r && arguments.length == 1) throw new TypeError("reduceRight of empty array with no initial value");
          var i,
            s = r - 1;
          if (arguments.length >= 2) i = arguments[1];
          else
            do {
              if (s in n) {
                i = n[s--];
                break;
              }
              if (--s < 0) throw new TypeError("reduceRight of empty array with no initial value");
            } while (!0);
          do s in this && (i = e.call(void 0, i, n[s], s, t));
          while (s--);
          return i;
        });
    if (!Array.prototype.indexOf || [0, 1].indexOf(1, 2) != -1)
      Array.prototype.indexOf = function (e) {
        var t = E && h(this) == "[object String]" ? this.split("") : F(this),
          n = t.length >>> 0;
        if (!n) return -1;
        var r = 0;
        arguments.length > 1 && (r = s(arguments[1])), (r = r >= 0 ? r : Math.max(0, n + r));
        for (; r < n; r++) if (r in t && t[r] === e) return r;
        return -1;
      };
    if (!Array.prototype.lastIndexOf || [0, 1].lastIndexOf(0, -3) != -1)
      Array.prototype.lastIndexOf = function (e) {
        var t = E && h(this) == "[object String]" ? this.split("") : F(this),
          n = t.length >>> 0;
        if (!n) return -1;
        var r = n - 1;
        arguments.length > 1 && (r = Math.min(r, s(arguments[1]))), (r = r >= 0 ? r : n - Math.abs(r));
        for (; r >= 0; r--) if (r in t && e === t[r]) return r;
        return -1;
      };
    Object.getPrototypeOf ||
      (Object.getPrototypeOf = function (e) {
        return e.__proto__ || (e.constructor ? e.constructor.prototype : l);
      });
    if (!Object.getOwnPropertyDescriptor) {
      var S = "Object.getOwnPropertyDescriptor called on a non-object: ";
      Object.getOwnPropertyDescriptor = function (e, t) {
        if ((typeof e != "object" && typeof e != "function") || e === null) throw new TypeError(S + e);
        if (!p(e, t)) return;
        var n, r, i;
        n = { enumerable: !0, configurable: !0 };
        if (y) {
          var s = e.__proto__;
          e.__proto__ = l;
          var r = m(e, t),
            i = g(e, t);
          e.__proto__ = s;
          if (r || i) return r && (n.get = r), i && (n.set = i), n;
        }
        return (n.value = e[t]), n;
      };
    }
    Object.getOwnPropertyNames ||
      (Object.getOwnPropertyNames = function (e) {
        return Object.keys(e);
      });
    if (!Object.create) {
      var x;
      Object.prototype.__proto__ === null
        ? (x = function () {
            return { __proto__: null };
          })
        : (x = function () {
            var e = {};
            for (var t in e) e[t] = null;
            return (
              (e.constructor =
                e.hasOwnProperty =
                e.propertyIsEnumerable =
                e.isPrototypeOf =
                e.toLocaleString =
                e.toString =
                e.valueOf =
                e.__proto__ =
                  null),
              e
            );
          }),
        (Object.create = function (e, t) {
          var n;
          if (e === null) n = x();
          else {
            if (typeof e != "object") throw new TypeError("typeof prototype[" + typeof e + "] != 'object'");
            var r = function () {};
            (r.prototype = e), (n = new r()), (n.__proto__ = e);
          }
          return t !== void 0 && Object.defineProperties(n, t), n;
        });
    }
    if (Object.defineProperty) {
      var T = i({}),
        N = typeof document == "undefined" || i(document.createElement("div"));
      if (!T || !N) var C = Object.defineProperty;
    }
    if (!Object.defineProperty || C) {
      var k = "Property description must be an object: ",
        L = "Object.defineProperty called on non-object: ",
        A = "getters & setters can not be defined on this javascript engine";
      Object.defineProperty = function (e, t, n) {
        if ((typeof e != "object" && typeof e != "function") || e === null) throw new TypeError(L + e);
        if ((typeof n != "object" && typeof n != "function") || n === null) throw new TypeError(k + n);
        if (C)
          try {
            return C.call(Object, e, t, n);
          } catch (r) {}
        if (p(n, "value"))
          if (y && (m(e, t) || g(e, t))) {
            var i = e.__proto__;
            (e.__proto__ = l), delete e[t], (e[t] = n.value), (e.__proto__ = i);
          } else e[t] = n.value;
        else {
          if (!y) throw new TypeError(A);
          p(n, "get") && d(e, t, n.get), p(n, "set") && v(e, t, n.set);
        }
        return e;
      };
    }
    Object.defineProperties ||
      (Object.defineProperties = function (e, t) {
        for (var n in t) p(t, n) && Object.defineProperty(e, n, t[n]);
        return e;
      }),
      Object.seal ||
        (Object.seal = function (e) {
          return e;
        }),
      Object.freeze ||
        (Object.freeze = function (e) {
          return e;
        });
    try {
      Object.freeze(function () {});
    } catch (O) {
      Object.freeze = (function (e) {
        return function (t) {
          return typeof t == "function" ? t : e(t);
        };
      })(Object.freeze);
    }
    Object.preventExtensions ||
      (Object.preventExtensions = function (e) {
        return e;
      }),
      Object.isSealed ||
        (Object.isSealed = function (e) {
          return !1;
        }),
      Object.isFrozen ||
        (Object.isFrozen = function (e) {
          return !1;
        }),
      Object.isExtensible ||
        (Object.isExtensible = function (e) {
          if (Object(e) === e) throw new TypeError();
          var t = "";
          while (p(e, t)) t += "?";
          e[t] = !0;
          var n = p(e, t);
          return delete e[t], n;
        });
    if (!Object.keys) {
      var M = !0,
        _ = [
          "toString",
          "toLocaleString",
          "valueOf",
          "hasOwnProperty",
          "isPrototypeOf",
          "propertyIsEnumerable",
          "constructor",
        ],
        D = _.length;
      for (var P in { toString: null }) M = !1;
      Object.keys = function I(e) {
        if ((typeof e != "object" && typeof e != "function") || e === null)
          throw new TypeError("Object.keys called on a non-object");
        var I = [];
        for (var t in e) p(e, t) && I.push(t);
        if (M)
          for (var n = 0, r = D; n < r; n++) {
            var i = _[n];
            p(e, i) && I.push(i);
          }
        return I;
      };
    }
    Date.now ||
      (Date.now = function () {
        return new Date().getTime();
      });
    var H = "	\n\f\r   ᠎             　\u2028\u2029﻿";
    if (!String.prototype.trim || H.trim()) {
      H = "[" + H + "]";
      var B = new RegExp("^" + H + H + "*"),
        j = new RegExp(H + H + "*$");
      String.prototype.trim = function () {
        return String(this).replace(B, "").replace(j, "");
      };
    }
    var F = function (e) {
      if (e == null) throw new TypeError("can't convert " + e + " to object");
      return Object(e);
    };
  }),
  define("ace/lib/event_emitter", ["require", "exports", "module"], function (e, t, n) {
    var r = {},
      i = function () {
        this.propagationStopped = !0;
      },
      s = function () {
        this.defaultPrevented = !0;
      };
    (r._emit = r._dispatchEvent =
      function (e, t) {
        this._eventRegistry || (this._eventRegistry = {}), this._defaultHandlers || (this._defaultHandlers = {});
        var n = this._eventRegistry[e] || [],
          r = this._defaultHandlers[e];
        if (!n.length && !r) return;
        if (typeof t != "object" || !t) t = {};
        t.type || (t.type = e),
          t.stopPropagation || (t.stopPropagation = i),
          t.preventDefault || (t.preventDefault = s),
          (n = n.slice());
        for (var o = 0; o < n.length; o++) {
          n[o](t, this);
          if (t.propagationStopped) break;
        }
        if (r && !t.defaultPrevented) return r(t, this);
      }),
      (r._signal = function (e, t) {
        var n = (this._eventRegistry || {})[e];
        if (!n) return;
        n = n.slice();
        for (var r = 0; r < n.length; r++) n[r](t, this);
      }),
      (r.once = function (e, t) {
        var n = this;
        t &&
          this.addEventListener(e, function r() {
            n.removeEventListener(e, r), t.apply(null, arguments);
          });
      }),
      (r.setDefaultHandler = function (e, t) {
        var n = this._defaultHandlers;
        n || (n = this._defaultHandlers = { _disabled_: {} });
        if (n[e]) {
          var r = n[e],
            i = n._disabled_[e];
          i || (n._disabled_[e] = i = []), i.push(r);
          var s = i.indexOf(t);
          s != -1 && i.splice(s, 1);
        }
        n[e] = t;
      }),
      (r.removeDefaultHandler = function (e, t) {
        var n = this._defaultHandlers;
        if (!n) return;
        var r = n._disabled_[e];
        if (n[e] == t) {
          var i = n[e];
          r && this.setDefaultHandler(e, r.pop());
        } else if (r) {
          var s = r.indexOf(t);
          s != -1 && r.splice(s, 1);
        }
      }),
      (r.on = r.addEventListener =
        function (e, t, n) {
          this._eventRegistry = this._eventRegistry || {};
          var r = this._eventRegistry[e];
          return r || (r = this._eventRegistry[e] = []), r.indexOf(t) == -1 && r[n ? "unshift" : "push"](t), t;
        }),
      (r.off =
        r.removeListener =
        r.removeEventListener =
          function (e, t) {
            this._eventRegistry = this._eventRegistry || {};
            var n = this._eventRegistry[e];
            if (!n) return;
            var r = n.indexOf(t);
            r !== -1 && n.splice(r, 1);
          }),
      (r.removeAllListeners = function (e) {
        this._eventRegistry && (this._eventRegistry[e] = []);
      }),
      (t.EventEmitter = r);
  }),
  define("ace/range", ["require", "exports", "module"], function (e, t, n) {
    var r = function (e, t) {
        return e.row - t.row || e.column - t.column;
      },
      i = function (e, t, n, r) {
        (this.start = { row: e, column: t }), (this.end = { row: n, column: r });
      };
    (function () {
      (this.isEqual = function (e) {
        return (
          this.start.row === e.start.row &&
          this.end.row === e.end.row &&
          this.start.column === e.start.column &&
          this.end.column === e.end.column
        );
      }),
        (this.toString = function () {
          return (
            "Range: [" +
            this.start.row +
            "/" +
            this.start.column +
            "] -> [" +
            this.end.row +
            "/" +
            this.end.column +
            "]"
          );
        }),
        (this.contains = function (e, t) {
          return this.compare(e, t) == 0;
        }),
        (this.compareRange = function (e) {
          var t,
            n = e.end,
            r = e.start;
          return (
            (t = this.compare(n.row, n.column)),
            t == 1
              ? ((t = this.compare(r.row, r.column)), t == 1 ? 2 : t == 0 ? 1 : 0)
              : t == -1
              ? -2
              : ((t = this.compare(r.row, r.column)), t == -1 ? -1 : t == 1 ? 42 : 0)
          );
        }),
        (this.comparePoint = function (e) {
          return this.compare(e.row, e.column);
        }),
        (this.containsRange = function (e) {
          return this.comparePoint(e.start) == 0 && this.comparePoint(e.end) == 0;
        }),
        (this.intersects = function (e) {
          var t = this.compareRange(e);
          return t == -1 || t == 0 || t == 1;
        }),
        (this.isEnd = function (e, t) {
          return this.end.row == e && this.end.column == t;
        }),
        (this.isStart = function (e, t) {
          return this.start.row == e && this.start.column == t;
        }),
        (this.setStart = function (e, t) {
          typeof e == "object"
            ? ((this.start.column = e.column), (this.start.row = e.row))
            : ((this.start.row = e), (this.start.column = t));
        }),
        (this.setEnd = function (e, t) {
          typeof e == "object"
            ? ((this.end.column = e.column), (this.end.row = e.row))
            : ((this.end.row = e), (this.end.column = t));
        }),
        (this.inside = function (e, t) {
          return this.compare(e, t) == 0 ? (this.isEnd(e, t) || this.isStart(e, t) ? !1 : !0) : !1;
        }),
        (this.insideStart = function (e, t) {
          return this.compare(e, t) == 0 ? (this.isEnd(e, t) ? !1 : !0) : !1;
        }),
        (this.insideEnd = function (e, t) {
          return this.compare(e, t) == 0 ? (this.isStart(e, t) ? !1 : !0) : !1;
        }),
        (this.compare = function (e, t) {
          return !this.isMultiLine() && e === this.start.row
            ? t < this.start.column
              ? -1
              : t > this.end.column
              ? 1
              : 0
            : e < this.start.row
            ? -1
            : e > this.end.row
            ? 1
            : this.start.row === e
            ? t >= this.start.column
              ? 0
              : -1
            : this.end.row === e
            ? t <= this.end.column
              ? 0
              : 1
            : 0;
        }),
        (this.compareStart = function (e, t) {
          return this.start.row == e && this.start.column == t ? -1 : this.compare(e, t);
        }),
        (this.compareEnd = function (e, t) {
          return this.end.row == e && this.end.column == t ? 1 : this.compare(e, t);
        }),
        (this.compareInside = function (e, t) {
          return this.end.row == e && this.end.column == t
            ? 1
            : this.start.row == e && this.start.column == t
            ? -1
            : this.compare(e, t);
        }),
        (this.clipRows = function (e, t) {
          if (this.end.row > t) var n = { row: t + 1, column: 0 };
          else if (this.end.row < e) var n = { row: e, column: 0 };
          if (this.start.row > t) var r = { row: t + 1, column: 0 };
          else if (this.start.row < e) var r = { row: e, column: 0 };
          return i.fromPoints(r || this.start, n || this.end);
        }),
        (this.extend = function (e, t) {
          var n = this.compare(e, t);
          if (n == 0) return this;
          if (n == -1) var r = { row: e, column: t };
          else var s = { row: e, column: t };
          return i.fromPoints(r || this.start, s || this.end);
        }),
        (this.isEmpty = function () {
          return this.start.row === this.end.row && this.start.column === this.end.column;
        }),
        (this.isMultiLine = function () {
          return this.start.row !== this.end.row;
        }),
        (this.clone = function () {
          return i.fromPoints(this.start, this.end);
        }),
        (this.collapseRows = function () {
          return this.end.column == 0
            ? new i(this.start.row, 0, Math.max(this.start.row, this.end.row - 1), 0)
            : new i(this.start.row, 0, this.end.row, 0);
        }),
        (this.toScreenRange = function (e) {
          var t = e.documentToScreenPosition(this.start),
            n = e.documentToScreenPosition(this.end);
          return new i(t.row, t.column, n.row, n.column);
        }),
        (this.moveBy = function (e, t) {
          (this.start.row += e), (this.start.column += t), (this.end.row += e), (this.end.column += t);
        });
    }.call(i.prototype),
      (i.fromPoints = function (e, t) {
        return new i(e.row, e.column, t.row, t.column);
      }),
      (i.comparePoints = r),
      (i.comparePoints = function (e, t) {
        return e.row - t.row || e.column - t.column;
      }),
      (t.Range = i));
  }),
  define("ace/anchor", ["require", "exports", "module", "ace/lib/oop", "ace/lib/event_emitter"], function (e, t, n) {
    var r = e("./lib/oop"),
      i = e("./lib/event_emitter").EventEmitter,
      s = (t.Anchor = function (e, t, n) {
        (this.$onChange = this.onChange.bind(this)),
          this.attach(e),
          typeof n == "undefined" ? this.setPosition(t.row, t.column) : this.setPosition(t, n);
      });
    (function () {
      r.implement(this, i),
        (this.getPosition = function () {
          return this.$clipPositionToDocument(this.row, this.column);
        }),
        (this.getDocument = function () {
          return this.document;
        }),
        (this.$insertRight = !1),
        (this.onChange = function (e) {
          var t = e.data,
            n = t.range;
          if (n.start.row == n.end.row && n.start.row != this.row) return;
          if (n.start.row > this.row) return;
          if (n.start.row == this.row && n.start.column > this.column) return;
          var r = this.row,
            i = this.column,
            s = n.start,
            o = n.end;
          if (t.action === "insertText")
            if (s.row === r && s.column <= i) {
              if (s.column !== i || !this.$insertRight)
                s.row === o.row ? (i += o.column - s.column) : ((i -= s.column), (r += o.row - s.row));
            } else s.row !== o.row && s.row < r && (r += o.row - s.row);
          else
            t.action === "insertLines"
              ? (s.row !== r || i !== 0 || !this.$insertRight) && s.row <= r && (r += o.row - s.row)
              : t.action === "removeText"
              ? s.row === r && s.column < i
                ? o.column >= i
                  ? (i = s.column)
                  : (i = Math.max(0, i - (o.column - s.column)))
                : s.row !== o.row && s.row < r
                ? (o.row === r && (i = Math.max(0, i - o.column) + s.column), (r -= o.row - s.row))
                : o.row === r && ((r -= o.row - s.row), (i = Math.max(0, i - o.column) + s.column))
              : t.action == "removeLines" && s.row <= r && (o.row <= r ? (r -= o.row - s.row) : ((r = s.row), (i = 0)));
          this.setPosition(r, i, !0);
        }),
        (this.setPosition = function (e, t, n) {
          var r;
          n ? (r = { row: e, column: t }) : (r = this.$clipPositionToDocument(e, t));
          if (this.row == r.row && this.column == r.column) return;
          var i = { row: this.row, column: this.column };
          (this.row = r.row), (this.column = r.column), this._signal("change", { old: i, value: r });
        }),
        (this.detach = function () {
          this.document.removeEventListener("change", this.$onChange);
        }),
        (this.attach = function (e) {
          (this.document = e || this.document), this.document.on("change", this.$onChange);
        }),
        (this.$clipPositionToDocument = function (e, t) {
          var n = {};
          return (
            e >= this.document.getLength()
              ? ((n.row = Math.max(0, this.document.getLength() - 1)), (n.column = this.document.getLine(n.row).length))
              : e < 0
              ? ((n.row = 0), (n.column = 0))
              : ((n.row = e), (n.column = Math.min(this.document.getLine(n.row).length, Math.max(0, t)))),
            t < 0 && (n.column = 0),
            n
          );
        });
    }.call(s.prototype));
  }),
  define("ace/lib/lang", ["require", "exports", "module"], function (e, t, n) {
    (t.last = function (e) {
      return e[e.length - 1];
    }),
      (t.stringReverse = function (e) {
        return e.split("").reverse().join("");
      }),
      (t.stringRepeat = function (e, t) {
        var n = "";
        while (t > 0) {
          t & 1 && (n += e);
          if ((t >>= 1)) e += e;
        }
        return n;
      });
    var r = /^\s\s*/,
      i = /\s\s*$/;
    (t.stringTrimLeft = function (e) {
      return e.replace(r, "");
    }),
      (t.stringTrimRight = function (e) {
        return e.replace(i, "");
      }),
      (t.copyObject = function (e) {
        var t = {};
        for (var n in e) t[n] = e[n];
        return t;
      }),
      (t.copyArray = function (e) {
        var t = [];
        for (var n = 0, r = e.length; n < r; n++)
          e[n] && typeof e[n] == "object" ? (t[n] = this.copyObject(e[n])) : (t[n] = e[n]);
        return t;
      }),
      (t.deepCopy = function (e) {
        if (typeof e != "object" || !e) return e;
        var n = e.constructor;
        if (n === RegExp) return e;
        var r = n();
        for (var i in e) typeof e[i] == "object" ? (r[i] = t.deepCopy(e[i])) : (r[i] = e[i]);
        return r;
      }),
      (t.arrayToMap = function (e) {
        var t = {};
        for (var n = 0; n < e.length; n++) t[e[n]] = 1;
        return t;
      }),
      (t.createMap = function (e) {
        var t = Object.create(null);
        for (var n in e) t[n] = e[n];
        return t;
      }),
      (t.arrayRemove = function (e, t) {
        for (var n = 0; n <= e.length; n++) t === e[n] && e.splice(n, 1);
      }),
      (t.escapeRegExp = function (e) {
        return e.replace(/([.*+?^${}()|[\]\/\\])/g, "\\$1");
      }),
      (t.escapeHTML = function (e) {
        return e.replace(/&/g, "&#38;").replace(/"/g, "&#34;").replace(/'/g, "&#39;").replace(/</g, "&#60;");
      }),
      (t.getMatchOffsets = function (e, t) {
        var n = [];
        return (
          e.replace(t, function (e) {
            n.push({ offset: arguments[arguments.length - 2], length: e.length });
          }),
          n
        );
      }),
      (t.deferredCall = function (e) {
        var t = null,
          n = function () {
            (t = null), e();
          },
          r = function (e) {
            return r.cancel(), (t = setTimeout(n, e || 0)), r;
          };
        return (
          (r.schedule = r),
          (r.call = function () {
            return this.cancel(), e(), r;
          }),
          (r.cancel = function () {
            return clearTimeout(t), (t = null), r;
          }),
          (r.isPending = function () {
            return t;
          }),
          r
        );
      }),
      (t.delayedCall = function (e, t) {
        var n = null,
          r = function () {
            (n = null), e();
          },
          i = function (e) {
            n == null && (n = setTimeout(r, e || t));
          };
        return (
          (i.delay = function (e) {
            n && clearTimeout(n), (n = setTimeout(r, e || t));
          }),
          (i.schedule = i),
          (i.call = function () {
            this.cancel(), e();
          }),
          (i.cancel = function () {
            n && clearTimeout(n), (n = null);
          }),
          (i.isPending = function () {
            return n;
          }),
          i
        );
      });
  }),
  define("ace/mode/javascript/jshint", ["require", "exports", "module"], function (e, t, n) {
    n.exports = (function r(t, n, i) {
      function s(u, a) {
        if (!n[u]) {
          if (!t[u]) {
            var f = typeof e == "function" && e;
            if (!a && f) return f(u, !0);
            if (o) return o(u, !0);
            throw new Error("Cannot find module '" + u + "'");
          }
          var l = (n[u] = { exports: {} });
          t[u][0].call(
            l.exports,
            function (e) {
              var n = t[u][1][e];
              return s(n ? n : e);
            },
            l,
            l.exports,
            r,
            t,
            n,
            i
          );
        }
        return n[u].exports;
      }
      var o = typeof e == "function" && e;
      for (var u = 0; u < i.length; u++) s(i[u]);
      return s;
    })(
      {
        1: [
          function (e, t, n) {
            var r = [];
            for (var i = 0; i < 128; i++) r[i] = i === 36 || (i >= 65 && i <= 90) || i === 95 || (i >= 97 && i <= 122);
            var s = [];
            for (var i = 0; i < 128; i++) s[i] = r[i] || (i >= 48 && i <= 57);
            t.exports = { asciiIdentifierStartTable: r, asciiIdentifierPartTable: s };
          },
          {},
        ],
        2: [
          function (e, t, n) {
            (function () {
              var e = this,
                r = e._,
                i = {},
                s = Array.prototype,
                o = Object.prototype,
                u = Function.prototype,
                a = s.push,
                f = s.slice,
                l = s.concat,
                c = o.toString,
                h = o.hasOwnProperty,
                p = s.forEach,
                d = s.map,
                v = s.reduce,
                m = s.reduceRight,
                g = s.filter,
                y = s.every,
                b = s.some,
                w = s.indexOf,
                E = s.lastIndexOf,
                S = Array.isArray,
                x = Object.keys,
                T = u.bind,
                N = function (e) {
                  if (e instanceof N) return e;
                  if (!(this instanceof N)) return new N(e);
                  this._wrapped = e;
                };
              typeof n != "undefined"
                ? (typeof t != "undefined" && t.exports && (n = t.exports = N), (n._ = N))
                : (e._ = N),
                (N.VERSION = "1.4.4");
              var C =
                (N.each =
                N.forEach =
                  function (e, t, n) {
                    if (e == null) return;
                    if (p && e.forEach === p) e.forEach(t, n);
                    else if (e.length === +e.length) {
                      for (var r = 0, s = e.length; r < s; r++) if (t.call(n, e[r], r, e) === i) return;
                    } else for (var o in e) if (N.has(e, o) && t.call(n, e[o], o, e) === i) return;
                  });
              N.map = N.collect = function (e, t, n) {
                var r = [];
                return e == null
                  ? r
                  : d && e.map === d
                  ? e.map(t, n)
                  : (C(e, function (e, i, s) {
                      r[r.length] = t.call(n, e, i, s);
                    }),
                    r);
              };
              var k = "Reduce of empty array with no initial value";
              (N.reduce =
                N.foldl =
                N.inject =
                  function (e, t, n, r) {
                    var i = arguments.length > 2;
                    e == null && (e = []);
                    if (v && e.reduce === v) return r && (t = N.bind(t, r)), i ? e.reduce(t, n) : e.reduce(t);
                    C(e, function (e, s, o) {
                      i ? (n = t.call(r, n, e, s, o)) : ((n = e), (i = !0));
                    });
                    if (!i) throw new TypeError(k);
                    return n;
                  }),
                (N.reduceRight = N.foldr =
                  function (e, t, n, r) {
                    var i = arguments.length > 2;
                    e == null && (e = []);
                    if (m && e.reduceRight === m)
                      return r && (t = N.bind(t, r)), i ? e.reduceRight(t, n) : e.reduceRight(t);
                    var s = e.length;
                    if (s !== +s) {
                      var o = N.keys(e);
                      s = o.length;
                    }
                    C(e, function (u, a, f) {
                      (a = o ? o[--s] : --s), i ? (n = t.call(r, n, e[a], a, f)) : ((n = e[a]), (i = !0));
                    });
                    if (!i) throw new TypeError(k);
                    return n;
                  }),
                (N.find = N.detect =
                  function (e, t, n) {
                    var r;
                    return (
                      L(e, function (e, i, s) {
                        if (t.call(n, e, i, s)) return (r = e), !0;
                      }),
                      r
                    );
                  }),
                (N.filter = N.select =
                  function (e, t, n) {
                    var r = [];
                    return e == null
                      ? r
                      : g && e.filter === g
                      ? e.filter(t, n)
                      : (C(e, function (e, i, s) {
                          t.call(n, e, i, s) && (r[r.length] = e);
                        }),
                        r);
                  }),
                (N.reject = function (e, t, n) {
                  return N.filter(
                    e,
                    function (e, r, i) {
                      return !t.call(n, e, r, i);
                    },
                    n
                  );
                }),
                (N.every = N.all =
                  function (e, t, n) {
                    t || (t = N.identity);
                    var r = !0;
                    return e == null
                      ? r
                      : y && e.every === y
                      ? e.every(t, n)
                      : (C(e, function (e, s, o) {
                          if (!(r = r && t.call(n, e, s, o))) return i;
                        }),
                        !!r);
                  });
              var L =
                (N.some =
                N.any =
                  function (e, t, n) {
                    t || (t = N.identity);
                    var r = !1;
                    return e == null
                      ? r
                      : b && e.some === b
                      ? e.some(t, n)
                      : (C(e, function (e, s, o) {
                          if (r || (r = t.call(n, e, s, o))) return i;
                        }),
                        !!r);
                  });
              (N.contains = N.include =
                function (e, t) {
                  return e == null
                    ? !1
                    : w && e.indexOf === w
                    ? e.indexOf(t) != -1
                    : L(e, function (e) {
                        return e === t;
                      });
                }),
                (N.invoke = function (e, t) {
                  var n = f.call(arguments, 2),
                    r = N.isFunction(t);
                  return N.map(e, function (e) {
                    return (r ? t : e[t]).apply(e, n);
                  });
                }),
                (N.pluck = function (e, t) {
                  return N.map(e, function (e) {
                    return e[t];
                  });
                }),
                (N.where = function (e, t, n) {
                  return N.isEmpty(t)
                    ? n
                      ? null
                      : []
                    : N[n ? "find" : "filter"](e, function (e) {
                        for (var n in t) if (t[n] !== e[n]) return !1;
                        return !0;
                      });
                }),
                (N.findWhere = function (e, t) {
                  return N.where(e, t, !0);
                }),
                (N.max = function (e, t, n) {
                  if (!t && N.isArray(e) && e[0] === +e[0] && e.length < 65535) return Math.max.apply(Math, e);
                  if (!t && N.isEmpty(e)) return -Infinity;
                  var r = { computed: -Infinity, value: -Infinity };
                  return (
                    C(e, function (e, i, s) {
                      var o = t ? t.call(n, e, i, s) : e;
                      o >= r.computed && (r = { value: e, computed: o });
                    }),
                    r.value
                  );
                }),
                (N.min = function (e, t, n) {
                  if (!t && N.isArray(e) && e[0] === +e[0] && e.length < 65535) return Math.min.apply(Math, e);
                  if (!t && N.isEmpty(e)) return Infinity;
                  var r = { computed: Infinity, value: Infinity };
                  return (
                    C(e, function (e, i, s) {
                      var o = t ? t.call(n, e, i, s) : e;
                      o < r.computed && (r = { value: e, computed: o });
                    }),
                    r.value
                  );
                }),
                (N.shuffle = function (e) {
                  var t,
                    n = 0,
                    r = [];
                  return (
                    C(e, function (e) {
                      (t = N.random(n++)), (r[n - 1] = r[t]), (r[t] = e);
                    }),
                    r
                  );
                });
              var A = function (e) {
                return N.isFunction(e)
                  ? e
                  : function (t) {
                      return t[e];
                    };
              };
              N.sortBy = function (e, t, n) {
                var r = A(t);
                return N.pluck(
                  N.map(e, function (e, t, i) {
                    return { value: e, index: t, criteria: r.call(n, e, t, i) };
                  }).sort(function (e, t) {
                    var n = e.criteria,
                      r = t.criteria;
                    if (n !== r) {
                      if (n > r || n === void 0) return 1;
                      if (n < r || r === void 0) return -1;
                    }
                    return e.index < t.index ? -1 : 1;
                  }),
                  "value"
                );
              };
              var O = function (e, t, n, r) {
                var i = {},
                  s = A(t || N.identity);
                return (
                  C(e, function (t, o) {
                    var u = s.call(n, t, o, e);
                    r(i, u, t);
                  }),
                  i
                );
              };
              (N.groupBy = function (e, t, n) {
                return O(e, t, n, function (e, t, n) {
                  (N.has(e, t) ? e[t] : (e[t] = [])).push(n);
                });
              }),
                (N.countBy = function (e, t, n) {
                  return O(e, t, n, function (e, t) {
                    N.has(e, t) || (e[t] = 0), e[t]++;
                  });
                }),
                (N.sortedIndex = function (e, t, n, r) {
                  n = n == null ? N.identity : A(n);
                  var i = n.call(r, t),
                    s = 0,
                    o = e.length;
                  while (s < o) {
                    var u = (s + o) >>> 1;
                    n.call(r, e[u]) < i ? (s = u + 1) : (o = u);
                  }
                  return s;
                }),
                (N.toArray = function (e) {
                  return e
                    ? N.isArray(e)
                      ? f.call(e)
                      : e.length === +e.length
                      ? N.map(e, N.identity)
                      : N.values(e)
                    : [];
                }),
                (N.size = function (e) {
                  return e == null ? 0 : e.length === +e.length ? e.length : N.keys(e).length;
                }),
                (N.first =
                  N.head =
                  N.take =
                    function (e, t, n) {
                      return e == null ? void 0 : t != null && !n ? f.call(e, 0, t) : e[0];
                    }),
                (N.initial = function (e, t, n) {
                  return f.call(e, 0, e.length - (t == null || n ? 1 : t));
                }),
                (N.last = function (e, t, n) {
                  return e == null ? void 0 : t != null && !n ? f.call(e, Math.max(e.length - t, 0)) : e[e.length - 1];
                }),
                (N.rest =
                  N.tail =
                  N.drop =
                    function (e, t, n) {
                      return f.call(e, t == null || n ? 1 : t);
                    }),
                (N.compact = function (e) {
                  return N.filter(e, N.identity);
                });
              var M = function (e, t, n) {
                return (
                  C(e, function (e) {
                    N.isArray(e) ? (t ? a.apply(n, e) : M(e, t, n)) : n.push(e);
                  }),
                  n
                );
              };
              (N.flatten = function (e, t) {
                return M(e, t, []);
              }),
                (N.without = function (e) {
                  return N.difference(e, f.call(arguments, 1));
                }),
                (N.uniq = N.unique =
                  function (e, t, n, r) {
                    N.isFunction(t) && ((r = n), (n = t), (t = !1));
                    var i = n ? N.map(e, n, r) : e,
                      s = [],
                      o = [];
                    return (
                      C(i, function (n, r) {
                        if (t ? !r || o[o.length - 1] !== n : !N.contains(o, n)) o.push(n), s.push(e[r]);
                      }),
                      s
                    );
                  }),
                (N.union = function () {
                  return N.uniq(l.apply(s, arguments));
                }),
                (N.intersection = function (e) {
                  var t = f.call(arguments, 1);
                  return N.filter(N.uniq(e), function (e) {
                    return N.every(t, function (t) {
                      return N.indexOf(t, e) >= 0;
                    });
                  });
                }),
                (N.difference = function (e) {
                  var t = l.apply(s, f.call(arguments, 1));
                  return N.filter(e, function (e) {
                    return !N.contains(t, e);
                  });
                }),
                (N.zip = function () {
                  var e = f.call(arguments),
                    t = N.max(N.pluck(e, "length")),
                    n = new Array(t);
                  for (var r = 0; r < t; r++) n[r] = N.pluck(e, "" + r);
                  return n;
                }),
                (N.object = function (e, t) {
                  if (e == null) return {};
                  var n = {};
                  for (var r = 0, i = e.length; r < i; r++) t ? (n[e[r]] = t[r]) : (n[e[r][0]] = e[r][1]);
                  return n;
                }),
                (N.indexOf = function (e, t, n) {
                  if (e == null) return -1;
                  var r = 0,
                    i = e.length;
                  if (n) {
                    if (typeof n != "number") return (r = N.sortedIndex(e, t)), e[r] === t ? r : -1;
                    r = n < 0 ? Math.max(0, i + n) : n;
                  }
                  if (w && e.indexOf === w) return e.indexOf(t, n);
                  for (; r < i; r++) if (e[r] === t) return r;
                  return -1;
                }),
                (N.lastIndexOf = function (e, t, n) {
                  if (e == null) return -1;
                  var r = n != null;
                  if (E && e.lastIndexOf === E) return r ? e.lastIndexOf(t, n) : e.lastIndexOf(t);
                  var i = r ? n : e.length;
                  while (i--) if (e[i] === t) return i;
                  return -1;
                }),
                (N.range = function (e, t, n) {
                  arguments.length <= 1 && ((t = e || 0), (e = 0)), (n = arguments[2] || 1);
                  var r = Math.max(Math.ceil((t - e) / n), 0),
                    i = 0,
                    s = new Array(r);
                  while (i < r) (s[i++] = e), (e += n);
                  return s;
                }),
                (N.bind = function (e, t) {
                  if (e.bind === T && T) return T.apply(e, f.call(arguments, 1));
                  var n = f.call(arguments, 2);
                  return function () {
                    return e.apply(t, n.concat(f.call(arguments)));
                  };
                }),
                (N.partial = function (e) {
                  var t = f.call(arguments, 1);
                  return function () {
                    return e.apply(this, t.concat(f.call(arguments)));
                  };
                }),
                (N.bindAll = function (e) {
                  var t = f.call(arguments, 1);
                  return (
                    t.length === 0 && (t = N.functions(e)),
                    C(t, function (t) {
                      e[t] = N.bind(e[t], e);
                    }),
                    e
                  );
                }),
                (N.memoize = function (e, t) {
                  var n = {};
                  return (
                    t || (t = N.identity),
                    function () {
                      var r = t.apply(this, arguments);
                      return N.has(n, r) ? n[r] : (n[r] = e.apply(this, arguments));
                    }
                  );
                }),
                (N.delay = function (e, t) {
                  var n = f.call(arguments, 2);
                  return setTimeout(function () {
                    return e.apply(null, n);
                  }, t);
                }),
                (N.defer = function (e) {
                  return N.delay.apply(N, [e, 1].concat(f.call(arguments, 1)));
                }),
                (N.throttle = function (e, t) {
                  var n,
                    r,
                    i,
                    s,
                    o = 0,
                    u = function () {
                      (o = new Date()), (i = null), (s = e.apply(n, r));
                    };
                  return function () {
                    var a = new Date(),
                      f = t - (a - o);
                    return (
                      (n = this),
                      (r = arguments),
                      f <= 0
                        ? (clearTimeout(i), (i = null), (o = a), (s = e.apply(n, r)))
                        : i || (i = setTimeout(u, f)),
                      s
                    );
                  };
                }),
                (N.debounce = function (e, t, n) {
                  var r, i;
                  return function () {
                    var s = this,
                      o = arguments,
                      u = function () {
                        (r = null), n || (i = e.apply(s, o));
                      },
                      a = n && !r;
                    return clearTimeout(r), (r = setTimeout(u, t)), a && (i = e.apply(s, o)), i;
                  };
                }),
                (N.once = function (e) {
                  var t = !1,
                    n;
                  return function () {
                    return t ? n : ((t = !0), (n = e.apply(this, arguments)), (e = null), n);
                  };
                }),
                (N.wrap = function (e, t) {
                  return function () {
                    var n = [e];
                    return a.apply(n, arguments), t.apply(this, n);
                  };
                }),
                (N.compose = function () {
                  var e = arguments;
                  return function () {
                    var t = arguments;
                    for (var n = e.length - 1; n >= 0; n--) t = [e[n].apply(this, t)];
                    return t[0];
                  };
                }),
                (N.after = function (e, t) {
                  return e <= 0
                    ? t()
                    : function () {
                        if (--e < 1) return t.apply(this, arguments);
                      };
                }),
                (N.keys =
                  x ||
                  function (e) {
                    if (e !== Object(e)) throw new TypeError("Invalid object");
                    var t = [];
                    for (var n in e) N.has(e, n) && (t[t.length] = n);
                    return t;
                  }),
                (N.values = function (e) {
                  var t = [];
                  for (var n in e) N.has(e, n) && t.push(e[n]);
                  return t;
                }),
                (N.pairs = function (e) {
                  var t = [];
                  for (var n in e) N.has(e, n) && t.push([n, e[n]]);
                  return t;
                }),
                (N.invert = function (e) {
                  var t = {};
                  for (var n in e) N.has(e, n) && (t[e[n]] = n);
                  return t;
                }),
                (N.functions = N.methods =
                  function (e) {
                    var t = [];
                    for (var n in e) N.isFunction(e[n]) && t.push(n);
                    return t.sort();
                  }),
                (N.extend = function (e) {
                  return (
                    C(f.call(arguments, 1), function (t) {
                      if (t) for (var n in t) e[n] = t[n];
                    }),
                    e
                  );
                }),
                (N.pick = function (e) {
                  var t = {},
                    n = l.apply(s, f.call(arguments, 1));
                  return (
                    C(n, function (n) {
                      n in e && (t[n] = e[n]);
                    }),
                    t
                  );
                }),
                (N.omit = function (e) {
                  var t = {},
                    n = l.apply(s, f.call(arguments, 1));
                  for (var r in e) N.contains(n, r) || (t[r] = e[r]);
                  return t;
                }),
                (N.defaults = function (e) {
                  return (
                    C(f.call(arguments, 1), function (t) {
                      if (t) for (var n in t) e[n] == null && (e[n] = t[n]);
                    }),
                    e
                  );
                }),
                (N.clone = function (e) {
                  return N.isObject(e) ? (N.isArray(e) ? e.slice() : N.extend({}, e)) : e;
                }),
                (N.tap = function (e, t) {
                  return t(e), e;
                });
              var _ = function (e, t, n, r) {
                if (e === t) return e !== 0 || 1 / e == 1 / t;
                if (e == null || t == null) return e === t;
                e instanceof N && (e = e._wrapped), t instanceof N && (t = t._wrapped);
                var i = c.call(e);
                if (i != c.call(t)) return !1;
                switch (i) {
                  case "[object String]":
                    return e == String(t);
                  case "[object Number]":
                    return e != +e ? t != +t : e == 0 ? 1 / e == 1 / t : e == +t;
                  case "[object Date]":
                  case "[object Boolean]":
                    return +e == +t;
                  case "[object RegExp]":
                    return (
                      e.source == t.source &&
                      e.global == t.global &&
                      e.multiline == t.multiline &&
                      e.ignoreCase == t.ignoreCase
                    );
                }
                if (typeof e != "object" || typeof t != "object") return !1;
                var s = n.length;
                while (s--) if (n[s] == e) return r[s] == t;
                n.push(e), r.push(t);
                var o = 0,
                  u = !0;
                if (i == "[object Array]") {
                  (o = e.length), (u = o == t.length);
                  if (u) while (o--) if (!(u = _(e[o], t[o], n, r))) break;
                } else {
                  var a = e.constructor,
                    f = t.constructor;
                  if (a !== f && !(N.isFunction(a) && a instanceof a && N.isFunction(f) && f instanceof f)) return !1;
                  for (var l in e)
                    if (N.has(e, l)) {
                      o++;
                      if (!(u = N.has(t, l) && _(e[l], t[l], n, r))) break;
                    }
                  if (u) {
                    for (l in t) if (N.has(t, l) && !o--) break;
                    u = !o;
                  }
                }
                return n.pop(), r.pop(), u;
              };
              (N.isEqual = function (e, t) {
                return _(e, t, [], []);
              }),
                (N.isEmpty = function (e) {
                  if (e == null) return !0;
                  if (N.isArray(e) || N.isString(e)) return e.length === 0;
                  for (var t in e) if (N.has(e, t)) return !1;
                  return !0;
                }),
                (N.isElement = function (e) {
                  return !!e && e.nodeType === 1;
                }),
                (N.isArray =
                  S ||
                  function (e) {
                    return c.call(e) == "[object Array]";
                  }),
                (N.isObject = function (e) {
                  return e === Object(e);
                }),
                C(["Arguments", "Function", "String", "Number", "Date", "RegExp"], function (e) {
                  N["is" + e] = function (t) {
                    return c.call(t) == "[object " + e + "]";
                  };
                }),
                N.isArguments(arguments) ||
                  (N.isArguments = function (e) {
                    return !!e && !!N.has(e, "callee");
                  }),
                typeof /./ != "function" &&
                  (N.isFunction = function (e) {
                    return typeof e == "function";
                  }),
                (N.isFinite = function (e) {
                  return isFinite(e) && !isNaN(parseFloat(e));
                }),
                (N.isNaN = function (e) {
                  return N.isNumber(e) && e != +e;
                }),
                (N.isBoolean = function (e) {
                  return e === !0 || e === !1 || c.call(e) == "[object Boolean]";
                }),
                (N.isNull = function (e) {
                  return e === null;
                }),
                (N.isUndefined = function (e) {
                  return e === void 0;
                }),
                (N.has = function (e, t) {
                  return h.call(e, t);
                }),
                (N.noConflict = function () {
                  return (e._ = r), this;
                }),
                (N.identity = function (e) {
                  return e;
                }),
                (N.times = function (e, t, n) {
                  var r = Array(e);
                  for (var i = 0; i < e; i++) r[i] = t.call(n, i);
                  return r;
                }),
                (N.random = function (e, t) {
                  return t == null && ((t = e), (e = 0)), e + Math.floor(Math.random() * (t - e + 1));
                });
              var D = {
                escape: { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;", "/": "&#x2F;" },
              };
              D.unescape = N.invert(D.escape);
              var P = {
                escape: new RegExp("[" + N.keys(D.escape).join("") + "]", "g"),
                unescape: new RegExp("(" + N.keys(D.unescape).join("|") + ")", "g"),
              };
              N.each(["escape", "unescape"], function (e) {
                N[e] = function (t) {
                  return t == null
                    ? ""
                    : ("" + t).replace(P[e], function (t) {
                        return D[e][t];
                      });
                };
              }),
                (N.result = function (e, t) {
                  if (e == null) return null;
                  var n = e[t];
                  return N.isFunction(n) ? n.call(e) : n;
                }),
                (N.mixin = function (e) {
                  C(N.functions(e), function (t) {
                    var n = (N[t] = e[t]);
                    N.prototype[t] = function () {
                      var e = [this._wrapped];
                      return a.apply(e, arguments), I.call(this, n.apply(N, e));
                    };
                  });
                });
              var H = 0;
              (N.uniqueId = function (e) {
                var t = ++H + "";
                return e ? e + t : t;
              }),
                (N.templateSettings = {
                  evaluate: /<%([\s\S]+?)%>/g,
                  interpolate: /<%=([\s\S]+?)%>/g,
                  escape: /<%-([\s\S]+?)%>/g,
                });
              var B = /(.)^/,
                j = { "'": "'", "\\": "\\", "\r": "r", "\n": "n", "	": "t", "\u2028": "u2028", "\u2029": "u2029" },
                F = /\\|'|\r|\n|\t|\u2028|\u2029/g;
              (N.template = function (e, t, n) {
                var r;
                n = N.defaults({}, n, N.templateSettings);
                var i = new RegExp(
                    [(n.escape || B).source, (n.interpolate || B).source, (n.evaluate || B).source].join("|") + "|$",
                    "g"
                  ),
                  s = 0,
                  o = "__p+='";
                e.replace(i, function (t, n, r, i, u) {
                  return (
                    (o += e.slice(s, u).replace(F, function (e) {
                      return "\\" + j[e];
                    })),
                    n && (o += "'+\n((__t=(" + n + "))==null?'':_.escape(__t))+\n'"),
                    r && (o += "'+\n((__t=(" + r + "))==null?'':__t)+\n'"),
                    i && (o += "';\n" + i + "\n__p+='"),
                    (s = u + t.length),
                    t
                  );
                }),
                  (o += "';\n"),
                  n.variable || (o = "with(obj||{}){\n" + o + "}\n"),
                  (o =
                    "var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};\n" +
                    o +
                    "return __p;\n");
                try {
                  r = new Function(n.variable || "obj", "_", o);
                } catch (u) {
                  throw ((u.source = o), u);
                }
                if (t) return r(t, N);
                var a = function (e) {
                  return r.call(this, e, N);
                };
                return (a.source = "function(" + (n.variable || "obj") + "){\n" + o + "}"), a;
              }),
                (N.chain = function (e) {
                  return N(e).chain();
                });
              var I = function (e) {
                return this._chain ? N(e).chain() : e;
              };
              N.mixin(N),
                C(["pop", "push", "reverse", "shift", "sort", "splice", "unshift"], function (e) {
                  var t = s[e];
                  N.prototype[e] = function () {
                    var n = this._wrapped;
                    return (
                      t.apply(n, arguments),
                      (e == "shift" || e == "splice") && n.length === 0 && delete n[0],
                      I.call(this, n)
                    );
                  };
                }),
                C(["concat", "join", "slice"], function (e) {
                  var t = s[e];
                  N.prototype[e] = function () {
                    return I.call(this, t.apply(this._wrapped, arguments));
                  };
                }),
                N.extend(N.prototype, {
                  chain: function () {
                    return (this._chain = !0), this;
                  },
                  value: function () {
                    return this._wrapped;
                  },
                });
            }.call(this));
          },
          {},
        ],
        3: [
          function (e, t, n) {
            var r = e("underscore"),
              i = e("events"),
              s = e("./vars.js"),
              o = e("./messages.js"),
              u = e("./lex.js").Lexer,
              a = e("./reg.js"),
              f = e("./state.js").state,
              l = e("./style.js"),
              c = (function () {
                function e(e, t) {
                  return (
                    (e = e.trim()),
                    /^[+-]W\d{3}$/g.test(e)
                      ? !0
                      : Ot[e] === undefined && At[e] === undefined && t.type !== "jslint" && !Dt[e]
                      ? (E("E001", t, e), !1)
                      : !0
                  );
                }
                function t(e) {
                  return Object.prototype.toString.call(e) === "[object String]";
                }
                function n(e, t) {
                  return e ? (!e.identifier || e.value !== t ? !1 : !0) : !1;
                }
                function h(e) {
                  if (!e.reserved) return !1;
                  var t = e.meta;
                  if (t && t.isFutureReservedWord && f.option.inES5()) {
                    if (!t.es5) return !1;
                    if (t.strictOnly && !f.option.strict && !f.directive["use strict"]) return !1;
                    if (e.isProperty) return !1;
                  }
                  return !0;
                }
                function p(e, t) {
                  return e.replace(/\{([^{}]*)\}/g, function (e, n) {
                    var r = t[n];
                    return typeof r == "string" || typeof r == "number" ? r : e;
                  });
                }
                function d(e, t) {
                  Object.keys(t).forEach(function (n) {
                    if (c.blacklist.hasOwnProperty(n)) return;
                    e[n] = t[n];
                  });
                }
                function v() {
                  f.option.esnext && d(Jt, s.newEcmaIdentifiers),
                    f.option.couch && d(Jt, s.couch),
                    f.option.rhino && d(Jt, s.rhino),
                    f.option.shelljs && (d(Jt, s.shelljs), d(Jt, s.node)),
                    f.option.typed && d(Jt, s.typed),
                    f.option.phantom && d(Jt, s.phantom),
                    f.option.prototypejs && d(Jt, s.prototypejs),
                    f.option.node && (d(Jt, s.node), d(Jt, s.typed)),
                    f.option.devel && d(Jt, s.devel),
                    f.option.dojo && d(Jt, s.dojo),
                    f.option.browser && (d(Jt, s.browser), d(Jt, s.typed)),
                    f.option.nonstandard && d(Jt, s.nonstandard),
                    f.option.jquery && d(Jt, s.jquery),
                    f.option.mootools && d(Jt, s.mootools),
                    f.option.worker && d(Jt, s.worker),
                    f.option.wsh && d(Jt, s.wsh),
                    f.option.globalstrict && f.option.strict !== !1 && (f.option.strict = !0),
                    f.option.yui && d(Jt, s.yui),
                    f.option.mocha && d(Jt, s.mocha),
                    (f.option.inMoz = function (e) {
                      return f.option.moz;
                    }),
                    (f.option.inESNext = function (e) {
                      return f.option.moz || f.option.esnext;
                    }),
                    (f.option.inES5 = function () {
                      return !f.option.es3;
                    }),
                    (f.option.inES3 = function (e) {
                      return e ? !f.option.moz && !f.option.esnext && f.option.es3 : f.option.es3;
                    });
                }
                function m(e, t, n) {
                  var r = Math.floor((t / f.lines.length) * 100),
                    i = o.errors[e].desc;
                  throw {
                    name: "JSHintError",
                    line: t,
                    character: n,
                    message: i + " (" + r + "% scanned).",
                    raw: i,
                    code: e,
                  };
                }
                function g(e, t, n, r) {
                  return c.undefs.push([e, t, n, r]);
                }
                function y() {
                  var e = f.ignoredLines;
                  if (r.isEmpty(e)) return;
                  c.errors = r.reject(c.errors, function (t) {
                    return e[t.line];
                  });
                }
                function b(e, t, n, r, i, s) {
                  var u, a, l, h;
                  if (/^W\d{3}$/.test(e)) {
                    if (f.ignored[e]) return;
                    h = o.warnings[e];
                  } else /E\d{3}/.test(e) ? (h = o.errors[e]) : /I\d{3}/.test(e) && (h = o.info[e]);
                  return (
                    (t = t || f.tokens.next),
                    t.id === "(end)" && (t = f.tokens.curr),
                    (a = t.line || 0),
                    (u = t.from || 0),
                    (l = {
                      id: "(error)",
                      raw: h.desc,
                      code: h.code,
                      evidence: f.lines[a - 1] || "",
                      line: a,
                      character: u,
                      scope: c.scope,
                      a: n,
                      b: r,
                      c: i,
                      d: s,
                    }),
                    (l.reason = p(h.desc, l)),
                    c.errors.push(l),
                    y(),
                    c.errors.length >= f.option.maxerr && m("E043", a, u),
                    l
                  );
                }
                function w(e, t, n, r, i, s, o) {
                  return b(e, { line: t, from: n }, r, i, s, o);
                }
                function E(e, t, n, r, i, s) {
                  b(e, t, n, r, i, s);
                }
                function S(e, t, n, r, i, s, o) {
                  return E(e, { line: t, from: n }, r, i, s, o);
                }
                function x(e, t) {
                  var n;
                  return (n = { id: "(internal)", elem: e, value: t }), c.internals.push(n), n;
                }
                function T(e, t) {
                  t = t || {};
                  var n = t.type,
                    i = t.token,
                    s = t.islet;
                  n === "exception" &&
                    r.has(jt["(context)"], e) &&
                    jt[e] !== !0 &&
                    !f.option.node &&
                    b("W002", f.tokens.next, e),
                    r.has(jt, e) &&
                      !jt["(global)"] &&
                      (jt[e] === !0
                        ? f.option.latedef &&
                          ((f.option.latedef === !0 && r.contains([jt[e], n], "unction")) ||
                            !r.contains([jt[e], n], "unction")) &&
                          b("W003", f.tokens.next, e)
                        : (((!f.option.shadow || r.contains(["inner", "outer"], f.option.shadow)) &&
                            n !== "exception") ||
                            jt["(blockscope)"].getlabel(e)) &&
                          b("W004", f.tokens.next, e)),
                    jt["(context)"] &&
                      r.has(jt["(context)"], e) &&
                      n !== "function" &&
                      f.option.shadow === "outer" &&
                      b("W123", f.tokens.next, e),
                    s
                      ? jt["(blockscope)"].current.add(e, n, f.tokens.curr)
                      : (jt["(blockscope)"].shadow(e),
                        (jt[e] = n),
                        i && (jt["(tokens)"][e] = i),
                        pt(jt, e, { unused: t.unused || !1 }),
                        jt["(global)"]
                          ? ((It[e] = jt),
                            r.has(qt, e) &&
                              (f.option.latedef &&
                                ((f.option.latedef === !0 && r.contains([jt[e], n], "unction")) ||
                                  !r.contains([jt[e], n], "unction")) &&
                                b("W003", f.tokens.next, e),
                              delete qt[e]))
                          : (Kt[e] = jt));
                }
                function N() {
                  var t = f.tokens.next,
                    n = t.body.match(/(-\s+)?[^\s,:]+(?:\s*:\s*(-\s+)?[^\s,]+)?/g),
                    i = {};
                  if (t.type === "globals") {
                    n.forEach(function (e) {
                      e = e.split(":");
                      var t = (e[0] || "").trim(),
                        n = (e[1] || "").trim();
                      t.charAt(0) === "-"
                        ? ((t = t.slice(1)), (n = !1), (c.blacklist[t] = t), delete Jt[t])
                        : (i[t] = n === "true");
                    }),
                      d(Jt, i);
                    for (var s in i) r.has(i, s) && (Pt[s] = t);
                  }
                  t.type === "exported" &&
                    n.forEach(function (e) {
                      Ht[e] = !0;
                    }),
                    t.type === "members" &&
                      ((Vt = Vt || {}),
                      n.forEach(function (e) {
                        var t = e.charAt(0),
                          n = e.charAt(e.length - 1);
                        t === n && (t === '"' || t === "'") && (e = e.substr(1, e.length - 2).replace('\\"', '"')),
                          (Vt[e] = !1);
                      }));
                  var o = ["maxstatements", "maxparams", "maxdepth", "maxcomplexity", "maxerr", "maxlen", "indent"];
                  if (t.type === "jshint" || t.type === "jslint")
                    n.forEach(function (n) {
                      n = n.split(":");
                      var r = (n[0] || "").trim(),
                        i = (n[1] || "").trim();
                      if (!e(r, t)) return;
                      if (o.indexOf(r) >= 0) {
                        if (i !== "false") {
                          i = +i;
                          if (typeof i != "number" || !isFinite(i) || i <= 0 || Math.floor(i) !== i) {
                            E("E032", t, n[1].trim());
                            return;
                          }
                          f.option[r] = i;
                        } else f.option[r] = r === "indent" ? 4 : !1;
                        return;
                      }
                      if (r === "validthis") {
                        if (jt["(global)"]) return void E("E009");
                        if (i !== "true" && i !== "false") return void E("E002", t);
                        f.option.validthis = i === "true";
                        return;
                      }
                      if (r === "quotmark") {
                        switch (i) {
                          case "true":
                          case "false":
                            f.option.quotmark = i === "true";
                            break;
                          case "double":
                          case "single":
                            f.option.quotmark = i;
                            break;
                          default:
                            E("E002", t);
                        }
                        return;
                      }
                      if (r === "shadow") {
                        switch (i) {
                          case "true":
                            f.option.shadow = !0;
                            break;
                          case "outer":
                            f.option.shadow = "outer";
                            break;
                          case "false":
                          case "inner":
                            f.option.shadow = "inner";
                            break;
                          default:
                            E("E002", t);
                        }
                        return;
                      }
                      if (r === "unused") {
                        switch (i) {
                          case "true":
                            f.option.unused = !0;
                            break;
                          case "false":
                            f.option.unused = !1;
                            break;
                          case "vars":
                          case "strict":
                            f.option.unused = i;
                            break;
                          default:
                            E("E002", t);
                        }
                        return;
                      }
                      if (r === "latedef") {
                        switch (i) {
                          case "true":
                            f.option.latedef = !0;
                            break;
                          case "false":
                            f.option.latedef = !1;
                            break;
                          case "nofunc":
                            f.option.latedef = "nofunc";
                            break;
                          default:
                            E("E002", t);
                        }
                        return;
                      }
                      if (r === "ignore") {
                        switch (i) {
                          case "start":
                            f.ignoreLinterErrors = !0;
                            break;
                          case "end":
                            f.ignoreLinterErrors = !1;
                            break;
                          case "line":
                            (f.ignoredLines[t.line] = !0), y();
                            break;
                          default:
                            E("E002", t);
                        }
                        return;
                      }
                      var s = /^([+-])(W\d{3})$/g.exec(r);
                      if (s) {
                        f.ignored[s[2]] = s[1] === "-";
                        return;
                      }
                      var u;
                      if (i === "true" || i === "false") {
                        t.type === "jslint"
                          ? ((u = _t[r] || r),
                            (f.option[u] = i === "true"),
                            Mt[u] !== undefined && (f.option[u] = !f.option[u]))
                          : (f.option[r] = i === "true"),
                          r === "newcap" && (f.option["(explicitNewcap)"] = !0);
                        return;
                      }
                      E("E002", t);
                    }),
                      v();
                }
                function C(e) {
                  var t = e || 0,
                    n = 0,
                    r;
                  while (n <= t) (r = zt[n]), r || (r = zt[n] = Wt.token()), (n += 1);
                  return r;
                }
                function k(e, t) {
                  switch (f.tokens.curr.id) {
                    case "(number)":
                      f.tokens.next.id === "." && b("W005", f.tokens.curr);
                      break;
                    case "-":
                      (f.tokens.next.id === "-" || f.tokens.next.id === "--") && b("W006");
                      break;
                    case "+":
                      (f.tokens.next.id === "+" || f.tokens.next.id === "++") && b("W007");
                  }
                  if (f.tokens.curr.type === "(string)" || f.tokens.curr.identifier) Ct = f.tokens.curr.value;
                  e &&
                    f.tokens.next.id !== e &&
                    (t
                      ? f.tokens.next.id === "(end)"
                        ? E("E019", t, t.id)
                        : E("E020", f.tokens.next, e, t.id, t.line, f.tokens.next.value)
                      : (f.tokens.next.type !== "(identifier)" || f.tokens.next.value !== e) &&
                        b("W116", f.tokens.next, e, f.tokens.next.value)),
                    (f.tokens.prev = f.tokens.curr),
                    (f.tokens.curr = f.tokens.next);
                  for (;;) {
                    (f.tokens.next = zt.shift() || Wt.token()), f.tokens.next || m("E041", f.tokens.curr.line);
                    if (f.tokens.next.id === "(end)" || f.tokens.next.id === "(error)") return;
                    f.tokens.next.check && f.tokens.next.check();
                    if (f.tokens.next.isSpecial) N();
                    else if (f.tokens.next.id !== "(endline)") break;
                  }
                }
                function L(e) {
                  return e.infix || (!e.identifier && !!e.led);
                }
                function A() {
                  var e = f.tokens.curr,
                    t = f.tokens.next;
                  return t.id === ";" || t.id === "}" || t.id === ":"
                    ? !0
                    : L(t) === L(e) || (e.id === "yield" && f.option.inMoz(!0))
                    ? e.line !== t.line
                    : !1;
                }
                function O(e, t) {
                  var n,
                    r = !1,
                    i = !1,
                    s = !1;
                  !t &&
                    f.tokens.next.value === "let" &&
                    C(0).value === "(" &&
                    (f.option.inMoz(!0) || b("W118", f.tokens.next, "let expressions"),
                    (s = !0),
                    jt["(blockscope)"].stack(),
                    k("let"),
                    k("("),
                    f.syntax.let.fud.call(f.syntax.let.fud, !1),
                    k(")")),
                    f.tokens.next.id === "(end)" && E("E006", f.tokens.curr),
                    f.option.asi &&
                      (f.tokens.curr.id === "[" || f.tokens.curr.id === "(" || f.tokens.curr.id === "/") &&
                      f.tokens.prev.line < f.tokens.curr.line &&
                      b("W014", f.tokens.curr, f.tokens.curr.id),
                    k(),
                    t && ((Ct = "anonymous"), (jt["(verb)"] = f.tokens.curr.value));
                  if (t === !0 && f.tokens.curr.fud) n = f.tokens.curr.fud();
                  else {
                    f.tokens.curr.nud ? (n = f.tokens.curr.nud()) : E("E030", f.tokens.curr, f.tokens.curr.id);
                    while (e < f.tokens.next.lbp && !A())
                      (r = f.tokens.curr.value === "Array"),
                        (i = f.tokens.curr.value === "Object"),
                        n &&
                          (n.value || (n.first && n.first.value)) &&
                          (n.value !== "new" || (n.first && n.first.value && n.first.value === ".")) &&
                          ((r = !1), n.value !== f.tokens.curr.value && (i = !1)),
                        k(),
                        r && f.tokens.curr.id === "(" && f.tokens.next.id === ")" && b("W009", f.tokens.curr),
                        i && f.tokens.curr.id === "(" && f.tokens.next.id === ")" && b("W010", f.tokens.curr),
                        n && f.tokens.curr.led
                          ? (n = f.tokens.curr.led(n))
                          : E("E033", f.tokens.curr, f.tokens.curr.id);
                  }
                  return s && jt["(blockscope)"].unstack(), n;
                }
                function M(e, t) {
                  (e = e || f.tokens.curr),
                    (t = t || f.tokens.next),
                    !f.option.laxbreak && e.line !== t.line && b("W014", t, t.value);
                }
                function _(e) {
                  (e = e || f.tokens.curr), e.line !== f.tokens.next.line && b("E022", e, e.value);
                }
                function D(e, t) {
                  e.line !== t.line &&
                    (f.option.laxcomma || (P.first && (b("I001"), (P.first = !1)), b("W014", e, t.value)));
                }
                function P(e) {
                  (e = e || {}), e.peek ? D(f.tokens.prev, f.tokens.curr) : (D(f.tokens.curr, f.tokens.next), k(","));
                  if (f.tokens.next.identifier && (!e.property || !f.option.inES5()))
                    switch (f.tokens.next.value) {
                      case "break":
                      case "case":
                      case "catch":
                      case "continue":
                      case "default":
                      case "do":
                      case "else":
                      case "finally":
                      case "for":
                      case "if":
                      case "in":
                      case "instanceof":
                      case "return":
                      case "switch":
                      case "throw":
                      case "try":
                      case "var":
                      case "let":
                      case "while":
                      case "with":
                        return E("E024", f.tokens.next, f.tokens.next.value), !1;
                    }
                  if (f.tokens.next.type === "(punctuator)")
                    switch (f.tokens.next.value) {
                      case "}":
                      case "]":
                      case ",":
                        if (e.allowTrailing) return !0;
                      case ")":
                        return E("E024", f.tokens.next, f.tokens.next.value), !1;
                    }
                  return !0;
                }
                function H(e, t) {
                  var n = f.syntax[e];
                  if (!n || typeof n != "object") f.syntax[e] = n = { id: e, lbp: t, value: e };
                  return n;
                }
                function B(e) {
                  return H(e, 0);
                }
                function j(e, t) {
                  var n = B(e);
                  return (n.identifier = n.reserved = !0), (n.fud = t), n;
                }
                function F(e, t) {
                  var n = j(e, t);
                  return (n.block = !0), n;
                }
                function I(e) {
                  var t = e.id.charAt(0);
                  if ((t >= "a" && t <= "z") || (t >= "A" && t <= "Z")) e.identifier = e.reserved = !0;
                  return e;
                }
                function q(e, t) {
                  var n = H(e, 150);
                  return (
                    I(n),
                    (n.nud =
                      typeof t == "function"
                        ? t
                        : function () {
                            (this.right = O(150)), (this.arity = "unary");
                            if (this.id === "++" || this.id === "--")
                              f.option.plusplus
                                ? b("W016", this, this.id)
                                : this.right &&
                                  (!this.right.identifier || h(this.right)) &&
                                  this.right.id !== "." &&
                                  this.right.id !== "[" &&
                                  b("W017", this);
                            return this;
                          }),
                    n
                  );
                }
                function R(e, t) {
                  var n = B(e);
                  return (n.type = e), (n.nud = t), n;
                }
                function U(e, t) {
                  var n = R(e, t);
                  return (n.identifier = !0), (n.reserved = !0), n;
                }
                function z(e, t) {
                  var n = R(
                    e,
                    (t && t.nud) ||
                      function () {
                        return this;
                      }
                  );
                  return (
                    (t = t || {}),
                    (t.isFutureReservedWord = !0),
                    (n.value = e),
                    (n.identifier = !0),
                    (n.reserved = !0),
                    (n.meta = t),
                    n
                  );
                }
                function W(e, t) {
                  return U(e, function () {
                    return typeof t == "function" && t(this), this;
                  });
                }
                function X(e, t, n, r) {
                  var i = H(e, n);
                  return (
                    I(i),
                    (i.infix = !0),
                    (i.led = function (i) {
                      return (
                        r || M(f.tokens.prev, f.tokens.curr),
                        e === "in" && i.id === "!" && b("W018", i, "!"),
                        typeof t == "function" ? t(i, this) : ((this.left = i), (this.right = O(n)), this)
                      );
                    }),
                    i
                  );
                }
                function V(e) {
                  var t = H(e, 42);
                  return (
                    (t.led = function (e) {
                      return (
                        f.option.inESNext() || b("W104", f.tokens.curr, "arrow function syntax (=>)"),
                        M(f.tokens.prev, f.tokens.curr),
                        (this.left = e),
                        (this.right = mt(undefined, undefined, !1, e)),
                        this
                      );
                    }),
                    t
                  );
                }
                function $(e, t) {
                  var r = H(e, 100);
                  return (
                    (r.led = function (e) {
                      M(f.tokens.prev, f.tokens.curr);
                      var r = O(100);
                      return (
                        n(e, "NaN") || n(r, "NaN") ? b("W019", this) : t && t.apply(this, [e, r]),
                        (!e || !r) && m("E041", f.tokens.curr.line),
                        e.id === "!" && b("W018", e, "!"),
                        r.id === "!" && b("W018", r, "!"),
                        (this.left = e),
                        (this.right = r),
                        this
                      );
                    }),
                    r
                  );
                }
                function J(e) {
                  return (
                    e &&
                    ((e.type === "(number)" && +e.value === 0) ||
                      (e.type === "(string)" && e.value === "") ||
                      (e.type === "null" && !f.option.eqnull) ||
                      e.type === "true" ||
                      e.type === "false" ||
                      e.type === "undefined")
                  );
                }
                function K(e, t) {
                  if (f.option.notypeof) return !1;
                  if (!e || !t) return !1;
                  var n = [
                    "undefined",
                    "object",
                    "boolean",
                    "number",
                    "string",
                    "function",
                    "xml",
                    "object",
                    "unknown",
                  ];
                  return t.type === "(identifier)" && t.value === "typeof" && e.type === "(string)"
                    ? !r.contains(n, e.value)
                    : !1;
                }
                function Q(e) {
                  function t(e) {
                    if (typeof e != "object") return;
                    return e.right === "prototype" ? e : t(e.left);
                  }
                  function n(e) {
                    while (!e.identifier && typeof e.left == "object") e = e.left;
                    if (e.identifier && r.indexOf(e.value) >= 0) return e.value;
                  }
                  var r = [
                      "Array",
                      "ArrayBuffer",
                      "Boolean",
                      "Collator",
                      "DataView",
                      "Date",
                      "DateTimeFormat",
                      "Error",
                      "EvalError",
                      "Float32Array",
                      "Float64Array",
                      "Function",
                      "Infinity",
                      "Intl",
                      "Int16Array",
                      "Int32Array",
                      "Int8Array",
                      "Iterator",
                      "Number",
                      "NumberFormat",
                      "Object",
                      "RangeError",
                      "ReferenceError",
                      "RegExp",
                      "StopIteration",
                      "String",
                      "SyntaxError",
                      "TypeError",
                      "Uint16Array",
                      "Uint32Array",
                      "Uint8Array",
                      "Uint8ClampedArray",
                      "URIError",
                    ],
                    i = t(e);
                  if (i) return n(i);
                }
                function G(e, t, n) {
                  var r = X(
                    e,
                    typeof t == "function"
                      ? t
                      : function (e, t) {
                          t.left = e;
                          if (e) {
                            if (f.option.freeze) {
                              var n = Q(e);
                              n && b("W121", e, n);
                            }
                            Jt[e.value] === !1 && Kt[e.value]["(global)"] === !0
                              ? b("W020", e)
                              : e["function"] && b("W021", e, e.value),
                              jt[e.value] === "const" && E("E013", e, e.value);
                            if (e.id === ".")
                              return (
                                e.left
                                  ? e.left.value === "arguments" && !f.directive["use strict"] && b("E031", t)
                                  : b("E031", t),
                                (t.right = O(10)),
                                t
                              );
                            if (e.id === "[")
                              return (
                                f.tokens.curr.left.first
                                  ? f.tokens.curr.left.first.forEach(function (e) {
                                      e && jt[e.value] === "const" && E("E013", e, e.value);
                                    })
                                  : e.left
                                  ? e.left.value === "arguments" && !f.directive["use strict"] && b("E031", t)
                                  : b("E031", t),
                                (t.right = O(10)),
                                t
                              );
                            if (e.identifier && !h(e))
                              return jt[e.value] === "exception" && b("W022", e), (t.right = O(10)), t;
                            e === f.syntax["function"] && b("W023", f.tokens.curr);
                          }
                          E("E031", t);
                        },
                    n
                  );
                  return (r.exps = !0), (r.assign = !0), r;
                }
                function Y(e, t, n) {
                  var r = H(e, n);
                  return (
                    I(r),
                    (r.led =
                      typeof t == "function"
                        ? t
                        : function (e) {
                            return (
                              f.option.bitwise && b("W016", this, this.id), (this.left = e), (this.right = O(n)), this
                            );
                          }),
                    r
                  );
                }
                function Z(e) {
                  return G(
                    e,
                    function (e, t) {
                      f.option.bitwise && b("W016", t, t.id);
                      if (e)
                        return e.id === "." || e.id === "[" || (e.identifier && !h(e))
                          ? (O(10), t)
                          : (e === f.syntax["function"] && b("W023", f.tokens.curr), t);
                      E("E031", t);
                    },
                    20
                  );
                }
                function et(e) {
                  var t = H(e, 150);
                  return (
                    (t.led = function (e) {
                      return (
                        f.option.plusplus
                          ? b("W016", this, this.id)
                          : (!e.identifier || h(e)) && e.id !== "." && e.id !== "[" && b("W017", this),
                        (this.left = e),
                        this
                      );
                    }),
                    t
                  );
                }
                function tt(e, t) {
                  if (!f.tokens.next.identifier) return;
                  k();
                  var n = f.tokens.curr,
                    r = f.tokens.curr.value;
                  return h(n)
                    ? t && f.option.inES5()
                      ? r
                      : e && r === "undefined"
                      ? r
                      : (b("W024", f.tokens.curr, f.tokens.curr.id), r)
                    : r;
                }
                function nt(e, t) {
                  var n = tt(e, t);
                  if (n) return n;
                  f.tokens.curr.id === "function" && f.tokens.next.id === "("
                    ? b("W025")
                    : E("E030", f.tokens.next, f.tokens.next.value);
                }
                function rt(e) {
                  var t = 0,
                    n;
                  if (f.tokens.next.id !== ";" || $t) return;
                  for (;;) {
                    do (n = C(t)), (t += 1);
                    while (n.id != "(end)" && n.id === "(comment)");
                    if (n.reach) return;
                    if (n.id !== "(endline)") {
                      if (n.id === "function") {
                        f.option.latedef === !0 && b("W026", n);
                        break;
                      }
                      b("W027", n, n.value, e);
                      break;
                    }
                  }
                }
                function it() {
                  var e,
                    t = Ut,
                    n,
                    i = Kt,
                    s = f.tokens.next;
                  if (s.id === ";") {
                    k(";");
                    return;
                  }
                  var o = h(s);
                  o && s.meta && s.meta.isFutureReservedWord && C().id === ":" && (b("W024", s, s.id), (o = !1));
                  if (r.has(["[", "{"], s.value) && on().isDestAssign) {
                    f.option.inESNext() || b("W104", f.tokens.curr, "destructuring expression"),
                      (e = wt()),
                      e.forEach(function (e) {
                        g(jt, "W117", e.token, e.id);
                      }),
                      k("="),
                      Et(e, O(10, !0)),
                      k(";");
                    return;
                  }
                  s.identifier &&
                    !o &&
                    C().id === ":" &&
                    (k(),
                    k(":"),
                    (Kt = Object.create(i)),
                    T(s.value, { type: "label" }),
                    !f.tokens.next.labelled &&
                      f.tokens.next.value !== "{" &&
                      b("W028", f.tokens.next, s.value, f.tokens.next.value),
                    (f.tokens.next.label = s.value),
                    (s = f.tokens.next));
                  if (s.id === "{") {
                    var u = jt["(verb)"] === "case" && f.tokens.curr.value === ":";
                    ut(!0, !0, !1, !1, u);
                    return;
                  }
                  return (
                    (n = O(0, !0)),
                    n &&
                      (!n.identifier || n.value !== "function") &&
                      n.type !== "(punctuator)" &&
                      !f.directive["use strict"] &&
                      f.option.globalstrict &&
                      f.option.strict &&
                      b("E007"),
                    s.block ||
                      (!f.option.expr && (!n || !n.exps)
                        ? b("W030", f.tokens.curr)
                        : f.option.nonew && n && n.left && n.id === "(" && n.left.id === "new" && b("W031", s),
                      f.tokens.next.id !== ";"
                        ? f.option.asi ||
                          ((!f.option.lastsemic ||
                            f.tokens.next.id !== "}" ||
                            f.tokens.next.line !== f.tokens.curr.line) &&
                            w("W033", f.tokens.curr.line, f.tokens.curr.character))
                        : k(";")),
                    (Ut = t),
                    (Kt = i),
                    n
                  );
                }
                function st(e) {
                  var t = [],
                    n;
                  while (!f.tokens.next.reach && f.tokens.next.id !== "(end)")
                    f.tokens.next.id === ";"
                      ? ((n = C()), (!n || (n.id !== "(" && n.id !== "[")) && b("W032"), k(";"))
                      : t.push(it(e === f.tokens.next.line));
                  return t;
                }
                function ot() {
                  var e, t, n;
                  for (;;) {
                    if (f.tokens.next.id === "(string)") {
                      t = C(0);
                      if (t.id === "(endline)") {
                        e = 1;
                        do (n = C(e)), (e += 1);
                        while (n.id === "(endline)");
                        if (n.id !== ";") {
                          if (
                            n.id !== "(string)" &&
                            n.id !== "(number)" &&
                            n.id !== "(regexp)" &&
                            n.identifier !== !0 &&
                            n.id !== "}"
                          )
                            break;
                          b("W033", f.tokens.next);
                        } else t = n;
                      } else if (t.id === "}") b("W033", t);
                      else if (t.id !== ";") break;
                      k(),
                        f.directive[f.tokens.curr.value] && b("W034", f.tokens.curr, f.tokens.curr.value),
                        f.tokens.curr.value === "use strict" &&
                          (f.option["(explicitNewcap)"] || (f.option.newcap = !0), (f.option.undef = !0)),
                        (f.directive[f.tokens.curr.value] = !0),
                        t.id === ";" && k(";");
                      continue;
                    }
                    break;
                  }
                }
                function ut(e, t, n, i, s) {
                  var o,
                    u = Rt,
                    a = Ut,
                    l,
                    c = Kt,
                    h,
                    p,
                    d;
                  Rt = e;
                  if (!e || !f.option.funcscope) Kt = Object.create(Kt);
                  h = f.tokens.next;
                  var v = jt["(metrics)"];
                  (v.nestedBlockDepth += 1), v.verifyMaxNestedBlockDepthPerFunction();
                  if (f.tokens.next.id === "{") {
                    k("{"), jt["(blockscope)"].stack(), (p = f.tokens.curr.line);
                    if (f.tokens.next.id !== "}") {
                      Ut += f.option.indent;
                      while (!e && f.tokens.next.from > Ut) Ut += f.option.indent;
                      if (n) {
                        l = {};
                        for (d in f.directive) r.has(f.directive, d) && (l[d] = f.directive[d]);
                        ot(),
                          f.option.strict &&
                            jt["(context)"]["(global)"] &&
                            !l["use strict"] &&
                            !f.directive["use strict"] &&
                            b("E007");
                      }
                      (o = st(p)), (v.statementCount += o.length), n && (f.directive = l), (Ut -= f.option.indent);
                    }
                    k("}", h), jt["(blockscope)"].unstack(), (Ut = a);
                  } else if (!e)
                    if (n) {
                      (l = {}),
                        t && !i && !f.option.inMoz(!0) && E("W118", f.tokens.curr, "function closure expressions");
                      if (!t) for (d in f.directive) r.has(f.directive, d) && (l[d] = f.directive[d]);
                      O(10),
                        f.option.strict &&
                          jt["(context)"]["(global)"] &&
                          !l["use strict"] &&
                          !f.directive["use strict"] &&
                          b("E007");
                    } else E("E021", f.tokens.next, "{", f.tokens.next.value);
                  else
                    (jt["(nolet)"] = !0),
                      (!t || f.option.curly) && b("W116", f.tokens.next, "{", f.tokens.next.value),
                      ($t = !0),
                      (Ut += f.option.indent),
                      (o = [it()]),
                      (Ut -= f.option.indent),
                      ($t = !1),
                      delete jt["(nolet)"];
                  switch (jt["(verb)"]) {
                    case "break":
                    case "continue":
                    case "return":
                    case "throw":
                      if (s) break;
                    default:
                      jt["(verb)"] = null;
                  }
                  if (!e || !f.option.funcscope) Kt = c;
                  return (
                    (Rt = u), e && f.option.noempty && (!o || o.length === 0) && b("W035"), (v.nestedBlockDepth -= 1), o
                  );
                }
                function at(e) {
                  Vt && typeof Vt[e] != "boolean" && b("W036", f.tokens.curr, e),
                    typeof Xt[e] == "number" ? (Xt[e] += 1) : (Xt[e] = 1);
                }
                function ft(e) {
                  var t = e.value,
                    n = Object.getOwnPropertyDescriptor(qt, t);
                  n ? n.value.push(e.line) : (qt[t] = [e.line]);
                }
                function lt() {
                  var e = {};
                  (e.exps = !0), jt["(comparray)"].stack();
                  var t = !1;
                  return (
                    f.tokens.next.value !== "for" &&
                      ((t = !0),
                      f.option.inMoz(!0) || b("W116", f.tokens.next, "for", f.tokens.next.value),
                      jt["(comparray)"].setState("use"),
                      (e.right = O(10))),
                    k("for"),
                    f.tokens.next.value === "each" &&
                      (k("each"), f.option.inMoz(!0) || b("W118", f.tokens.curr, "for each")),
                    k("("),
                    jt["(comparray)"].setState("define"),
                    (e.left = O(130)),
                    r.contains(["in", "of"], f.tokens.next.value) ? k() : E("E045", f.tokens.curr),
                    jt["(comparray)"].setState("generate"),
                    O(10),
                    k(")"),
                    f.tokens.next.value === "if" &&
                      (k("if"), k("("), jt["(comparray)"].setState("filter"), (e.filter = O(10)), k(")")),
                    t || (jt["(comparray)"].setState("use"), (e.right = O(10))),
                    k("]"),
                    jt["(comparray)"].unstack(),
                    e
                  );
                }
                function ct() {
                  var e = tt(!1, !0);
                  return (
                    e ||
                      (f.tokens.next.id === "(string)"
                        ? ((e = f.tokens.next.value), k())
                        : f.tokens.next.id === "(number)" && ((e = f.tokens.next.value.toString()), k())),
                    e === "hasOwnProperty" && b("W001"),
                    e
                  );
                }
                function ht(e) {
                  var t,
                    n,
                    i = [],
                    s,
                    o = [],
                    u,
                    a = !1;
                  if (e) {
                    if (Array.isArray(e)) {
                      for (var l in e) {
                        t = e[l];
                        if (t.value === "...") {
                          f.option.inESNext() || b("W104", t, "spread/rest operator");
                          continue;
                        }
                        t.value !== "," && (i.push(t.value), T(t.value, { type: "unused", token: t }));
                      }
                      return i;
                    }
                    if (e.identifier === !0) return T(e.value, { type: "unused", token: e }), [e];
                  }
                  (n = f.tokens.next), k("(");
                  if (f.tokens.next.id === ")") {
                    k(")");
                    return;
                  }
                  for (;;) {
                    if (r.contains(["{", "["], f.tokens.next.id)) {
                      o = wt();
                      for (u in o) (u = o[u]), u.id && (i.push(u.id), T(u.id, { type: "unused", token: u.token }));
                    } else
                      f.tokens.next.value === "..."
                        ? (f.option.inESNext() || b("W104", f.tokens.next, "spread/rest operator"),
                          k("..."),
                          (s = nt(!0)),
                          i.push(s),
                          T(s, { type: "unused", token: f.tokens.curr }))
                        : ((s = nt(!0)), i.push(s), T(s, { type: "unused", token: f.tokens.curr }));
                    a && f.tokens.next.id !== "=" && E("E051", f.tokens.current),
                      f.tokens.next.id === "=" &&
                        (f.option.inESNext() || b("W119", f.tokens.next, "default parameters"),
                        k("="),
                        (a = !0),
                        O(10));
                    if (f.tokens.next.id !== ",") return k(")", n), i;
                    P();
                  }
                }
                function pt(e, t, n) {
                  e["(properties)"][t] || (e["(properties)"][t] = { unused: !1 }), r.extend(e["(properties)"][t], n);
                }
                function dt(e, t, n) {
                  return e["(properties)"][t] ? e["(properties)"][t][n] || null : null;
                }
                function vt(e, t, n, i) {
                  var s = {
                    "(name)": e,
                    "(breakage)": 0,
                    "(loopage)": 0,
                    "(scope)": n,
                    "(tokens)": {},
                    "(properties)": {},
                    "(catch)": !1,
                    "(global)": !1,
                    "(line)": null,
                    "(character)": null,
                    "(metrics)": null,
                    "(statement)": null,
                    "(context)": null,
                    "(blockscope)": null,
                    "(comparray)": null,
                    "(generator)": null,
                    "(params)": null,
                  };
                  return (
                    t && r.extend(s, { "(line)": t.line, "(character)": t.character, "(metrics)": gt(t) }),
                    r.extend(s, i),
                    s["(context)"] &&
                      ((s["(blockscope)"] = s["(context)"]["(blockscope)"]),
                      (s["(comparray)"] = s["(context)"]["(comparray)"])),
                    s
                  );
                }
                function mt(e, t, n, i) {
                  var s,
                    o = f.option,
                    u = f.ignored,
                    a = Kt;
                  return (
                    (f.option = Object.create(f.option)),
                    (f.ignored = Object.create(f.ignored)),
                    (Kt = Object.create(Kt)),
                    (jt = vt(e || '"' + Ct + '"', f.tokens.next, Kt, {
                      "(statement)": t,
                      "(context)": jt,
                      "(generator)": n ? !0 : null,
                    })),
                    (s = jt),
                    (f.tokens.curr.funct = jt),
                    Ft.push(jt),
                    e && T(e, { type: "function" }),
                    (jt["(params)"] = ht(i)),
                    jt["(metrics)"].verifyMaxParametersPerFunction(jt["(params)"]),
                    (c.undefs = r.filter(c.undefs, function (e) {
                      return !r.contains(r.union(i), e[2]);
                    })),
                    ut(!1, !0, !0, i ? !0 : !1),
                    !f.option.noyield && n && jt["(generator)"] !== "yielded" && b("W124", f.tokens.curr),
                    jt["(metrics)"].verifyMaxStatementsPerFunction(),
                    jt["(metrics)"].verifyMaxComplexityPerFunction(),
                    (jt["(unusedOption)"] = f.option.unused),
                    (Kt = a),
                    (f.option = o),
                    (f.ignored = u),
                    (jt["(last)"] = f.tokens.curr.line),
                    (jt["(lastcharacter)"] = f.tokens.curr.character),
                    r.map(Object.keys(jt), function (e) {
                      if (e[0] === "(") return;
                      jt["(blockscope)"].unshadow(e);
                    }),
                    (jt = jt["(context)"]),
                    s
                  );
                }
                function gt(e) {
                  return {
                    statementCount: 0,
                    nestedBlockDepth: -1,
                    ComplexityCount: 1,
                    verifyMaxStatementsPerFunction: function () {
                      f.option.maxstatements &&
                        this.statementCount > f.option.maxstatements &&
                        b("W071", e, this.statementCount);
                    },
                    verifyMaxParametersPerFunction: function (t) {
                      (t = t || []), f.option.maxparams && t.length > f.option.maxparams && b("W072", e, t.length);
                    },
                    verifyMaxNestedBlockDepthPerFunction: function () {
                      f.option.maxdepth &&
                        this.nestedBlockDepth > 0 &&
                        this.nestedBlockDepth === f.option.maxdepth + 1 &&
                        b("W073", null, this.nestedBlockDepth);
                    },
                    verifyMaxComplexityPerFunction: function () {
                      var t = f.option.maxcomplexity,
                        n = this.ComplexityCount;
                      t && n > t && b("W074", e, n);
                    },
                  };
                }
                function yt() {
                  jt["(metrics)"].ComplexityCount += 1;
                }
                function bt(e) {
                  var t, n;
                  e &&
                    ((t = e.id),
                    (n = e.paren),
                    t === "," && (e = e.exprs[e.exprs.length - 1]) && ((t = e.id), (n = n || e.paren)));
                  switch (t) {
                    case "=":
                    case "+=":
                    case "-=":
                    case "*=":
                    case "%=":
                    case "&=":
                    case "|=":
                    case "^=":
                    case "/=":
                      !n && !f.option.boss && b("W084");
                  }
                }
                function wt() {
                  var e,
                    t,
                    n = [];
                  f.option.inESNext() || b("W104", f.tokens.curr, "destructuring expression");
                  var i = function () {
                    var e;
                    if (r.contains(["[", "{"], f.tokens.next.value)) {
                      t = wt();
                      for (var s in t) (s = t[s]), n.push({ id: s.id, token: s.token });
                    } else
                      f.tokens.next.value === ","
                        ? n.push({ id: null, token: f.tokens.curr })
                        : f.tokens.next.value === "("
                        ? (k("("), i(), k(")"))
                        : ((e = nt()), e && n.push({ id: e, token: f.tokens.curr }));
                  };
                  if (f.tokens.next.value === "[") {
                    k("["), i();
                    while (f.tokens.next.value !== "]") k(","), i();
                    k("]");
                  } else if (f.tokens.next.value === "{") {
                    k("{"),
                      (e = nt()),
                      f.tokens.next.value === ":" ? (k(":"), i()) : n.push({ id: e, token: f.tokens.curr });
                    while (f.tokens.next.value !== "}")
                      k(","),
                        (e = nt()),
                        f.tokens.next.value === ":" ? (k(":"), i()) : n.push({ id: e, token: f.tokens.curr });
                    k("}");
                  }
                  return n;
                }
                function Et(e, t) {
                  var n = t.first;
                  if (!n) return;
                  r.zip(e, Array.isArray(n) ? n : [n]).forEach(function (e) {
                    var t = e[0],
                      n = e[1];
                    t && n ? (t.first = n) : t && t.first && !n && b("W080", t.first, t.first.value);
                  });
                }
                function St(e) {
                  return (
                    f.option.inESNext() || b("W104", f.tokens.curr, "class"),
                    e
                      ? ((this.name = nt()), T(this.name, { type: "unused", token: f.tokens.curr }))
                      : f.tokens.next.identifier && f.tokens.next.value !== "extends" && (this.name = nt()),
                    xt(this),
                    this
                  );
                }
                function xt(e) {
                  var t = f.directive["use strict"];
                  f.tokens.next.value === "extends" && (k("extends"), (e.heritage = O(10))),
                    (f.directive["use strict"] = !0),
                    k("{"),
                    (e.body = f.syntax["{"].nud(!0)),
                    (f.directive["use strict"] = t);
                }
                function Tt() {
                  var e = on();
                  e.notJson
                    ? (!f.option.inESNext() && e.isDestAssign && b("W104", f.tokens.curr, "destructuring assignment"),
                      st())
                    : ((f.option.laxbreak = !0), (f.jsonMode = !0), Nt());
                }
                function Nt() {
                  function e() {
                    var e = {},
                      t = f.tokens.next;
                    k("{");
                    if (f.tokens.next.id !== "}")
                      for (;;) {
                        if (f.tokens.next.id === "(end)") E("E026", f.tokens.next, t.line);
                        else {
                          if (f.tokens.next.id === "}") {
                            b("W094", f.tokens.curr);
                            break;
                          }
                          f.tokens.next.id === ","
                            ? E("E028", f.tokens.next)
                            : f.tokens.next.id !== "(string)" && b("W095", f.tokens.next, f.tokens.next.value);
                        }
                        e[f.tokens.next.value] === !0
                          ? b("W075", f.tokens.next, f.tokens.next.value)
                          : (f.tokens.next.value === "__proto__" && !f.option.proto) ||
                            (f.tokens.next.value === "__iterator__" && !f.option.iterator)
                          ? b("W096", f.tokens.next, f.tokens.next.value)
                          : (e[f.tokens.next.value] = !0),
                          k(),
                          k(":"),
                          Nt();
                        if (f.tokens.next.id !== ",") break;
                        k(",");
                      }
                    k("}");
                  }
                  function t() {
                    var e = f.tokens.next;
                    k("[");
                    if (f.tokens.next.id !== "]")
                      for (;;) {
                        if (f.tokens.next.id === "(end)") E("E027", f.tokens.next, e.line);
                        else {
                          if (f.tokens.next.id === "]") {
                            b("W094", f.tokens.curr);
                            break;
                          }
                          f.tokens.next.id === "," && E("E028", f.tokens.next);
                        }
                        Nt();
                        if (f.tokens.next.id !== ",") break;
                        k(",");
                      }
                    k("]");
                  }
                  switch (f.tokens.next.id) {
                    case "{":
                      e();
                      break;
                    case "[":
                      t();
                      break;
                    case "true":
                    case "false":
                    case "null":
                    case "(number)":
                    case "(string)":
                      k();
                      break;
                    case "-":
                      k("-"), k("(number)");
                      break;
                    default:
                      E("E003", f.tokens.next);
                  }
                }
                var Ct,
                  kt,
                  Lt = {
                    "<": !0,
                    "<=": !0,
                    "==": !0,
                    "===": !0,
                    "!==": !0,
                    "!=": !0,
                    ">": !0,
                    ">=": !0,
                    "+": !0,
                    "-": !0,
                    "*": !0,
                    "/": !0,
                    "%": !0,
                  },
                  At = {
                    asi: !0,
                    bitwise: !0,
                    boss: !0,
                    browser: !0,
                    camelcase: !0,
                    couch: !0,
                    curly: !0,
                    debug: !0,
                    devel: !0,
                    dojo: !0,
                    eqeqeq: !0,
                    eqnull: !0,
                    notypeof: !0,
                    es3: !0,
                    es5: !0,
                    esnext: !0,
                    moz: !0,
                    evil: !0,
                    expr: !0,
                    forin: !0,
                    funcscope: !0,
                    globalstrict: !0,
                    immed: !0,
                    iterator: !0,
                    jquery: !0,
                    lastsemic: !0,
                    laxbreak: !0,
                    laxcomma: !0,
                    loopfunc: !0,
                    mootools: !0,
                    multistr: !0,
                    freeze: !0,
                    newcap: !0,
                    noarg: !0,
                    node: !0,
                    noempty: !0,
                    nonbsp: !0,
                    nonew: !0,
                    nonstandard: !0,
                    phantom: !0,
                    plusplus: !0,
                    proto: !0,
                    prototypejs: !0,
                    rhino: !0,
                    shelljs: !0,
                    typed: !0,
                    undef: !0,
                    scripturl: !0,
                    strict: !0,
                    sub: !0,
                    supernew: !0,
                    validthis: !0,
                    withstmt: !0,
                    worker: !0,
                    wsh: !0,
                    yui: !0,
                    mocha: !0,
                    noyield: !0,
                    onecase: !0,
                    regexp: !0,
                    regexdash: !0,
                  },
                  Ot = {
                    maxlen: !1,
                    indent: !1,
                    maxerr: !1,
                    predef: !1,
                    globals: !1,
                    quotmark: !1,
                    scope: !1,
                    maxstatements: !1,
                    maxdepth: !1,
                    maxparams: !1,
                    maxcomplexity: !1,
                    shadow: !1,
                    unused: !0,
                    latedef: !1,
                    ignore: !1,
                  },
                  Mt = {
                    bitwise: !0,
                    forin: !0,
                    newcap: !0,
                    plusplus: !0,
                    regexp: !0,
                    undef: !0,
                    eqeqeq: !0,
                    strict: !0,
                  },
                  _t = { eqeq: "eqeqeq", windows: "wsh", sloppy: "strict" },
                  Dt = { nomen: !0, onevar: !0, passfail: !0, white: !0, gcl: !0, smarttabs: !0, trailing: !0 },
                  Pt,
                  Ht,
                  Bt = ["closure", "exception", "global", "label", "outer", "unused", "var"],
                  jt,
                  Ft,
                  It,
                  qt,
                  Rt,
                  Ut,
                  zt,
                  Wt,
                  Xt,
                  Vt,
                  $t,
                  Jt,
                  Kt,
                  Qt,
                  Gt,
                  Yt,
                  Zt = [],
                  en = new i.EventEmitter();
                R("(number)", function () {
                  return this;
                }),
                  R("(string)", function () {
                    return this;
                  }),
                  R("(template)", function () {
                    return this;
                  }),
                  (f.syntax["(identifier)"] = {
                    type: "(identifier)",
                    lbp: 0,
                    identifier: !0,
                    nud: function () {
                      var e = this.value,
                        t = Kt[e],
                        n,
                        r;
                      typeof t == "function"
                        ? (t = undefined)
                        : !jt["(blockscope)"].current.has(e) &&
                          typeof t == "boolean" &&
                          ((n = jt), (jt = Ft[0]), T(e, { type: "var" }), (t = jt), (jt = n)),
                        (r = jt["(blockscope)"].getlabel(e));
                      if (jt === t || r)
                        switch (r ? r[e]["(type)"] : jt[e]) {
                          case "unused":
                            r ? (r[e]["(type)"] = "var") : (jt[e] = "var");
                            break;
                          case "unction":
                            r ? (r[e]["(type)"] = "function") : (jt[e] = "function"), (this["function"] = !0);
                            break;
                          case "const":
                            pt(jt, e, { unused: !1 });
                            break;
                          case "function":
                            this["function"] = !0;
                            break;
                          case "label":
                            b("W037", f.tokens.curr, e);
                        }
                      else if (jt["(global)"])
                        typeof Jt[e] != "boolean" &&
                          ((Ct !== "typeof" && Ct !== "delete") ||
                            (f.tokens.next && (f.tokens.next.value === "." || f.tokens.next.value === "["))) &&
                          (jt["(comparray)"].check(e) || g(jt, "W117", f.tokens.curr, e)),
                          ft(f.tokens.curr);
                      else
                        switch (jt[e]) {
                          case "closure":
                          case "function":
                          case "var":
                          case "unused":
                            b("W038", f.tokens.curr, e);
                            break;
                          case "label":
                            b("W037", f.tokens.curr, e);
                            break;
                          case "outer":
                          case "global":
                            break;
                          default:
                            if (t === !0) jt[e] = !0;
                            else if (t === null) b("W039", f.tokens.curr, e), ft(f.tokens.curr);
                            else if (typeof t != "object")
                              ((Ct !== "typeof" && Ct !== "delete") ||
                                (f.tokens.next && (f.tokens.next.value === "." || f.tokens.next.value === "["))) &&
                                g(jt, "W117", f.tokens.curr, e),
                                (jt[e] = !0),
                                ft(f.tokens.curr);
                            else
                              switch (t[e]) {
                                case "function":
                                case "unction":
                                  (this["function"] = !0),
                                    (t[e] = "closure"),
                                    (jt[e] = t["(global)"] ? "global" : "outer");
                                  break;
                                case "var":
                                case "unused":
                                  (t[e] = "closure"), (jt[e] = t["(global)"] ? "global" : "outer");
                                  break;
                                case "const":
                                  pt(t, e, { unused: !1 });
                                  break;
                                case "closure":
                                  jt[e] = t["(global)"] ? "global" : "outer";
                                  break;
                                case "label":
                                  b("W037", f.tokens.curr, e);
                              }
                        }
                      return this;
                    },
                    led: function () {
                      E("E033", f.tokens.next, f.tokens.next.value);
                    },
                  }),
                  R("(regexp)", function () {
                    return this;
                  }),
                  B("(endline)"),
                  B("(begin)"),
                  (B("(end)").reach = !0),
                  (B("(error)").reach = !0),
                  (B("}").reach = !0),
                  B(")"),
                  B("]"),
                  (B('"').reach = !0),
                  (B("'").reach = !0),
                  B(";"),
                  (B(":").reach = !0),
                  B("#"),
                  U("else"),
                  (U("case").reach = !0),
                  U("catch"),
                  (U("default").reach = !0),
                  U("finally"),
                  W("arguments", function (e) {
                    f.directive["use strict"] && jt["(global)"] && b("E008", e);
                  }),
                  W("eval"),
                  W("false"),
                  W("Infinity"),
                  W("null"),
                  W("this", function (e) {
                    f.directive["use strict"] &&
                      !f.option.validthis &&
                      ((jt["(statement)"] && jt["(name)"].charAt(0) > "Z") || jt["(global)"]) &&
                      b("W040", e);
                  }),
                  W("true"),
                  W("undefined"),
                  G("=", "assign", 20),
                  G("+=", "assignadd", 20),
                  G("-=", "assignsub", 20),
                  G("*=", "assignmult", 20),
                  (G("/=", "assigndiv", 20).nud = function () {
                    E("E014");
                  }),
                  G("%=", "assignmod", 20),
                  Z("&=", "assignbitand", 20),
                  Z("|=", "assignbitor", 20),
                  Z("^=", "assignbitxor", 20),
                  Z("<<=", "assignshiftleft", 20),
                  Z(">>=", "assignshiftright", 20),
                  Z(">>>=", "assignshiftrightunsigned", 20),
                  X(
                    ",",
                    function (e, t) {
                      var n;
                      t.exprs = [e];
                      if (!P({ peek: !0 })) return t;
                      for (;;) {
                        if (!(n = O(10))) break;
                        t.exprs.push(n);
                        if (f.tokens.next.value !== "," || !P()) break;
                      }
                      return t;
                    },
                    10,
                    !0
                  ),
                  X(
                    "?",
                    function (e, t) {
                      return yt(), (t.left = e), (t.right = O(10)), k(":"), (t["else"] = O(10)), t;
                    },
                    30
                  );
                var tn = 40;
                X(
                  "||",
                  function (e, t) {
                    return yt(), (t.left = e), (t.right = O(tn)), t;
                  },
                  tn
                ),
                  X("&&", "and", 50),
                  Y("|", "bitor", 70),
                  Y("^", "bitxor", 80),
                  Y("&", "bitand", 90),
                  $("==", function (e, t) {
                    var n = f.option.eqnull && (e.value === "null" || t.value === "null");
                    switch (!0) {
                      case !n && f.option.eqeqeq:
                        (this.from = this.character), b("W116", this, "===", "==");
                        break;
                      case J(e):
                        b("W041", this, "===", e.value);
                        break;
                      case J(t):
                        b("W041", this, "===", t.value);
                        break;
                      case K(t, e):
                        b("W122", this, t.value);
                        break;
                      case K(e, t):
                        b("W122", this, e.value);
                    }
                    return this;
                  }),
                  $("===", function (e, t) {
                    return K(t, e) ? b("W122", this, t.value) : K(e, t) && b("W122", this, e.value), this;
                  }),
                  $("!=", function (e, t) {
                    var n = f.option.eqnull && (e.value === "null" || t.value === "null");
                    return (
                      !n && f.option.eqeqeq
                        ? ((this.from = this.character), b("W116", this, "!==", "!="))
                        : J(e)
                        ? b("W041", this, "!==", e.value)
                        : J(t)
                        ? b("W041", this, "!==", t.value)
                        : K(t, e)
                        ? b("W122", this, t.value)
                        : K(e, t) && b("W122", this, e.value),
                      this
                    );
                  }),
                  $("!==", function (e, t) {
                    return K(t, e) ? b("W122", this, t.value) : K(e, t) && b("W122", this, e.value), this;
                  }),
                  $("<"),
                  $(">"),
                  $("<="),
                  $(">="),
                  Y("<<", "shiftleft", 120),
                  Y(">>", "shiftright", 120),
                  Y(">>>", "shiftrightunsigned", 120),
                  X("in", "in", 120),
                  X("instanceof", "instanceof", 120),
                  X(
                    "+",
                    function (e, t) {
                      var n = O(130);
                      return e && n && e.id === "(string)" && n.id === "(string)"
                        ? ((e.value += n.value),
                          (e.character = n.character),
                          !f.option.scripturl && a.javascriptURL.test(e.value) && b("W050", e),
                          e)
                        : ((t.left = e), (t.right = n), t);
                    },
                    130
                  ),
                  q("+", "num"),
                  q("+++", function () {
                    return b("W007"), (this.right = O(150)), (this.arity = "unary"), this;
                  }),
                  X(
                    "+++",
                    function (e) {
                      return b("W007"), (this.left = e), (this.right = O(130)), this;
                    },
                    130
                  ),
                  X("-", "sub", 130),
                  q("-", "neg"),
                  q("---", function () {
                    return b("W006"), (this.right = O(150)), (this.arity = "unary"), this;
                  }),
                  X(
                    "---",
                    function (e) {
                      return b("W006"), (this.left = e), (this.right = O(130)), this;
                    },
                    130
                  ),
                  X("*", "mult", 140),
                  X("/", "div", 140),
                  X("%", "mod", 140),
                  et("++", "postinc"),
                  q("++", "preinc"),
                  (f.syntax["++"].exps = !0),
                  et("--", "postdec"),
                  q("--", "predec"),
                  (f.syntax["--"].exps = !0),
                  (q("delete", function () {
                    var e = O(10);
                    return (!e || (e.id !== "." && e.id !== "[")) && b("W051"), (this.first = e), this;
                  }).exps = !0),
                  q("~", function () {
                    return f.option.bitwise && b("W052", this, "~"), O(150), this;
                  }),
                  q("...", function () {
                    return (
                      f.option.inESNext() || b("W104", this, "spread/rest operator"),
                      f.tokens.next.identifier || E("E030", f.tokens.next, f.tokens.next.value),
                      O(150),
                      this
                    );
                  }),
                  q("!", function () {
                    return (
                      (this.right = O(150)),
                      (this.arity = "unary"),
                      this.right || m("E041", this.line || 0),
                      Lt[this.right.id] === !0 && b("W018", this, "!"),
                      this
                    );
                  }),
                  q("typeof", "typeof"),
                  q("new", function () {
                    var e = O(155),
                      t;
                    if (e && e.id !== "function")
                      if (e.identifier) {
                        e["new"] = !0;
                        switch (e.value) {
                          case "Number":
                          case "String":
                          case "Boolean":
                          case "Math":
                          case "JSON":
                            b("W053", f.tokens.prev, e.value);
                            break;
                          case "Function":
                            f.option.evil || b("W054");
                            break;
                          case "Date":
                          case "RegExp":
                          case "this":
                            break;
                          default:
                            e.id !== "function" &&
                              ((t = e.value.substr(0, 1)),
                              f.option.newcap &&
                                (t < "A" || t > "Z") &&
                                !r.has(It, e.value) &&
                                b("W055", f.tokens.curr));
                        }
                      } else e.id !== "." && e.id !== "[" && e.id !== "(" && b("W056", f.tokens.curr);
                    else f.option.supernew || b("W057", this);
                    return (
                      f.tokens.next.id !== "(" && !f.option.supernew && b("W058", f.tokens.curr, f.tokens.curr.value),
                      (this.first = e),
                      this
                    );
                  }),
                  (f.syntax["new"].exps = !0),
                  (q("void").exps = !0),
                  X(
                    ".",
                    function (e, t) {
                      var n = nt(!1, !0);
                      return (
                        typeof n == "string" && at(n),
                        (t.left = e),
                        (t.right = n),
                        n && n === "hasOwnProperty" && f.tokens.next.value === "=" && b("W001"),
                        !e || e.value !== "arguments" || (n !== "callee" && n !== "caller")
                          ? !f.option.evil &&
                            e &&
                            e.value === "document" &&
                            (n === "write" || n === "writeln") &&
                            b("W060", e)
                          : f.option.noarg
                          ? b("W059", e, n)
                          : f.directive["use strict"] && E("E008"),
                        !f.option.evil && (n === "eval" || n === "execScript") && b("W061"),
                        t
                      );
                    },
                    160,
                    !0
                  ),
                  (X(
                    "(",
                    function (e, t) {
                      f.option.immed && e && !e.immed && e.id === "function" && b("W062");
                      var n = 0,
                        r = [];
                      e &&
                        e.type === "(identifier)" &&
                        e.value.match(/^[A-Z]([A-Z0-9_$]*[a-z][A-Za-z0-9_$]*)?$/) &&
                        "Number String Boolean Date Object Error".indexOf(e.value) === -1 &&
                        (e.value === "Math" ? b("W063", e) : f.option.newcap && b("W064", e));
                      if (f.tokens.next.id !== ")")
                        for (;;) {
                          (r[r.length] = O(10)), (n += 1);
                          if (f.tokens.next.id !== ",") break;
                          P();
                        }
                      return (
                        k(")"),
                        typeof e == "object" &&
                          (f.option.inES3() && e.value === "parseInt" && n === 1 && b("W065", f.tokens.curr),
                          f.option.evil ||
                            (e.value === "eval" || e.value === "Function" || e.value === "execScript"
                              ? (b("W061", e), r[0] && [0].id === "(string)" && x(e, r[0].value))
                              : !r[0] ||
                                r[0].id !== "(string)" ||
                                (e.value !== "setTimeout" && e.value !== "setInterval")
                              ? r[0] &&
                                r[0].id === "(string)" &&
                                e.value === "." &&
                                e.left.value === "window" &&
                                (e.right === "setTimeout" || e.right === "setInterval") &&
                                (b("W066", e), x(e, r[0].value))
                              : (b("W066", e), x(e, r[0].value))),
                          !e.identifier &&
                            e.id !== "." &&
                            e.id !== "[" &&
                            e.id !== "(" &&
                            e.id !== "&&" &&
                            e.id !== "||" &&
                            e.id !== "?" &&
                            b("W067", e)),
                        (t.left = e),
                        t
                      );
                    },
                    155,
                    !0
                  ).exps = !0),
                  q("(", function () {
                    var e,
                      t = [],
                      n,
                      i,
                      s = 0,
                      o,
                      u = 1;
                    do (n = C(s)), n.value === "(" ? (u += 1) : n.value === ")" && (u -= 1), (s += 1), (i = C(s));
                    while ((u !== 0 || n.value !== ")") && i.value !== "=>" && i.value !== ";" && i.type !== "(end)");
                    f.tokens.next.id === "function" && (f.tokens.next.immed = !0);
                    var a = [];
                    if (f.tokens.next.id !== ")")
                      for (;;) {
                        if (i.value === "=>" && r.contains(["{", "["], f.tokens.next.value)) {
                          (e = f.tokens.next), (e.left = wt()), t.push(e);
                          for (var l in e.left) a.push(e.left[l].token);
                        } else a.push(O(10));
                        if (f.tokens.next.id !== ",") break;
                        P();
                      }
                    k(")", this),
                      f.option.immed &&
                        a[0] &&
                        a[0].id === "function" &&
                        f.tokens.next.id !== "(" &&
                        (f.tokens.next.id !== "." || (C().value !== "call" && C().value !== "apply")) &&
                        b("W068", this);
                    if (f.tokens.next.value === "=>") return a;
                    if (!a.length) return;
                    return (
                      a.length > 1 ? ((o = Object.create(f.syntax[","])), (o.exprs = a)) : (o = a[0]),
                      o && (o.paren = !0),
                      o
                    );
                  }),
                  V("=>"),
                  X(
                    "[",
                    function (e, t) {
                      var n = O(10),
                        r;
                      return (
                        n &&
                          n.type === "(string)" &&
                          (!f.option.evil && (n.value === "eval" || n.value === "execScript") && b("W061", t),
                          at(n.value),
                          !f.option.sub &&
                            a.identifier.test(n.value) &&
                            ((r = f.syntax[n.value]), (!r || !h(r)) && b("W069", f.tokens.prev, n.value))),
                        k("]", t),
                        n && n.value === "hasOwnProperty" && f.tokens.next.value === "=" && b("W001"),
                        (t.left = e),
                        (t.right = n),
                        t
                      );
                    },
                    160,
                    !0
                  ),
                  q(
                    "[",
                    function () {
                      var e = on(!0);
                      if (e.isCompArray)
                        return f.option.inESNext() || b("W119", f.tokens.curr, "array comprehension"), lt();
                      e.isDestAssign && !f.option.inESNext() && b("W104", f.tokens.curr, "destructuring assignment");
                      var t = f.tokens.curr.line !== f.tokens.next.line;
                      (this.first = []),
                        t &&
                          ((Ut += f.option.indent),
                          f.tokens.next.from === Ut + f.option.indent && (Ut += f.option.indent));
                      while (f.tokens.next.id !== "(end)") {
                        while (f.tokens.next.id === ",") f.option.inES5() || b("W070"), k(",");
                        if (f.tokens.next.id === "]") break;
                        this.first.push(O(10));
                        if (f.tokens.next.id !== ",") break;
                        P({ allowTrailing: !0 });
                        if (f.tokens.next.id === "]" && !f.option.inES5(!0)) {
                          b("W070", f.tokens.curr);
                          break;
                        }
                      }
                      return t && (Ut -= f.option.indent), k("]", this), this;
                    },
                    160
                  ),
                  (function (e) {
                    (e.nud = function (e) {
                      function t(e, t) {
                        h[e] && r.has(h, e) ? b("W075", f.tokens.next, u) : (h[e] = {}),
                          (h[e].basic = !0),
                          (h[e].basictkn = t);
                      }
                      function n(e, t) {
                        h[e] && r.has(h, e) ? (h[e].basic || h[e].setter) && b("W075", f.tokens.next, u) : (h[e] = {}),
                          (h[e].setter = !0),
                          (h[e].setterToken = t);
                      }
                      function i(e) {
                        h[e] && r.has(h, e) ? (h[e].basic || h[e].getter) && b("W075", f.tokens.next, u) : (h[e] = {}),
                          (h[e].getter = !0),
                          (h[e].getterToken = f.tokens.curr);
                      }
                      var s,
                        o,
                        u,
                        a,
                        l,
                        c,
                        h = {},
                        p = "";
                      (s = f.tokens.curr.line !== f.tokens.next.line),
                        s &&
                          ((Ut += f.option.indent),
                          f.tokens.next.from === Ut + f.option.indent && (Ut += f.option.indent));
                      for (;;) {
                        if (f.tokens.next.id === "}") break;
                        e && f.tokens.next.value === "static" && (k("static"), (p = "static "));
                        if (f.tokens.next.value === "get" && C().id !== ":")
                          k("get"),
                            f.option.inES5(!e) || E("E034"),
                            (u = ct()),
                            !u && !f.option.inESNext() && E("E035"),
                            e && u === "constructor" && E("E049", f.tokens.next, "class getter method", u),
                            u && i(p + u),
                            (l = f.tokens.next),
                            (o = mt()),
                            (a = o["(params)"]),
                            u && a && b("W076", l, a[0], u);
                        else if (f.tokens.next.value === "set" && C().id !== ":")
                          k("set"),
                            f.option.inES5(!e) || E("E034"),
                            (u = ct()),
                            !u && !f.option.inESNext() && E("E035"),
                            e && u === "constructor" && E("E049", f.tokens.next, "class setter method", u),
                            u && n(p + u, f.tokens.next),
                            (l = f.tokens.next),
                            (o = mt()),
                            (a = o["(params)"]),
                            u && (!a || a.length !== 1) && b("W077", l, u);
                        else {
                          (c = !1),
                            f.tokens.next.value === "*" &&
                              f.tokens.next.type === "(punctuator)" &&
                              (f.option.inESNext() || b("W104", f.tokens.next, "generator functions"),
                              k("*"),
                              (c = !0)),
                            (u = ct()),
                            t(p + u, f.tokens.next);
                          if (typeof u != "string") break;
                          f.tokens.next.value === "("
                            ? (f.option.inESNext() || b("W104", f.tokens.curr, "concise methods"), mt(u, undefined, c))
                            : e || (k(":"), O(10));
                        }
                        e && u === "prototype" && E("E049", f.tokens.next, "class method", u), at(u);
                        if (e) {
                          p = "";
                          continue;
                        }
                        if (f.tokens.next.id !== ",") break;
                        P({ allowTrailing: !0, property: !0 }),
                          f.tokens.next.id === ","
                            ? b("W070", f.tokens.curr)
                            : f.tokens.next.id === "}" && !f.option.inES5(!0) && b("W070", f.tokens.curr);
                      }
                      s && (Ut -= f.option.indent), k("}", this);
                      if (f.option.inES5())
                        for (var d in h) r.has(h, d) && h[d].setter && !h[d].getter && b("W078", h[d].setterToken);
                      return this;
                    }),
                      (e.fud = function () {
                        E("E036", f.tokens.curr);
                      });
                  })(B("{"));
                var nn = j("const", function (e) {
                  var t, n, i;
                  f.option.inESNext() || b("W104", f.tokens.curr, "const"), (this.first = []);
                  for (;;) {
                    var s = [];
                    r.contains(["{", "["], f.tokens.next.value)
                      ? ((t = wt()), (i = !1))
                      : ((t = [{ id: nt(), token: f.tokens.curr }]), (i = !0));
                    for (var o in t)
                      t.hasOwnProperty(o) &&
                        ((o = t[o]),
                        jt[o.id] === "const" && b("E011", null, o.id),
                        jt["(global)"] && Jt[o.id] === !1 && b("W079", o.token, o.id),
                        o.id && (T(o.id, { token: o.token, type: "const", unused: !0 }), s.push(o.token)));
                    if (e) break;
                    (this.first = this.first.concat(s)),
                      f.tokens.next.id !== "=" && b("E012", f.tokens.curr, f.tokens.curr.value),
                      f.tokens.next.id === "=" &&
                        (k("="),
                        f.tokens.next.id === "undefined" && b("W080", f.tokens.prev, f.tokens.prev.value),
                        C(0).id === "=" && f.tokens.next.identifier && b("W120", f.tokens.next, f.tokens.next.value),
                        (n = O(10)),
                        i ? (t[0].first = n) : Et(s, n));
                    if (f.tokens.next.id !== ",") break;
                    P();
                  }
                  return this;
                });
                nn.exps = !0;
                var rn = j("var", function (e) {
                  var t, n, i;
                  this.first = [];
                  for (;;) {
                    var s = [];
                    r.contains(["{", "["], f.tokens.next.value)
                      ? ((t = wt()), (n = !1))
                      : ((t = [{ id: nt(), token: f.tokens.curr }]), (n = !0));
                    for (var o in t)
                      t.hasOwnProperty(o) &&
                        ((o = t[o]),
                        f.option.inESNext() && jt[o.id] === "const" && b("E011", null, o.id),
                        jt["(global)"] && Jt[o.id] === !1 && b("W079", o.token, o.id),
                        o.id && (T(o.id, { type: "unused", token: o.token }), s.push(o.token)));
                    if (e) break;
                    (this.first = this.first.concat(s)),
                      f.tokens.next.id === "=" &&
                        (k("="),
                        f.tokens.next.id === "undefined" && b("W080", f.tokens.prev, f.tokens.prev.value),
                        C(0).id === "=" && f.tokens.next.identifier && b("W120", f.tokens.next, f.tokens.next.value),
                        (i = O(10)),
                        n ? (t[0].first = i) : Et(s, i));
                    if (f.tokens.next.id !== ",") break;
                    P();
                  }
                  return this;
                });
                rn.exps = !0;
                var sn = j("let", function (e) {
                  var t, n, i, s;
                  f.option.inESNext() || b("W104", f.tokens.curr, "let"),
                    f.tokens.next.value === "("
                      ? (f.option.inMoz(!0) || b("W118", f.tokens.next, "let block"),
                        k("("),
                        jt["(blockscope)"].stack(),
                        (s = !0))
                      : jt["(nolet)"] && E("E048", f.tokens.curr),
                    (this.first = []);
                  for (;;) {
                    var o = [];
                    r.contains(["{", "["], f.tokens.next.value)
                      ? ((t = wt()), (n = !1))
                      : ((t = [{ id: nt(), token: f.tokens.curr.value }]), (n = !0));
                    for (var u in t)
                      t.hasOwnProperty(u) &&
                        ((u = t[u]),
                        f.option.inESNext() && jt[u.id] === "const" && b("E011", null, u.id),
                        jt["(global)"] && Jt[u.id] === !1 && b("W079", u.token, u.id),
                        u.id &&
                          !jt["(nolet)"] &&
                          (T(u.id, { type: "unused", token: u.token, islet: !0 }), o.push(u.token)));
                    if (e) break;
                    (this.first = this.first.concat(o)),
                      f.tokens.next.id === "=" &&
                        (k("="),
                        f.tokens.next.id === "undefined" && b("W080", f.tokens.prev, f.tokens.prev.value),
                        C(0).id === "=" && f.tokens.next.identifier && b("W120", f.tokens.next, f.tokens.next.value),
                        (i = O(10)),
                        n ? (t[0].first = i) : Et(o, i));
                    if (f.tokens.next.id !== ",") break;
                    P();
                  }
                  return s && (k(")"), ut(!0, !0), (this.block = !0), jt["(blockscope)"].unstack()), this;
                });
                (sn.exps = !0),
                  F("class", function () {
                    return St.call(this, !0);
                  }),
                  F("function", function () {
                    var e = !1;
                    f.tokens.next.value === "*" &&
                      (k("*"), f.option.inESNext(!0) ? (e = !0) : b("W119", f.tokens.curr, "function*")),
                      Rt && b("W082", f.tokens.curr);
                    var t = nt();
                    return (
                      jt[t] === "const" && b("E011", null, t),
                      T(t, { type: "unction", token: f.tokens.curr }),
                      mt(t, { statement: !0 }, e),
                      f.tokens.next.id === "(" && f.tokens.next.line === f.tokens.curr.line && E("E039"),
                      this
                    );
                  }),
                  q("function", function () {
                    var e = !1;
                    f.tokens.next.value === "*" &&
                      (f.option.inESNext() || b("W119", f.tokens.curr, "function*"), k("*"), (e = !0));
                    var t = tt();
                    return mt(t, undefined, e), !f.option.loopfunc && jt["(loopage)"] && b("W083"), this;
                  }),
                  F("if", function () {
                    var e = f.tokens.next;
                    return (
                      yt(),
                      (f.condition = !0),
                      k("("),
                      bt(O(0)),
                      k(")", e),
                      (f.condition = !1),
                      ut(!0, !0),
                      f.tokens.next.id === "else" &&
                        (k("else"), f.tokens.next.id === "if" || f.tokens.next.id === "switch" ? it(!0) : ut(!0, !0)),
                      this
                    );
                  }),
                  F("try", function () {
                    function e() {
                      var e = Kt,
                        t;
                      k("catch"),
                        k("("),
                        (Kt = Object.create(e)),
                        (t = f.tokens.next.value),
                        f.tokens.next.type !== "(identifier)" && ((t = null), b("E030", f.tokens.next, t)),
                        k(),
                        (jt = vt("(catch)", f.tokens.next, Kt, {
                          "(context)": jt,
                          "(breakage)": jt["(breakage)"],
                          "(loopage)": jt["(loopage)"],
                          "(statement)": !1,
                          "(catch)": !0,
                        })),
                        t && T(t, { type: "exception" }),
                        f.tokens.next.value === "if" &&
                          (f.option.inMoz(!0) || b("W118", f.tokens.curr, "catch filter"), k("if"), O(0)),
                        k(")"),
                        (f.tokens.curr.funct = jt),
                        Ft.push(jt),
                        ut(!1),
                        (Kt = e),
                        (jt["(last)"] = f.tokens.curr.line),
                        (jt["(lastcharacter)"] = f.tokens.curr.character),
                        (jt = jt["(context)"]);
                    }
                    var t;
                    ut(!0);
                    while (f.tokens.next.id === "catch")
                      yt(),
                        t && !f.option.inMoz(!0) && b("W118", f.tokens.next, "multiple catch blocks"),
                        e(),
                        (t = !0);
                    if (f.tokens.next.id === "finally") {
                      k("finally"), ut(!0);
                      return;
                    }
                    return t || E("E021", f.tokens.next, "catch", f.tokens.next.value), this;
                  }),
                  (F("while", function () {
                    var e = f.tokens.next;
                    return (
                      (jt["(breakage)"] += 1),
                      (jt["(loopage)"] += 1),
                      yt(),
                      k("("),
                      bt(O(0)),
                      k(")", e),
                      ut(!0, !0),
                      (jt["(breakage)"] -= 1),
                      (jt["(loopage)"] -= 1),
                      this
                    );
                  }).labelled = !0),
                  F("with", function () {
                    var e = f.tokens.next;
                    return (
                      f.directive["use strict"]
                        ? E("E010", f.tokens.curr)
                        : f.option.withstmt || b("W085", f.tokens.curr),
                      k("("),
                      O(0),
                      k(")", e),
                      ut(!0, !0),
                      this
                    );
                  }),
                  (F("switch", function () {
                    var e = f.tokens.next,
                      t = !1,
                      n = !1;
                    (jt["(breakage)"] += 1),
                      k("("),
                      bt(O(0)),
                      k(")", e),
                      (e = f.tokens.next),
                      k("{"),
                      f.tokens.next.from === Ut && (n = !0),
                      n || (Ut += f.option.indent),
                      (this.cases = []);
                    for (;;)
                      switch (f.tokens.next.id) {
                        case "case":
                          switch (jt["(verb)"]) {
                            case "yield":
                            case "break":
                            case "case":
                            case "continue":
                            case "return":
                            case "switch":
                            case "throw":
                              break;
                            default:
                              a.fallsThrough.test(f.lines[f.tokens.next.line - 2]) || b("W086", f.tokens.curr, "case");
                          }
                          k("case"), this.cases.push(O(0)), yt(), (t = !0), k(":"), (jt["(verb)"] = "case");
                          break;
                        case "default":
                          switch (jt["(verb)"]) {
                            case "yield":
                            case "break":
                            case "continue":
                            case "return":
                            case "throw":
                              break;
                            default:
                              this.cases.length &&
                                (a.fallsThrough.test(f.lines[f.tokens.next.line - 2]) ||
                                  b("W086", f.tokens.curr, "default"));
                          }
                          k("default"), (t = !0), k(":");
                          break;
                        case "}":
                          n || (Ut -= f.option.indent), k("}", e), (jt["(breakage)"] -= 1), (jt["(verb)"] = undefined);
                          return;
                        case "(end)":
                          E("E023", f.tokens.next, "}");
                          return;
                        default:
                          Ut += f.option.indent;
                          if (t)
                            switch (f.tokens.curr.id) {
                              case ",":
                                E("E040");
                                return;
                              case ":":
                                (t = !1), st();
                                break;
                              default:
                                E("E025", f.tokens.curr);
                                return;
                            }
                          else {
                            if (f.tokens.curr.id !== ":") {
                              E("E021", f.tokens.next, "case", f.tokens.next.value);
                              return;
                            }
                            k(":"), E("E024", f.tokens.curr, ":"), st();
                          }
                          Ut -= f.option.indent;
                      }
                  }).labelled = !0),
                  (j("debugger", function () {
                    return f.option.debug || b("W087", this), this;
                  }).exps = !0),
                  (function () {
                    var e = j("do", function () {
                      (jt["(breakage)"] += 1), (jt["(loopage)"] += 1), yt(), (this.first = ut(!0, !0)), k("while");
                      var e = f.tokens.next;
                      return k("("), bt(O(0)), k(")", e), (jt["(breakage)"] -= 1), (jt["(loopage)"] -= 1), this;
                    });
                    (e.labelled = !0), (e.exps = !0);
                  })(),
                  (F("for", function () {
                    var e,
                      t = f.tokens.next,
                      n = !1,
                      i = null;
                    t.value === "each" &&
                      ((i = t), k("each"), f.option.inMoz(!0) || b("W118", f.tokens.curr, "for each")),
                      (jt["(breakage)"] += 1),
                      (jt["(loopage)"] += 1),
                      yt(),
                      k("(");
                    var s,
                      o = 0,
                      u = ["in", "of"];
                    do (s = C(o)), ++o;
                    while (!r.contains(u, s.value) && s.value !== ";" && s.type !== "(end)");
                    if (r.contains(u, s.value)) {
                      !f.option.inESNext() && s.value === "of" && E("W104", s, "for of");
                      if (f.tokens.next.id === "var") k("var"), f.syntax["var"].fud.call(f.syntax["var"].fud, !0);
                      else if (f.tokens.next.id === "let")
                        k("let"), (n = !0), jt["(blockscope)"].stack(), f.syntax.let.fud.call(f.syntax.let.fud, !0);
                      else if (!f.tokens.next.identifier) E("E030", f.tokens.next, f.tokens.next.type), k();
                      else {
                        switch (jt[f.tokens.next.value]) {
                          case "unused":
                            jt[f.tokens.next.value] = "var";
                            break;
                          case "var":
                            break;
                          default:
                            jt["(blockscope)"].getlabel(f.tokens.next.value) ||
                              b("W088", f.tokens.next, f.tokens.next.value);
                        }
                        k();
                      }
                      k(s.value),
                        O(20),
                        k(")", t),
                        (e = ut(!0, !0)),
                        f.option.forin &&
                          e &&
                          (e.length > 1 || typeof e[0] != "object" || e[0].value !== "if") &&
                          b("W089", this),
                        (jt["(breakage)"] -= 1),
                        (jt["(loopage)"] -= 1);
                    } else {
                      i && E("E045", i);
                      if (f.tokens.next.id !== ";")
                        if (f.tokens.next.id === "var") k("var"), f.syntax["var"].fud.call(f.syntax["var"].fud);
                        else if (f.tokens.next.id === "let")
                          k("let"), (n = !0), jt["(blockscope)"].stack(), f.syntax.let.fud.call(f.syntax.let.fud);
                        else
                          for (;;) {
                            O(0, "for");
                            if (f.tokens.next.id !== ",") break;
                            P();
                          }
                      _(f.tokens.curr),
                        k(";"),
                        f.tokens.next.id !== ";" && bt(O(0)),
                        _(f.tokens.curr),
                        k(";"),
                        f.tokens.next.id === ";" && E("E021", f.tokens.next, ")", ";");
                      if (f.tokens.next.id !== ")")
                        for (;;) {
                          O(0, "for");
                          if (f.tokens.next.id !== ",") break;
                          P();
                        }
                      k(")", t), ut(!0, !0), (jt["(breakage)"] -= 1), (jt["(loopage)"] -= 1);
                    }
                    return n && jt["(blockscope)"].unstack(), this;
                  }).labelled = !0),
                  (j("break", function () {
                    var e = f.tokens.next.value;
                    return (
                      jt["(breakage)"] === 0 && b("W052", f.tokens.next, this.value),
                      f.option.asi || _(this),
                      f.tokens.next.id !== ";" &&
                        !f.tokens.next.reach &&
                        f.tokens.curr.line === f.tokens.next.line &&
                        (jt[e] !== "label" ? b("W090", f.tokens.next, e) : Kt[e] !== jt && b("W091", f.tokens.next, e),
                        (this.first = f.tokens.next),
                        k()),
                      rt("break"),
                      this
                    );
                  }).exps = !0),
                  (j("continue", function () {
                    var e = f.tokens.next.value;
                    return (
                      jt["(breakage)"] === 0 && b("W052", f.tokens.next, this.value),
                      f.option.asi || _(this),
                      f.tokens.next.id !== ";" && !f.tokens.next.reach
                        ? f.tokens.curr.line === f.tokens.next.line &&
                          (jt[e] !== "label"
                            ? b("W090", f.tokens.next, e)
                            : Kt[e] !== jt && b("W091", f.tokens.next, e),
                          (this.first = f.tokens.next),
                          k())
                        : jt["(loopage)"] || b("W052", f.tokens.next, this.value),
                      rt("continue"),
                      this
                    );
                  }).exps = !0),
                  (j("return", function () {
                    return (
                      this.line === f.tokens.next.line
                        ? f.tokens.next.id !== ";" &&
                          !f.tokens.next.reach &&
                          ((this.first = O(0)),
                          this.first &&
                            this.first.type === "(punctuator)" &&
                            this.first.value === "=" &&
                            !this.first.paren &&
                            !f.option.boss &&
                            w("W093", this.first.line, this.first.character))
                        : f.tokens.next.type === "(punctuator)" &&
                          ["[", "{", "+", "-"].indexOf(f.tokens.next.value) > -1 &&
                          _(this),
                      rt("return"),
                      this
                    );
                  }).exps = !0),
                  (function (e) {
                    (e.exps = !0), (e.lbp = 25);
                  })(
                    q("yield", function () {
                      var e = f.tokens.prev;
                      return (
                        f.option.inESNext(!0) && !jt["(generator)"]
                          ? ("(catch)" !== jt["(name)"] || !jt["(context)"]["(generator)"]) &&
                            E("E046", f.tokens.curr, "yield")
                          : f.option.inESNext() || b("W104", f.tokens.curr, "yield"),
                        (jt["(generator)"] = "yielded"),
                        this.line === f.tokens.next.line || !f.option.inMoz(!0)
                          ? (f.tokens.next.id !== ";" &&
                              !f.tokens.next.reach &&
                              f.tokens.next.nud &&
                              (M(f.tokens.curr, f.tokens.next),
                              (this.first = O(10)),
                              this.first.type === "(punctuator)" &&
                                this.first.value === "=" &&
                                !this.first.paren &&
                                !f.option.boss &&
                                w("W093", this.first.line, this.first.character)),
                            f.option.inMoz(!0) &&
                              f.tokens.next.id !== ")" &&
                              (e.lbp > 30 || (!e.assign && !A()) || e.id === "yield") &&
                              E("E050", this))
                          : f.option.asi || _(this),
                        this
                      );
                    })
                  ),
                  (j("throw", function () {
                    return _(this), (this.first = O(20)), rt("throw"), this;
                  }).exps = !0),
                  (j("import", function () {
                    f.option.inESNext() || b("W119", f.tokens.curr, "import");
                    if (f.tokens.next.type === "(string)") return k("(string)"), this;
                    if (f.tokens.next.identifier)
                      (this.name = nt()), T(this.name, { type: "unused", token: f.tokens.curr });
                    else {
                      k("{");
                      for (;;) {
                        if (f.tokens.next.value === "}") {
                          k("}");
                          break;
                        }
                        var e;
                        f.tokens.next.type === "default" ? ((e = "default"), k("default")) : (e = nt()),
                          f.tokens.next.value === "as" && (k("as"), (e = nt())),
                          T(e, { type: "unused", token: f.tokens.curr });
                        if (f.tokens.next.value !== ",") {
                          if (f.tokens.next.value === "}") {
                            k("}");
                            break;
                          }
                          E("E024", f.tokens.next, f.tokens.next.value);
                          break;
                        }
                        k(",");
                      }
                    }
                    return k("from"), k("(string)"), this;
                  }).exps = !0),
                  (j("export", function () {
                    f.option.inESNext() || b("W119", f.tokens.curr, "export");
                    if (f.tokens.next.type === "default") {
                      k("default");
                      if (f.tokens.next.id === "function" || f.tokens.next.id === "class") this.block = !0;
                      return (this.exportee = O(10)), this;
                    }
                    if (f.tokens.next.value === "{") {
                      k("{");
                      for (;;) {
                        Ht[nt()] = !0;
                        if (f.tokens.next.value !== ",") {
                          if (f.tokens.next.value === "}") {
                            k("}");
                            break;
                          }
                          E("E024", f.tokens.next, f.tokens.next.value);
                          break;
                        }
                        k(",");
                      }
                      return this;
                    }
                    return (
                      f.tokens.next.id === "var"
                        ? (k("var"), (Ht[f.tokens.next.value] = !0), f.syntax["var"].fud.call(f.syntax["var"].fud))
                        : f.tokens.next.id === "let"
                        ? (k("let"), (Ht[f.tokens.next.value] = !0), f.syntax.let.fud.call(f.syntax.let.fud))
                        : f.tokens.next.id === "const"
                        ? (k("const"),
                          (Ht[f.tokens.next.value] = !0),
                          f.syntax["const"].fud.call(f.syntax["const"].fud))
                        : f.tokens.next.id === "function"
                        ? ((this.block = !0), k("function"), (Ht[f.tokens.next.value] = !0), f.syntax["function"].fud())
                        : f.tokens.next.id === "class"
                        ? ((this.block = !0), k("class"), (Ht[f.tokens.next.value] = !0), f.syntax["class"].fud())
                        : E("E024", f.tokens.next, f.tokens.next.value),
                      this
                    );
                  }).exps = !0),
                  z("abstract"),
                  z("boolean"),
                  z("byte"),
                  z("char"),
                  z("class", { es5: !0, nud: St }),
                  z("double"),
                  z("enum", { es5: !0 }),
                  z("export", { es5: !0 }),
                  z("extends", { es5: !0 }),
                  z("final"),
                  z("float"),
                  z("goto"),
                  z("implements", { es5: !0, strictOnly: !0 }),
                  z("import", { es5: !0 }),
                  z("int"),
                  z("interface", { es5: !0, strictOnly: !0 }),
                  z("long"),
                  z("native"),
                  z("package", { es5: !0, strictOnly: !0 }),
                  z("private", { es5: !0, strictOnly: !0 }),
                  z("protected", { es5: !0, strictOnly: !0 }),
                  z("public", { es5: !0, strictOnly: !0 }),
                  z("short"),
                  z("static", { es5: !0, strictOnly: !0 }),
                  z("super", { es5: !0 }),
                  z("synchronized"),
                  z("throws"),
                  z("transient"),
                  z("volatile");
                var on = function () {
                    var e,
                      t,
                      n = -1,
                      i = 0,
                      s = {};
                    r.contains(["[", "{"], f.tokens.curr.value) && (i += 1);
                    do {
                      (e = n === -1 ? f.tokens.next : C(n)),
                        (t = C(n + 1)),
                        (n += 1),
                        r.contains(["[", "{"], e.value) ? (i += 1) : r.contains(["]", "}"], e.value) && (i -= 1);
                      if (e.identifier && e.value === "for" && i === 1) {
                        (s.isCompArray = !0), (s.notJson = !0);
                        break;
                      }
                      if (r.contains(["}", "]"], e.value) && t.value === "=" && i === 0) {
                        (s.isDestAssign = !0), (s.notJson = !0);
                        break;
                      }
                      e.value === ";" && ((s.isBlock = !0), (s.notJson = !0));
                    } while (i > 0 && e.id !== "(end)" && n < 15);
                    return s;
                  },
                  un = function () {
                    function e(e) {
                      var t = s.variables.filter(function (t) {
                        if (t.value === e) return (t.undef = !1), e;
                      }).length;
                      return t !== 0;
                    }
                    function t(e) {
                      var t = s.variables.filter(function (t) {
                        if (t.value === e && !t.undef) return t.unused === !0 && (t.unused = !1), e;
                      }).length;
                      return t === 0;
                    }
                    var n = function () {
                        (this.mode = "use"), (this.variables = []);
                      },
                      i = [],
                      s;
                    return {
                      stack: function () {
                        (s = new n()), i.push(s);
                      },
                      unstack: function () {
                        s.variables.filter(function (e) {
                          e.unused && b("W098", e.token, e.value), e.undef && g(e.funct, "W117", e.token, e.value);
                        }),
                          i.splice(-1, 1),
                          (s = i[i.length - 1]);
                      },
                      setState: function (e) {
                        r.contains(["use", "define", "generate", "filter"], e) && (s.mode = e);
                      },
                      check: function (n) {
                        if (!s) return;
                        return s && s.mode === "use"
                          ? (t(n) &&
                              s.variables.push({ funct: jt, token: f.tokens.curr, value: n, undef: !0, unused: !1 }),
                            !0)
                          : s && s.mode === "define"
                          ? (e(n) ||
                              s.variables.push({ funct: jt, token: f.tokens.curr, value: n, undef: !1, unused: !0 }),
                            !0)
                          : s && s.mode === "generate"
                          ? (g(jt, "W117", f.tokens.curr, n), !0)
                          : s && s.mode === "filter"
                          ? (t(n) && g(jt, "W117", f.tokens.curr, n), !0)
                          : !1;
                      },
                    };
                  },
                  an = function () {
                    function e() {
                      for (var e in t)
                        if (t[e]["(type)"] === "unused" && f.option.unused) {
                          var n = t[e]["(token)"],
                            r = n.line,
                            i = n.character;
                          w("W098", r, i, e);
                        }
                    }
                    var t = {},
                      n = [t];
                    return {
                      stack: function () {
                        (t = {}), n.push(t);
                      },
                      unstack: function () {
                        e(), n.splice(n.length - 1, 1), (t = r.last(n));
                      },
                      getlabel: function (e) {
                        for (var t = n.length - 1; t >= 0; --t)
                          if (r.has(n[t], e) && !n[t][e]["(shadowed)"]) return n[t];
                      },
                      shadow: function (e) {
                        for (var t = n.length - 1; t >= 0; t--) r.has(n[t], e) && (n[t][e]["(shadowed)"] = !0);
                      },
                      unshadow: function (e) {
                        for (var t = n.length - 1; t >= 0; t--) r.has(n[t], e) && (n[t][e]["(shadowed)"] = !1);
                      },
                      current: {
                        has: function (e) {
                          return r.has(t, e);
                        },
                        add: function (e, n, r) {
                          t[e] = { "(type)": n, "(token)": r, "(shadowed)": !1 };
                        },
                      },
                    };
                  },
                  fn = function (n, i, o) {
                    function a(e, t) {
                      if (!e) return;
                      !Array.isArray(e) && typeof e == "object" && (e = Object.keys(e)), e.forEach(t);
                    }
                    var l,
                      h,
                      p,
                      g,
                      y = {},
                      E = {};
                    (i = r.clone(i)),
                      f.reset(),
                      i && i.scope
                        ? (c.scope = i.scope)
                        : ((c.errors = []),
                          (c.undefs = []),
                          (c.internals = []),
                          (c.blacklist = {}),
                          (c.scope = "(main)")),
                      (Jt = Object.create(null)),
                      d(Jt, s.ecmaIdentifiers),
                      d(Jt, s.reservedVars),
                      d(Jt, o || {}),
                      (Pt = Object.create(null)),
                      (Ht = Object.create(null));
                    if (i) {
                      a(i.predef || null, function (e) {
                        var t, n;
                        e[0] === "-"
                          ? ((t = e.slice(1)), (c.blacklist[t] = t))
                          : ((n = Object.getOwnPropertyDescriptor(i.predef, e)), (Jt[e] = n ? n.value : !1));
                      }),
                        a(i.exported || null, function (e) {
                          Ht[e] = !0;
                        }),
                        delete i.predef,
                        delete i.exported,
                        (g = Object.keys(i));
                      for (p = 0; p < g.length; p++)
                        /^-W\d{3}$/g.test(g[p])
                          ? (E[g[p].slice(1)] = !0)
                          : ((y[g[p]] = i[g[p]]), g[p] === "newcap" && i[g[p]] === !1 && (y["(explicitNewcap)"] = !0));
                    }
                    (f.option = y),
                      (f.ignored = E),
                      (f.option.indent = f.option.indent || 4),
                      (f.option.maxerr = f.option.maxerr || 50),
                      (Ut = 1),
                      (It = Object.create(Jt)),
                      (Kt = It),
                      (jt = vt("(global)", null, Kt, {
                        "(global)": !0,
                        "(blockscope)": an(),
                        "(comparray)": un(),
                        "(metrics)": gt(f.tokens.next),
                      })),
                      (Ft = [jt]),
                      (Yt = []),
                      (Qt = null),
                      (Xt = {}),
                      (Vt = null),
                      (qt = {}),
                      (Rt = !1),
                      (zt = []),
                      (Gt = []);
                    if (!t(n) && !Array.isArray(n)) return S("E004", 0), !1;
                    (kt = {
                      get isJSON() {
                        return f.jsonMode;
                      },
                      getOption: function (e) {
                        return f.option[e] || null;
                      },
                      getCache: function (e) {
                        return f.cache[e];
                      },
                      setCache: function (e, t) {
                        f.cache[e] = t;
                      },
                      warn: function (e, t) {
                        w.apply(null, [e, t.line, t.char].concat(t.data));
                      },
                      on: function (e, t) {
                        e.split(" ").forEach(
                          function (e) {
                            en.on(e, t);
                          }.bind(this)
                        );
                      },
                    }),
                      en.removeAllListeners(),
                      (Zt || []).forEach(function (e) {
                        e(kt);
                      }),
                      (f.tokens.prev = f.tokens.curr = f.tokens.next = f.syntax["(begin)"]),
                      (Wt = new u(n)),
                      Wt.on("warning", function (e) {
                        w.apply(null, [e.code, e.line, e.character].concat(e.data));
                      }),
                      Wt.on("error", function (e) {
                        S.apply(null, [e.code, e.line, e.character].concat(e.data));
                      }),
                      Wt.on("fatal", function (e) {
                        m("E041", e.line, e.from);
                      }),
                      Wt.on("Identifier", function (e) {
                        en.emit("Identifier", e);
                      }),
                      Wt.on("String", function (e) {
                        en.emit("String", e);
                      }),
                      Wt.on("Number", function (e) {
                        en.emit("Number", e);
                      }),
                      Wt.start();
                    for (var x in i) r.has(i, x) && e(x, f.tokens.curr);
                    v(), d(Jt, o || {}), (P.first = !0);
                    try {
                      k();
                      switch (f.tokens.next.id) {
                        case "{":
                        case "[":
                          Tt();
                          break;
                        default:
                          ot(),
                            f.directive["use strict"] &&
                              !f.option.globalstrict &&
                              !f.option.node &&
                              !f.option.phantom &&
                              b("W097", f.tokens.prev),
                            st();
                      }
                      k(f.tokens.next && f.tokens.next.value !== "." ? "(end)" : undefined),
                        jt["(blockscope)"].unstack();
                      var T = function (e, t) {
                          do {
                            if (typeof t[e] == "string")
                              return t[e] === "unused" ? (t[e] = "var") : t[e] === "unction" && (t[e] = "closure"), !0;
                            t = t["(context)"];
                          } while (t);
                          return !1;
                        },
                        N = function (e, t) {
                          if (!qt[e]) return;
                          var n = [];
                          for (var r = 0; r < qt[e].length; r += 1) qt[e][r] !== t && n.push(qt[e][r]);
                          n.length === 0 ? delete qt[e] : (qt[e] = n);
                        },
                        C = function (e, t, n, r) {
                          var i = t.line,
                            s = t.character;
                          r === undefined && (r = f.option.unused), r === !0 && (r = "last-param");
                          var o = {
                            vars: ["var"],
                            "last-param": ["var", "param"],
                            strict: ["var", "param", "last-param"],
                          };
                          r && o[r] && o[r].indexOf(n) !== -1 && w("W098", i, s, e),
                            Gt.push({ name: e, line: i, character: s });
                        },
                        L = function (e, t) {
                          var n = e[t],
                            i = e["(tokens)"][t];
                          if (t.charAt(0) === "(") return;
                          if (n !== "unused" && n !== "unction" && n !== "const") return;
                          if (e["(params)"] && e["(params)"].indexOf(t) !== -1) return;
                          if (e["(global)"] && r.has(Ht, t)) return;
                          if (n === "const" && !dt(e, t, "unused")) return;
                          C(t, i, "var");
                        };
                      for (l = 0; l < c.undefs.length; l += 1)
                        (h = c.undefs[l].slice(0)),
                          T(h[2].value, h[0]) ? N(h[2].value, h[2].line) : f.option.undef && b.apply(b, h.slice(1));
                      Ft.forEach(function (e) {
                        if (e["(unusedOption)"] === !1) return;
                        for (var t in e) r.has(e, t) && L(e, t);
                        if (!e["(params)"]) return;
                        var n = e["(params)"].slice(),
                          i = n.pop(),
                          s,
                          o;
                        while (i) {
                          (s = e[i]), (o = e["(unusedOption)"] || f.option.unused), (o = o === !0 ? "last-param" : o);
                          if (i === "undefined") return;
                          if (s === "unused" || s === "unction") C(i, e["(tokens)"][i], "param", e["(unusedOption)"]);
                          else if (o === "last-param") return;
                          i = n.pop();
                        }
                      });
                      for (var A in Pt) r.has(Pt, A) && !r.has(It, A) && !r.has(Ht, A) && C(A, Pt[A], "var");
                    } catch (O) {
                      if (!O || O.name !== "JSHintError") throw O;
                      var M = f.tokens.next || {};
                      c.errors.push(
                        {
                          scope: "(main)",
                          raw: O.raw,
                          code: O.code,
                          reason: O.message,
                          line: O.line || M.line,
                          character: O.character || M.from,
                        },
                        null
                      );
                    }
                    if (c.scope === "(main)") {
                      i = i || {};
                      for (l = 0; l < c.internals.length; l += 1)
                        (h = c.internals[l]), (i.scope = h.elem), fn(h.value, i, o);
                    }
                    return c.errors.length === 0;
                  };
                return (
                  (fn.addModule = function (e) {
                    Zt.push(e);
                  }),
                  fn.addModule(l.register),
                  (fn.data = function () {
                    var e = { functions: [], options: f.option },
                      t = [],
                      n = [],
                      i,
                      s,
                      o,
                      u,
                      a,
                      l;
                    fn.errors.length && (e.errors = fn.errors), f.jsonMode && (e.json = !0);
                    for (a in qt) r.has(qt, a) && t.push({ name: a, line: qt[a] });
                    t.length > 0 && (e.implieds = t),
                      Yt.length > 0 && (e.urls = Yt),
                      (l = Object.keys(Kt)),
                      l.length > 0 && (e.globals = l);
                    for (o = 1; o < Ft.length; o += 1) {
                      (s = Ft[o]), (i = {});
                      for (u = 0; u < Bt.length; u += 1) i[Bt[u]] = [];
                      for (u = 0; u < Bt.length; u += 1) i[Bt[u]].length === 0 && delete i[Bt[u]];
                      (i.name = s["(name)"]),
                        (i.param = s["(params)"]),
                        (i.line = s["(line)"]),
                        (i.character = s["(character)"]),
                        (i.last = s["(last)"]),
                        (i.lastcharacter = s["(lastcharacter)"]),
                        (i.metrics = {
                          complexity: s["(metrics)"].ComplexityCount,
                          parameters: (s["(params)"] || []).length,
                          statements: s["(metrics)"].statementCount,
                        }),
                        e.functions.push(i);
                    }
                    Gt.length > 0 && (e.unused = Gt), (n = []);
                    for (a in Xt)
                      if (typeof Xt[a] == "number") {
                        e.member = Xt;
                        break;
                      }
                    return e;
                  }),
                  (fn.jshint = fn),
                  fn
                );
              })();
            typeof n == "object" && n && (n.JSHINT = c);
          },
          {
            "./lex.js": 4,
            "./messages.js": 5,
            "./reg.js": 6,
            "./state.js": 7,
            "./style.js": 8,
            "./vars.js": 9,
            events: 10,
            underscore: 2,
          },
        ],
        4: [
          function (e, t, n) {
            function r() {
              var e = [];
              return {
                push: function (t) {
                  e.push(t);
                },
                check: function () {
                  for (var t = 0; t < e.length; ++t) e[t]();
                  e.splice(0, e.length);
                },
              };
            }
            function i(e) {
              var t = e;
              typeof t == "string" && (t = t.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")),
                t[0] &&
                  t[0].substr(0, 2) === "#!" &&
                  (t[0].indexOf("node") !== -1 && (a.option.node = !0), (t[0] = "")),
                (this.emitter = new o.EventEmitter()),
                (this.source = e),
                this.setLines(t),
                (this.prereg = !0),
                (this.line = 0),
                (this.char = 1),
                (this.from = 1),
                (this.input = ""),
                (this.inComment = !1);
              for (var n = 0; n < a.option.indent; n += 1) a.tab += " ";
            }
            var s = e("underscore"),
              o = e("events"),
              u = e("./reg.js"),
              a = e("./state.js").state,
              f = e("../data/ascii-identifier-data.js"),
              l = f.asciiIdentifierStartTable,
              c = f.asciiIdentifierPartTable,
              h = {
                Identifier: 1,
                Punctuator: 2,
                NumericLiteral: 3,
                StringLiteral: 4,
                Comment: 5,
                Keyword: 6,
                NullLiteral: 7,
                BooleanLiteral: 8,
                RegExp: 9,
                TemplateLiteral: 10,
              };
            (i.prototype = {
              _lines: [],
              getLines: function () {
                return (this._lines = a.lines), this._lines;
              },
              setLines: function (e) {
                (this._lines = e), (a.lines = this._lines);
              },
              peek: function (e) {
                return this.input.charAt(e || 0);
              },
              skip: function (e) {
                (e = e || 1), (this.char += e), (this.input = this.input.slice(e));
              },
              on: function (e, t) {
                e.split(" ").forEach(
                  function (e) {
                    this.emitter.on(e, t);
                  }.bind(this)
                );
              },
              trigger: function () {
                this.emitter.emit.apply(this.emitter, Array.prototype.slice.call(arguments));
              },
              triggerAsync: function (e, t, n, r) {
                n.push(
                  function () {
                    r() && this.trigger(e, t);
                  }.bind(this)
                );
              },
              scanPunctuator: function () {
                var e = this.peek(),
                  t,
                  n,
                  r;
                switch (e) {
                  case ".":
                    if (/^[0-9]$/.test(this.peek(1))) return null;
                    if (this.peek(1) === "." && this.peek(2) === ".") return { type: h.Punctuator, value: "..." };
                  case "(":
                  case ")":
                  case ";":
                  case ",":
                  case "{":
                  case "}":
                  case "[":
                  case "]":
                  case ":":
                  case "~":
                  case "?":
                    return { type: h.Punctuator, value: e };
                  case "#":
                    return { type: h.Punctuator, value: e };
                  case "":
                    return null;
                }
                return (
                  (t = this.peek(1)),
                  (n = this.peek(2)),
                  (r = this.peek(3)),
                  e === ">" && t === ">" && n === ">" && r === "="
                    ? { type: h.Punctuator, value: ">>>=" }
                    : e === "=" && t === "=" && n === "="
                    ? { type: h.Punctuator, value: "===" }
                    : e === "!" && t === "=" && n === "="
                    ? { type: h.Punctuator, value: "!==" }
                    : e === ">" && t === ">" && n === ">"
                    ? { type: h.Punctuator, value: ">>>" }
                    : e === "<" && t === "<" && n === "="
                    ? { type: h.Punctuator, value: "<<=" }
                    : e === ">" && t === ">" && n === "="
                    ? { type: h.Punctuator, value: ">>=" }
                    : e === "=" && t === ">"
                    ? { type: h.Punctuator, value: e + t }
                    : e === t && "+-<>&|".indexOf(e) >= 0
                    ? { type: h.Punctuator, value: e + t }
                    : "<>=!+-*%&|^".indexOf(e) >= 0
                    ? t === "="
                      ? { type: h.Punctuator, value: e + t }
                      : { type: h.Punctuator, value: e }
                    : e === "/"
                    ? t === "=" && /\/=(?!(\S*\/[gim]?))/.test(this.input)
                      ? { type: h.Punctuator, value: "/=" }
                      : { type: h.Punctuator, value: "/" }
                    : null
                );
              },
              scanComments: function () {
                function e(e, t, n) {
                  var r = ["jshint", "jslint", "members", "member", "globals", "global", "exported"],
                    i = !1,
                    s = e + t,
                    o = "plain";
                  return (
                    (n = n || {}),
                    n.isMultiline && (s += "*/"),
                    r.forEach(function (n) {
                      if (i) return;
                      if (e === "//" && n !== "jshint") return;
                      t.substr(0, n.length) === n && ((i = !0), (e += n), (t = t.substr(n.length))),
                        !i &&
                          t.charAt(0) === " " &&
                          t.substr(1, n.length) === n &&
                          ((i = !0), (e = e + " " + n), (t = t.substr(n.length + 1)));
                      if (!i) return;
                      switch (n) {
                        case "member":
                          o = "members";
                          break;
                        case "global":
                          o = "globals";
                          break;
                        default:
                          o = n;
                      }
                    }),
                    {
                      type: h.Comment,
                      commentType: o,
                      value: s,
                      body: t,
                      isSpecial: i,
                      isMultiline: n.isMultiline || !1,
                      isMalformed: n.isMalformed || !1,
                    }
                  );
                }
                var t = this.peek(),
                  n = this.peek(1),
                  r = this.input.substr(2),
                  i = this.line,
                  s = this.char;
                if (t === "*" && n === "/")
                  return this.trigger("error", { code: "E018", line: i, character: s }), this.skip(2), null;
                if (t !== "/" || (n !== "*" && n !== "/")) return null;
                if (n === "/") return this.skip(this.input.length), e("//", r);
                var o = "";
                if (n === "*") {
                  (this.inComment = !0), this.skip(2);
                  while (this.peek() !== "*" || this.peek(1) !== "/")
                    if (this.peek() === "") {
                      o += "\n";
                      if (!this.nextLine())
                        return (
                          this.trigger("error", { code: "E017", line: i, character: s }),
                          (this.inComment = !1),
                          e("/*", o, { isMultiline: !0, isMalformed: !0 })
                        );
                    } else (o += this.peek()), this.skip();
                  return this.skip(2), (this.inComment = !1), e("/*", o, { isMultiline: !0 });
                }
              },
              scanKeyword: function () {
                var e = /^[a-zA-Z_$][a-zA-Z0-9_$]*/.exec(this.input),
                  t = [
                    "if",
                    "in",
                    "do",
                    "var",
                    "for",
                    "new",
                    "try",
                    "let",
                    "this",
                    "else",
                    "case",
                    "void",
                    "with",
                    "enum",
                    "while",
                    "break",
                    "catch",
                    "throw",
                    "const",
                    "yield",
                    "class",
                    "super",
                    "return",
                    "typeof",
                    "delete",
                    "switch",
                    "export",
                    "import",
                    "default",
                    "finally",
                    "extends",
                    "function",
                    "continue",
                    "debugger",
                    "instanceof",
                  ];
                return e && t.indexOf(e[0]) >= 0 ? { type: h.Keyword, value: e[0] } : null;
              },
              scanIdentifier: function () {
                function e(e) {
                  return e > 256;
                }
                function t(e) {
                  return e > 256;
                }
                function n(e) {
                  return /^[0-9a-fA-F]$/.test(e);
                }
                var r = "",
                  i = 0,
                  s,
                  o,
                  u = function () {
                    i += 1;
                    if (this.peek(i) !== "u") return null;
                    var e = this.peek(i + 1),
                      r = this.peek(i + 2),
                      s = this.peek(i + 3),
                      o = this.peek(i + 4),
                      u;
                    return n(e) && n(r) && n(s) && n(o)
                      ? ((u = parseInt(e + r + s + o, 16)), c[u] || t(u) ? ((i += 5), "\\u" + e + r + s + o) : null)
                      : null;
                  }.bind(this),
                  a = function () {
                    var t = this.peek(i),
                      n = t.charCodeAt(0);
                    return n === 92 ? u() : n < 128 ? (l[n] ? ((i += 1), t) : null) : e(n) ? ((i += 1), t) : null;
                  }.bind(this),
                  f = function () {
                    var e = this.peek(i),
                      n = e.charCodeAt(0);
                    return n === 92 ? u() : n < 128 ? (c[n] ? ((i += 1), e) : null) : t(n) ? ((i += 1), e) : null;
                  }.bind(this);
                o = a();
                if (o === null) return null;
                r = o;
                for (;;) {
                  o = f();
                  if (o === null) break;
                  r += o;
                }
                switch (r) {
                  case "true":
                  case "false":
                    s = h.BooleanLiteral;
                    break;
                  case "null":
                    s = h.NullLiteral;
                    break;
                  default:
                    s = h.Identifier;
                }
                return { type: s, value: r };
              },
              scanNumericLiteral: function () {
                function e(e) {
                  return /^[0-9]$/.test(e);
                }
                function t(e) {
                  return /^[0-7]$/.test(e);
                }
                function n(e) {
                  return /^[0-9a-fA-F]$/.test(e);
                }
                function r(e) {
                  return e === "$" || e === "_" || e === "\\" || (e >= "a" && e <= "z") || (e >= "A" && e <= "Z");
                }
                var i = 0,
                  s = "",
                  o = this.input.length,
                  u = this.peek(i),
                  a;
                if (u !== "." && !e(u)) return null;
                if (u !== ".") {
                  (s = this.peek(i)), (i += 1), (u = this.peek(i));
                  if (s === "0") {
                    if (u === "x" || u === "X") {
                      (i += 1), (s += u);
                      while (i < o) {
                        u = this.peek(i);
                        if (!n(u)) break;
                        (s += u), (i += 1);
                      }
                      if (s.length <= 2) return { type: h.NumericLiteral, value: s, isMalformed: !0 };
                      if (i < o) {
                        u = this.peek(i);
                        if (r(u)) return null;
                      }
                      return { type: h.NumericLiteral, value: s, base: 16, isMalformed: !1 };
                    }
                    if (t(u)) {
                      (i += 1), (s += u), (a = !1);
                      while (i < o) {
                        u = this.peek(i);
                        if (e(u)) a = !0;
                        else if (!t(u)) break;
                        (s += u), (i += 1);
                      }
                      if (i < o) {
                        u = this.peek(i);
                        if (r(u)) return null;
                      }
                      return { type: h.NumericLiteral, value: s, base: 8, isMalformed: !1 };
                    }
                    e(u) && ((i += 1), (s += u));
                  }
                  while (i < o) {
                    u = this.peek(i);
                    if (!e(u)) break;
                    (s += u), (i += 1);
                  }
                }
                if (u === ".") {
                  (s += u), (i += 1);
                  while (i < o) {
                    u = this.peek(i);
                    if (!e(u)) break;
                    (s += u), (i += 1);
                  }
                }
                if (u === "e" || u === "E") {
                  (s += u), (i += 1), (u = this.peek(i));
                  if (u === "+" || u === "-") (s += this.peek(i)), (i += 1);
                  u = this.peek(i);
                  if (!e(u)) return null;
                  (s += u), (i += 1);
                  while (i < o) {
                    u = this.peek(i);
                    if (!e(u)) break;
                    (s += u), (i += 1);
                  }
                }
                if (i < o) {
                  u = this.peek(i);
                  if (r(u)) return null;
                }
                return { type: h.NumericLiteral, value: s, base: 10, isMalformed: !isFinite(s) };
              },
              scanTemplateLiteral: function () {
                if (!a.option.esnext || this.peek() !== "`") return null;
                var e = this.line,
                  t = this.char,
                  n = 1,
                  r = "";
                this.skip();
                while (this.peek() !== "`") {
                  while (this.peek() === "") {
                    if (!this.nextLine())
                      return (
                        this.trigger("error", { code: "E052", line: e, character: t }),
                        { type: h.TemplateLiteral, value: r, isUnclosed: !0 }
                      );
                    r += "\n";
                  }
                  var i = this.peek();
                  this.skip(n), (r += i);
                }
                return this.skip(), { type: h.TemplateLiteral, value: r, isUnclosed: !1 };
              },
              scanStringLiteral: function (e) {
                var t = this.peek();
                if (t !== '"' && t !== "'") return null;
                this.triggerAsync("warning", { code: "W108", line: this.line, character: this.char }, e, function () {
                  return a.jsonMode && t !== '"';
                });
                var n = "",
                  r = this.line,
                  i = this.char,
                  s = !1;
                this.skip();
                e: while (this.peek() !== t) {
                  while (this.peek() === "") {
                    s
                      ? ((s = !1),
                        this.triggerAsync(
                          "warning",
                          { code: "W043", line: this.line, character: this.char },
                          e,
                          function () {
                            return !a.option.multistr;
                          }
                        ),
                        this.triggerAsync(
                          "warning",
                          { code: "W042", line: this.line, character: this.char },
                          e,
                          function () {
                            return a.jsonMode && a.option.multistr;
                          }
                        ))
                      : this.trigger("warning", { code: "W112", line: this.line, character: this.char });
                    if (!this.nextLine())
                      return (
                        this.trigger("error", { code: "E029", line: r, character: i }),
                        { type: h.StringLiteral, value: n, isUnclosed: !0, quote: t }
                      );
                    if (this.peek() == t) break e;
                  }
                  s = !1;
                  var o = this.peek(),
                    u = 1;
                  o < " " &&
                    this.trigger("warning", {
                      code: "W113",
                      line: this.line,
                      character: this.char,
                      data: ["<non-printable>"],
                    });
                  if (o === "\\") {
                    this.skip(), (o = this.peek());
                    switch (o) {
                      case "'":
                        this.triggerAsync(
                          "warning",
                          { code: "W114", line: this.line, character: this.char, data: ["\\'"] },
                          e,
                          function () {
                            return a.jsonMode;
                          }
                        );
                        break;
                      case "b":
                        o = "\\b";
                        break;
                      case "f":
                        o = "\\f";
                        break;
                      case "n":
                        o = "\\n";
                        break;
                      case "r":
                        o = "\\r";
                        break;
                      case "t":
                        o = "\\t";
                        break;
                      case "0":
                        o = "\\0";
                        var f = parseInt(this.peek(1), 10);
                        this.triggerAsync(
                          "warning",
                          { code: "W115", line: this.line, character: this.char },
                          e,
                          function () {
                            return f >= 0 && f <= 7 && a.directive["use strict"];
                          }
                        );
                        break;
                      case "u":
                        (o = String.fromCharCode(parseInt(this.input.substr(1, 4), 16))), (u = 5);
                        break;
                      case "v":
                        this.triggerAsync(
                          "warning",
                          { code: "W114", line: this.line, character: this.char, data: ["\\v"] },
                          e,
                          function () {
                            return a.jsonMode;
                          }
                        ),
                          (o = "");
                        break;
                      case "x":
                        var l = parseInt(this.input.substr(1, 2), 16);
                        this.triggerAsync(
                          "warning",
                          { code: "W114", line: this.line, character: this.char, data: ["\\x-"] },
                          e,
                          function () {
                            return a.jsonMode;
                          }
                        ),
                          (o = String.fromCharCode(l)),
                          (u = 3);
                        break;
                      case "\\":
                        o = "\\\\";
                        break;
                      case '"':
                        o = '\\"';
                        break;
                      case "/":
                        break;
                      case "":
                        (s = !0), (o = "");
                        break;
                      case "!":
                        if (n.slice(n.length - 2) === "<") break;
                      default:
                        this.trigger("warning", { code: "W044", line: this.line, character: this.char });
                    }
                  }
                  (n += o), this.skip(u);
                }
                return this.skip(), { type: h.StringLiteral, value: n, isUnclosed: !1, quote: t };
              },
              scanRegExp: function () {
                var e = 0,
                  t = this.input.length,
                  n = this.peek(),
                  r = n,
                  i = "",
                  s = [],
                  o = !1,
                  u = !1,
                  a,
                  f = function () {
                    n < " " &&
                      ((o = !0), this.trigger("warning", { code: "W048", line: this.line, character: this.char })),
                      n === "<" &&
                        ((o = !0),
                        this.trigger("warning", { code: "W049", line: this.line, character: this.char, data: [n] }));
                  }.bind(this);
                if (!this.prereg || n !== "/") return null;
                (e += 1), (a = !1);
                while (e < t) {
                  (n = this.peek(e)), (r += n), (i += n);
                  if (u) {
                    n === "]" && (this.peek(e - 1) !== "\\" || this.peek(e - 2) === "\\") && (u = !1),
                      n === "\\" && ((e += 1), (n = this.peek(e)), (i += n), (r += n), f()),
                      (e += 1);
                    continue;
                  }
                  if (n === "\\") {
                    (e += 1), (n = this.peek(e)), (i += n), (r += n), f();
                    if (n === "/") {
                      e += 1;
                      continue;
                    }
                    if (n === "[") {
                      e += 1;
                      continue;
                    }
                  }
                  if (n === "[") {
                    (u = !0), (e += 1);
                    continue;
                  }
                  if (n === "/") {
                    (i = i.substr(0, i.length - 1)), (a = !0), (e += 1);
                    break;
                  }
                  e += 1;
                }
                if (!a)
                  return (
                    this.trigger("error", { code: "E015", line: this.line, character: this.from }),
                    void this.trigger("fatal", { line: this.line, from: this.from })
                  );
                while (e < t) {
                  n = this.peek(e);
                  if (!/[gim]/.test(n)) break;
                  s.push(n), (r += n), (e += 1);
                }
                try {
                  new RegExp(i, s.join(""));
                } catch (l) {
                  (o = !0),
                    this.trigger("error", { code: "E016", line: this.line, character: this.char, data: [l.message] });
                }
                return { type: h.RegExp, value: r, flags: s, isMalformed: o };
              },
              scanNonBreakingSpaces: function () {
                return a.option.nonbsp ? this.input.search(/(\u00A0)/) : -1;
              },
              scanUnsafeChars: function () {
                return this.input.search(u.unsafeChars);
              },
              next: function (e) {
                this.from = this.char;
                var t;
                if (/\s/.test(this.peek())) {
                  t = this.char;
                  while (/\s/.test(this.peek())) (this.from += 1), this.skip();
                }
                var n = this.scanComments() || this.scanStringLiteral(e) || this.scanTemplateLiteral();
                return n
                  ? n
                  : ((n =
                      this.scanRegExp() ||
                      this.scanPunctuator() ||
                      this.scanKeyword() ||
                      this.scanIdentifier() ||
                      this.scanNumericLiteral()),
                    n ? (this.skip(n.value.length), n) : null);
              },
              nextLine: function () {
                var e;
                if (this.line >= this.getLines().length) return !1;
                (this.input = this.getLines()[this.line]), (this.line += 1), (this.char = 1), (this.from = 1);
                var t = this.input.trim(),
                  n = function () {
                    return s.some(arguments, function (e) {
                      return t.indexOf(e) === 0;
                    });
                  },
                  r = function () {
                    return s.some(arguments, function (e) {
                      return t.indexOf(e, t.length - e.length) !== -1;
                    });
                  };
                a.ignoreLinterErrors === !0 && !n("/*", "//") && !r("*/") && (this.input = ""),
                  (e = this.scanNonBreakingSpaces()),
                  e >= 0 && this.trigger("warning", { code: "W125", line: this.line, character: e + 1 }),
                  (this.input = this.input.replace(/\t/g, a.tab)),
                  (e = this.scanUnsafeChars()),
                  e >= 0 && this.trigger("warning", { code: "W100", line: this.line, character: e });
                if (a.option.maxlen && a.option.maxlen < this.input.length) {
                  var i = this.inComment || n.call(t, "//") || n.call(t, "/*"),
                    o = !i || !u.maxlenException.test(t);
                  o && this.trigger("warning", { code: "W101", line: this.line, character: this.input.length });
                }
                return !0;
              },
              start: function () {
                this.nextLine();
              },
              token: function () {
                function e(e, t) {
                  if (!e.reserved) return !1;
                  var n = e.meta;
                  if (n && n.isFutureReservedWord && a.option.inES5()) {
                    if (!n.es5) return !1;
                    if (n.strictOnly && !a.option.strict && !a.directive["use strict"]) return !1;
                    if (t) return !1;
                  }
                  return !0;
                }
                var t = r(),
                  n,
                  i = function (n, r, i) {
                    var o;
                    n !== "(endline)" && n !== "(end)" && (this.prereg = !1);
                    if (n === "(punctuator)") {
                      switch (r) {
                        case ".":
                        case ")":
                        case "~":
                        case "#":
                        case "]":
                          this.prereg = !1;
                          break;
                        default:
                          this.prereg = !0;
                      }
                      o = Object.create(a.syntax[r] || a.syntax["(error)"]);
                    }
                    if (n === "(identifier)") {
                      if (r === "return" || r === "case" || r === "typeof") this.prereg = !0;
                      s.has(a.syntax, r) &&
                        ((o = Object.create(a.syntax[r] || a.syntax["(error)"])),
                        e(o, i && n === "(identifier)") || (o = null));
                    }
                    return (
                      o || (o = Object.create(a.syntax[n])),
                      (o.identifier = n === "(identifier)"),
                      (o.type = o.type || n),
                      (o.value = r),
                      (o.line = this.line),
                      (o.character = this.char),
                      (o.from = this.from),
                      i && o.identifier && (o.isProperty = i),
                      (o.check = t.check),
                      o
                    );
                  }.bind(this);
                for (;;) {
                  if (!this.input.length) return i(this.nextLine() ? "(endline)" : "(end)", "");
                  n = this.next(t);
                  if (!n) {
                    this.input.length &&
                      (this.trigger("error", {
                        code: "E024",
                        line: this.line,
                        character: this.char,
                        data: [this.peek()],
                      }),
                      (this.input = ""));
                    continue;
                  }
                  switch (n.type) {
                    case h.StringLiteral:
                      return (
                        this.triggerAsync(
                          "String",
                          { line: this.line, char: this.char, from: this.from, value: n.value, quote: n.quote },
                          t,
                          function () {
                            return !0;
                          }
                        ),
                        i("(string)", n.value)
                      );
                    case h.TemplateLiteral:
                      return (
                        this.trigger("Template", { line: this.line, char: this.char, from: this.from, value: n.value }),
                        i("(template)", n.value)
                      );
                    case h.Identifier:
                      this.trigger("Identifier", {
                        line: this.line,
                        char: this.char,
                        from: this.form,
                        name: n.value,
                        isProperty: a.tokens.curr.id === ".",
                      });
                    case h.Keyword:
                    case h.NullLiteral:
                    case h.BooleanLiteral:
                      return i("(identifier)", n.value, a.tokens.curr.id === ".");
                    case h.NumericLiteral:
                      return (
                        n.isMalformed &&
                          this.trigger("warning", {
                            code: "W045",
                            line: this.line,
                            character: this.char,
                            data: [n.value],
                          }),
                        this.triggerAsync(
                          "warning",
                          { code: "W114", line: this.line, character: this.char, data: ["0x-"] },
                          t,
                          function () {
                            return n.base === 16 && a.jsonMode;
                          }
                        ),
                        this.triggerAsync(
                          "warning",
                          { code: "W115", line: this.line, character: this.char },
                          t,
                          function () {
                            return a.directive["use strict"] && n.base === 8;
                          }
                        ),
                        this.trigger("Number", {
                          line: this.line,
                          char: this.char,
                          from: this.from,
                          value: n.value,
                          base: n.base,
                          isMalformed: n.malformed,
                        }),
                        i("(number)", n.value)
                      );
                    case h.RegExp:
                      return i("(regexp)", n.value);
                    case h.Comment:
                      a.tokens.curr.comment = !0;
                      if (n.isSpecial)
                        return {
                          id: "(comment)",
                          value: n.value,
                          body: n.body,
                          type: n.commentType,
                          isSpecial: n.isSpecial,
                          line: this.line,
                          character: this.char,
                          from: this.from,
                        };
                      break;
                    case "":
                      break;
                    default:
                      return i("(punctuator)", n.value);
                  }
                }
              },
            }),
              (n.Lexer = i);
          },
          { "../data/ascii-identifier-data.js": 1, "./reg.js": 6, "./state.js": 7, events: 10, underscore: 2 },
        ],
        5: [
          function (e, t, n) {
            var r = e("underscore"),
              i = {
                E001: "Bad option: '{a}'.",
                E002: "Bad option value.",
                E003: "Expected a JSON value.",
                E004: "Input is neither a string nor an array of strings.",
                E005: "Input is empty.",
                E006: "Unexpected early end of program.",
                E007: 'Missing "use strict" statement.',
                E008: "Strict violation.",
                E009: "Option 'validthis' can't be used in a global scope.",
                E010: "'with' is not allowed in strict mode.",
                E011: "const '{a}' has already been declared.",
                E012: "const '{a}' is initialized to 'undefined'.",
                E013: "Attempting to override '{a}' which is a constant.",
                E014: "A regular expression literal can be confused with '/='.",
                E015: "Unclosed regular expression.",
                E016: "Invalid regular expression.",
                E017: "Unclosed comment.",
                E018: "Unbegun comment.",
                E019: "Unmatched '{a}'.",
                E020: "Expected '{a}' to match '{b}' from line {c} and instead saw '{d}'.",
                E021: "Expected '{a}' and instead saw '{b}'.",
                E022: "Line breaking error '{a}'.",
                E023: "Missing '{a}'.",
                E024: "Unexpected '{a}'.",
                E025: "Missing ':' on a case clause.",
                E026: "Missing '}' to match '{' from line {a}.",
                E027: "Missing ']' to match '[' from line {a}.",
                E028: "Illegal comma.",
                E029: "Unclosed string.",
                E030: "Expected an identifier and instead saw '{a}'.",
                E031: "Bad assignment.",
                E032: "Expected a small integer or 'false' and instead saw '{a}'.",
                E033: "Expected an operator and instead saw '{a}'.",
                E034: "get/set are ES5 features.",
                E035: "Missing property name.",
                E036: "Expected to see a statement and instead saw a block.",
                E037: null,
                E038: null,
                E039: "Function declarations are not invocable. Wrap the whole function invocation in parens.",
                E040: "Each value should have its own case label.",
                E041: "Unrecoverable syntax error.",
                E042: "Stopping.",
                E043: "Too many errors.",
                E044: null,
                E045: "Invalid for each loop.",
                E046: "A yield statement shall be within a generator function (with syntax: `function*`)",
                E047: null,
                E048: "Let declaration not directly within block.",
                E049: "A {a} cannot be named '{b}'.",
                E050: "Mozilla requires the yield expression to be parenthesized here.",
                E051: "Regular parameters cannot come after default parameters.",
                E052: "Unclosed template literal.",
              },
              s = {
                W001: "'hasOwnProperty' is a really bad name.",
                W002: "Value of '{a}' may be overwritten in IE 8 and earlier.",
                W003: "'{a}' was used before it was defined.",
                W004: "'{a}' is already defined.",
                W005: "A dot following a number can be confused with a decimal point.",
                W006: "Confusing minuses.",
                W007: "Confusing plusses.",
                W008: "A leading decimal point can be confused with a dot: '{a}'.",
                W009: "The array literal notation [] is preferable.",
                W010: "The object literal notation {} is preferable.",
                W011: null,
                W012: null,
                W013: null,
                W014: "Bad line breaking before '{a}'.",
                W015: null,
                W016: "Unexpected use of '{a}'.",
                W017: "Bad operand.",
                W018: "Confusing use of '{a}'.",
                W019: "Use the isNaN function to compare with NaN.",
                W020: "Read only.",
                W021: "'{a}' is a function.",
                W022: "Do not assign to the exception parameter.",
                W023: "Expected an identifier in an assignment and instead saw a function invocation.",
                W024: "Expected an identifier and instead saw '{a}' (a reserved word).",
                W025: "Missing name in function declaration.",
                W026: "Inner functions should be listed at the top of the outer function.",
                W027: "Unreachable '{a}' after '{b}'.",
                W028: "Label '{a}' on {b} statement.",
                W030: "Expected an assignment or function call and instead saw an expression.",
                W031: "Do not use 'new' for side effects.",
                W032: "Unnecessary semicolon.",
                W033: "Missing semicolon.",
                W034: 'Unnecessary directive "{a}".',
                W035: "Empty block.",
                W036: "Unexpected /*member '{a}'.",
                W037: "'{a}' is a statement label.",
                W038: "'{a}' used out of scope.",
                W039: "'{a}' is not allowed.",
                W040: "Possible strict violation.",
                W041: "Use '{a}' to compare with '{b}'.",
                W042: "Avoid EOL escaping.",
                W043: "Bad escaping of EOL. Use option multistr if needed.",
                W044: "Bad or unnecessary escaping.",
                W045: "Bad number '{a}'.",
                W046: "Don't use extra leading zeros '{a}'.",
                W047: "A trailing decimal point can be confused with a dot: '{a}'.",
                W048: "Unexpected control character in regular expression.",
                W049: "Unexpected escaped character '{a}' in regular expression.",
                W050: "JavaScript URL.",
                W051: "Variables should not be deleted.",
                W052: "Unexpected '{a}'.",
                W053: "Do not use {a} as a constructor.",
                W054: "The Function constructor is a form of eval.",
                W055: "A constructor name should start with an uppercase letter.",
                W056: "Bad constructor.",
                W057: "Weird construction. Is 'new' necessary?",
                W058: "Missing '()' invoking a constructor.",
                W059: "Avoid arguments.{a}.",
                W060: "document.write can be a form of eval.",
                W061: "eval can be harmful.",
                W062: "Wrap an immediate function invocation in parens to assist the reader in understanding that the expression is the result of a function, and not the function itself.",
                W063: "Math is not a function.",
                W064: "Missing 'new' prefix when invoking a constructor.",
                W065: "Missing radix parameter.",
                W066: "Implied eval. Consider passing a function instead of a string.",
                W067: "Bad invocation.",
                W068: "Wrapping non-IIFE function literals in parens is unnecessary.",
                W069: "['{a}'] is better written in dot notation.",
                W070: "Extra comma. (it breaks older versions of IE)",
                W071: "This function has too many statements. ({a})",
                W072: "This function has too many parameters. ({a})",
                W073: "Blocks are nested too deeply. ({a})",
                W074: "This function's cyclomatic complexity is too high. ({a})",
                W075: "Duplicate key '{a}'.",
                W076: "Unexpected parameter '{a}' in get {b} function.",
                W077: "Expected a single parameter in set {a} function.",
                W078: "Setter is defined without getter.",
                W079: "Redefinition of '{a}'.",
                W080: "It's not necessary to initialize '{a}' to 'undefined'.",
                W081: null,
                W082: "Function declarations should not be placed in blocks. Use a function expression or move the statement to the top of the outer function.",
                W083: "Don't make functions within a loop.",
                W084: "Assignment in conditional expression",
                W085: "Don't use 'with'.",
                W086: "Expected a 'break' statement before '{a}'.",
                W087: "Forgotten 'debugger' statement?",
                W088: "Creating global 'for' variable. Should be 'for (var {a} ...'.",
                W089: "The body of a for in should be wrapped in an if statement to filter unwanted properties from the prototype.",
                W090: "'{a}' is not a statement label.",
                W091: "'{a}' is out of scope.",
                W093: "Did you mean to return a conditional instead of an assignment?",
                W094: "Unexpected comma.",
                W095: "Expected a string and instead saw {a}.",
                W096: "The '{a}' key may produce unexpected results.",
                W097: 'Use the function form of "use strict".',
                W098: "'{a}' is defined but never used.",
                W099: null,
                W100: "This character may get silently deleted by one or more browsers.",
                W101: "Line is too long.",
                W102: null,
                W103: "The '{a}' property is deprecated.",
                W104: "'{a}' is available in ES6 (use esnext option) or Mozilla JS extensions (use moz).",
                W105: "Unexpected {a} in '{b}'.",
                W106: "Identifier '{a}' is not in camel case.",
                W107: "Script URL.",
                W108: "Strings must use doublequote.",
                W109: "Strings must use singlequote.",
                W110: "Mixed double and single quotes.",
                W112: "Unclosed string.",
                W113: "Control character in string: {a}.",
                W114: "Avoid {a}.",
                W115: "Octal literals are not allowed in strict mode.",
                W116: "Expected '{a}' and instead saw '{b}'.",
                W117: "'{a}' is not defined.",
                W118: "'{a}' is only available in Mozilla JavaScript extensions (use moz option).",
                W119: "'{a}' is only available in ES6 (use esnext option).",
                W120: "You might be leaking a variable ({a}) here.",
                W121: "Extending prototype of native object: '{a}'.",
                W122: "Invalid typeof value '{a}'",
                W123: "'{a}' is already defined in outer scope.",
                W124: "A generator function shall contain a yield statement.",
                W125: "This line contains non-breaking spaces: http://jshint.com/doc/options/#nonbsp",
              },
              o = {
                I001: "Comma warnings can be turned off with 'laxcomma'.",
                I002: null,
                I003: "ES5 option is now set per default",
              };
            (n.errors = {}),
              (n.warnings = {}),
              (n.info = {}),
              r.each(i, function (e, t) {
                n.errors[t] = { code: t, desc: e };
              }),
              r.each(s, function (e, t) {
                n.warnings[t] = { code: t, desc: e };
              }),
              r.each(o, function (e, t) {
                n.info[t] = { code: t, desc: e };
              });
          },
          { underscore: 2 },
        ],
        6: [
          function (e, t, n) {
            "use string";
            (n.unsafeString = /@cc|<\/?|script|\]\s*\]|<\s*!|&lt/i),
              (n.unsafeChars =
                /[\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/),
              (n.needEsc =
                /[\u0000-\u001f&<"\/\\\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/),
              (n.needEscGlobal =
                /[\u0000-\u001f&<"\/\\\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g),
              (n.starSlash = /\*\//),
              (n.identifier = /^([a-zA-Z_$][a-zA-Z0-9_$]*)$/),
              (n.javascriptURL = /^(?:javascript|jscript|ecmascript|vbscript|mocha|livescript)\s*:/i),
              (n.fallsThrough = /^\s*\/\*\s*falls?\sthrough\s*\*\/\s*$/),
              (n.maxlenException = /^(?:(?:\/\/|\/\*|\*) ?)?[^ ]+$/);
          },
          {},
        ],
        7: [
          function (e, t, n) {
            var r = {
              syntax: {},
              reset: function () {
                (this.tokens = { prev: null, next: null, curr: null }),
                  (this.option = {}),
                  (this.ignored = {}),
                  (this.directive = {}),
                  (this.jsonMode = !1),
                  (this.jsonWarnings = []),
                  (this.lines = []),
                  (this.tab = ""),
                  (this.cache = {}),
                  (this.ignoredLines = {}),
                  (this.ignoreLinterErrors = !1);
              },
            };
            n.state = r;
          },
          {},
        ],
        8: [
          function (e, t, n) {
            n.register = function (e) {
              e.on("Identifier", function (t) {
                if (e.getOption("proto")) return;
                t.name === "__proto__" && e.warn("W103", { line: t.line, char: t.char, data: [t.name] });
              }),
                e.on("Identifier", function (t) {
                  if (e.getOption("iterator")) return;
                  t.name === "__iterator__" && e.warn("W104", { line: t.line, char: t.char, data: [t.name] });
                }),
                e.on("Identifier", function (t) {
                  if (!e.getOption("camelcase")) return;
                  t.name.replace(/^_+|_+$/g, "").indexOf("_") > -1 &&
                    !t.name.match(/^[A-Z0-9_]*$/) &&
                    e.warn("W106", { line: t.line, char: t.from, data: [t.name] });
                }),
                e.on("String", function (t) {
                  var n = e.getOption("quotmark"),
                    r;
                  if (!n) return;
                  n === "single" && t.quote !== "'" && (r = "W109"),
                    n === "double" && t.quote !== '"' && (r = "W108"),
                    n === !0 &&
                      (e.getCache("quotmark") || e.setCache("quotmark", t.quote),
                      e.getCache("quotmark") !== t.quote && (r = "W110")),
                    r && e.warn(r, { line: t.line, char: t.char });
                }),
                e.on("Number", function (t) {
                  t.value.charAt(0) === "." && e.warn("W008", { line: t.line, char: t.char, data: [t.value] }),
                    t.value.substr(t.value.length - 1) === "." &&
                      e.warn("W047", { line: t.line, char: t.char, data: [t.value] }),
                    /^00+/.test(t.value) && e.warn("W046", { line: t.line, char: t.char, data: [t.value] });
                }),
                e.on("String", function (t) {
                  var n = /^(?:javascript|jscript|ecmascript|vbscript|mocha|livescript)\s*:/i;
                  if (e.getOption("scripturl")) return;
                  n.test(t.value) && e.warn("W107", { line: t.line, char: t.char });
                });
            };
          },
          {},
        ],
        9: [
          function (e, t, n) {
            (n.reservedVars = { arguments: !1, NaN: !1 }),
              (n.ecmaIdentifiers = {
                Array: !1,
                Boolean: !1,
                Date: !1,
                decodeURI: !1,
                decodeURIComponent: !1,
                encodeURI: !1,
                encodeURIComponent: !1,
                Error: !1,
                eval: !1,
                EvalError: !1,
                Function: !1,
                hasOwnProperty: !1,
                isFinite: !1,
                isNaN: !1,
                JSON: !1,
                Math: !1,
                Number: !1,
                Object: !1,
                parseInt: !1,
                parseFloat: !1,
                RangeError: !1,
                ReferenceError: !1,
                RegExp: !1,
                String: !1,
                SyntaxError: !1,
                TypeError: !1,
                URIError: !1,
              }),
              (n.newEcmaIdentifiers = { Set: !1, Map: !1, WeakMap: !1, WeakSet: !1, Proxy: !1, Promise: !1 }),
              (n.browser = {
                Audio: !1,
                Blob: !1,
                addEventListener: !1,
                applicationCache: !1,
                atob: !1,
                blur: !1,
                btoa: !1,
                CanvasGradient: !1,
                CanvasPattern: !1,
                CanvasRenderingContext2D: !1,
                clearInterval: !1,
                clearTimeout: !1,
                close: !1,
                closed: !1,
                CustomEvent: !1,
                DOMParser: !1,
                defaultStatus: !1,
                document: !1,
                Element: !1,
                ElementTimeControl: !1,
                event: !1,
                FileReader: !1,
                FormData: !1,
                focus: !1,
                frames: !1,
                getComputedStyle: !1,
                HTMLElement: !1,
                HTMLAnchorElement: !1,
                HTMLBaseElement: !1,
                HTMLBlockquoteElement: !1,
                HTMLBodyElement: !1,
                HTMLBRElement: !1,
                HTMLButtonElement: !1,
                HTMLCanvasElement: !1,
                HTMLDirectoryElement: !1,
                HTMLDivElement: !1,
                HTMLDListElement: !1,
                HTMLFieldSetElement: !1,
                HTMLFontElement: !1,
                HTMLFormElement: !1,
                HTMLFrameElement: !1,
                HTMLFrameSetElement: !1,
                HTMLHeadElement: !1,
                HTMLHeadingElement: !1,
                HTMLHRElement: !1,
                HTMLHtmlElement: !1,
                HTMLIFrameElement: !1,
                HTMLImageElement: !1,
                HTMLInputElement: !1,
                HTMLIsIndexElement: !1,
                HTMLLabelElement: !1,
                HTMLLayerElement: !1,
                HTMLLegendElement: !1,
                HTMLLIElement: !1,
                HTMLLinkElement: !1,
                HTMLMapElement: !1,
                HTMLMenuElement: !1,
                HTMLMetaElement: !1,
                HTMLModElement: !1,
                HTMLObjectElement: !1,
                HTMLOListElement: !1,
                HTMLOptGroupElement: !1,
                HTMLOptionElement: !1,
                HTMLParagraphElement: !1,
                HTMLParamElement: !1,
                HTMLPreElement: !1,
                HTMLQuoteElement: !1,
                HTMLScriptElement: !1,
                HTMLSelectElement: !1,
                HTMLStyleElement: !1,
                HTMLTableCaptionElement: !1,
                HTMLTableCellElement: !1,
                HTMLTableColElement: !1,
                HTMLTableElement: !1,
                HTMLTableRowElement: !1,
                HTMLTableSectionElement: !1,
                HTMLTextAreaElement: !1,
                HTMLTitleElement: !1,
                HTMLUListElement: !1,
                HTMLVideoElement: !1,
                history: !1,
                Image: !1,
                length: !1,
                localStorage: !1,
                location: !1,
                matchMedia: !1,
                MessageChannel: !1,
                MessageEvent: !1,
                MessagePort: !1,
                MouseEvent: !1,
                moveBy: !1,
                moveTo: !1,
                MutationObserver: !1,
                name: !1,
                Node: !1,
                NodeFilter: !1,
                NodeList: !1,
                navigator: !1,
                onbeforeunload: !0,
                onblur: !0,
                onerror: !0,
                onfocus: !0,
                onload: !0,
                onresize: !0,
                onunload: !0,
                open: !1,
                openDatabase: !1,
                opener: !1,
                Option: !1,
                parent: !1,
                print: !1,
                removeEventListener: !1,
                resizeBy: !1,
                resizeTo: !1,
                screen: !1,
                scroll: !1,
                scrollBy: !1,
                scrollTo: !1,
                sessionStorage: !1,
                setInterval: !1,
                setTimeout: !1,
                SharedWorker: !1,
                status: !1,
                SVGAElement: !1,
                SVGAltGlyphDefElement: !1,
                SVGAltGlyphElement: !1,
                SVGAltGlyphItemElement: !1,
                SVGAngle: !1,
                SVGAnimateColorElement: !1,
                SVGAnimateElement: !1,
                SVGAnimateMotionElement: !1,
                SVGAnimateTransformElement: !1,
                SVGAnimatedAngle: !1,
                SVGAnimatedBoolean: !1,
                SVGAnimatedEnumeration: !1,
                SVGAnimatedInteger: !1,
                SVGAnimatedLength: !1,
                SVGAnimatedLengthList: !1,
                SVGAnimatedNumber: !1,
                SVGAnimatedNumberList: !1,
                SVGAnimatedPathData: !1,
                SVGAnimatedPoints: !1,
                SVGAnimatedPreserveAspectRatio: !1,
                SVGAnimatedRect: !1,
                SVGAnimatedString: !1,
                SVGAnimatedTransformList: !1,
                SVGAnimationElement: !1,
                SVGCSSRule: !1,
                SVGCircleElement: !1,
                SVGClipPathElement: !1,
                SVGColor: !1,
                SVGColorProfileElement: !1,
                SVGColorProfileRule: !1,
                SVGComponentTransferFunctionElement: !1,
                SVGCursorElement: !1,
                SVGDefsElement: !1,
                SVGDescElement: !1,
                SVGDocument: !1,
                SVGElement: !1,
                SVGElementInstance: !1,
                SVGElementInstanceList: !1,
                SVGEllipseElement: !1,
                SVGExternalResourcesRequired: !1,
                SVGFEBlendElement: !1,
                SVGFEColorMatrixElement: !1,
                SVGFEComponentTransferElement: !1,
                SVGFECompositeElement: !1,
                SVGFEConvolveMatrixElement: !1,
                SVGFEDiffuseLightingElement: !1,
                SVGFEDisplacementMapElement: !1,
                SVGFEDistantLightElement: !1,
                SVGFEFloodElement: !1,
                SVGFEFuncAElement: !1,
                SVGFEFuncBElement: !1,
                SVGFEFuncGElement: !1,
                SVGFEFuncRElement: !1,
                SVGFEGaussianBlurElement: !1,
                SVGFEImageElement: !1,
                SVGFEMergeElement: !1,
                SVGFEMergeNodeElement: !1,
                SVGFEMorphologyElement: !1,
                SVGFEOffsetElement: !1,
                SVGFEPointLightElement: !1,
                SVGFESpecularLightingElement: !1,
                SVGFESpotLightElement: !1,
                SVGFETileElement: !1,
                SVGFETurbulenceElement: !1,
                SVGFilterElement: !1,
                SVGFilterPrimitiveStandardAttributes: !1,
                SVGFitToViewBox: !1,
                SVGFontElement: !1,
                SVGFontFaceElement: !1,
                SVGFontFaceFormatElement: !1,
                SVGFontFaceNameElement: !1,
                SVGFontFaceSrcElement: !1,
                SVGFontFaceUriElement: !1,
                SVGForeignObjectElement: !1,
                SVGGElement: !1,
                SVGGlyphElement: !1,
                SVGGlyphRefElement: !1,
                SVGGradientElement: !1,
                SVGHKernElement: !1,
                SVGICCColor: !1,
                SVGImageElement: !1,
                SVGLangSpace: !1,
                SVGLength: !1,
                SVGLengthList: !1,
                SVGLineElement: !1,
                SVGLinearGradientElement: !1,
                SVGLocatable: !1,
                SVGMPathElement: !1,
                SVGMarkerElement: !1,
                SVGMaskElement: !1,
                SVGMatrix: !1,
                SVGMetadataElement: !1,
                SVGMissingGlyphElement: !1,
                SVGNumber: !1,
                SVGNumberList: !1,
                SVGPaint: !1,
                SVGPathElement: !1,
                SVGPathSeg: !1,
                SVGPathSegArcAbs: !1,
                SVGPathSegArcRel: !1,
                SVGPathSegClosePath: !1,
                SVGPathSegCurvetoCubicAbs: !1,
                SVGPathSegCurvetoCubicRel: !1,
                SVGPathSegCurvetoCubicSmoothAbs: !1,
                SVGPathSegCurvetoCubicSmoothRel: !1,
                SVGPathSegCurvetoQuadraticAbs: !1,
                SVGPathSegCurvetoQuadraticRel: !1,
                SVGPathSegCurvetoQuadraticSmoothAbs: !1,
                SVGPathSegCurvetoQuadraticSmoothRel: !1,
                SVGPathSegLinetoAbs: !1,
                SVGPathSegLinetoHorizontalAbs: !1,
                SVGPathSegLinetoHorizontalRel: !1,
                SVGPathSegLinetoRel: !1,
                SVGPathSegLinetoVerticalAbs: !1,
                SVGPathSegLinetoVerticalRel: !1,
                SVGPathSegList: !1,
                SVGPathSegMovetoAbs: !1,
                SVGPathSegMovetoRel: !1,
                SVGPatternElement: !1,
                SVGPoint: !1,
                SVGPointList: !1,
                SVGPolygonElement: !1,
                SVGPolylineElement: !1,
                SVGPreserveAspectRatio: !1,
                SVGRadialGradientElement: !1,
                SVGRect: !1,
                SVGRectElement: !1,
                SVGRenderingIntent: !1,
                SVGSVGElement: !1,
                SVGScriptElement: !1,
                SVGSetElement: !1,
                SVGStopElement: !1,
                SVGStringList: !1,
                SVGStylable: !1,
                SVGStyleElement: !1,
                SVGSwitchElement: !1,
                SVGSymbolElement: !1,
                SVGTRefElement: !1,
                SVGTSpanElement: !1,
                SVGTests: !1,
                SVGTextContentElement: !1,
                SVGTextElement: !1,
                SVGTextPathElement: !1,
                SVGTextPositioningElement: !1,
                SVGTitleElement: !1,
                SVGTransform: !1,
                SVGTransformList: !1,
                SVGTransformable: !1,
                SVGURIReference: !1,
                SVGUnitTypes: !1,
                SVGUseElement: !1,
                SVGVKernElement: !1,
                SVGViewElement: !1,
                SVGViewSpec: !1,
                SVGZoomAndPan: !1,
                TimeEvent: !1,
                top: !1,
                URL: !1,
                WebSocket: !1,
                window: !1,
                Worker: !1,
                XMLHttpRequest: !1,
                XMLSerializer: !1,
                XPathEvaluator: !1,
                XPathException: !1,
                XPathExpression: !1,
                XPathNamespace: !1,
                XPathNSResolver: !1,
                XPathResult: !1,
              }),
              (n.devel = { alert: !1, confirm: !1, console: !1, Debug: !1, opera: !1, prompt: !1 }),
              (n.worker = { importScripts: !0, postMessage: !0, self: !0 }),
              (n.nonstandard = { escape: !1, unescape: !1 }),
              (n.couch = {
                require: !1,
                respond: !1,
                getRow: !1,
                emit: !1,
                send: !1,
                start: !1,
                sum: !1,
                log: !1,
                exports: !1,
                module: !1,
                provides: !1,
              }),
              (n.node = {
                __filename: !1,
                __dirname: !1,
                GLOBAL: !1,
                global: !1,
                module: !1,
                require: !1,
                Buffer: !0,
                console: !0,
                exports: !0,
                process: !0,
                setTimeout: !0,
                clearTimeout: !0,
                setInterval: !0,
                clearInterval: !0,
                setImmediate: !0,
                clearImmediate: !0,
              }),
              (n.phantom = { phantom: !0, require: !0, WebPage: !0, console: !0, exports: !0 }),
              (n.rhino = {
                defineClass: !1,
                deserialize: !1,
                gc: !1,
                help: !1,
                importClass: !1,
                importPackage: !1,
                java: !1,
                load: !1,
                loadClass: !1,
                Packages: !1,
                print: !1,
                quit: !1,
                readFile: !1,
                readUrl: !1,
                runCommand: !1,
                seal: !1,
                serialize: !1,
                spawn: !1,
                sync: !1,
                toint32: !1,
                version: !1,
              }),
              (n.shelljs = {
                target: !1,
                echo: !1,
                exit: !1,
                cd: !1,
                pwd: !1,
                ls: !1,
                find: !1,
                cp: !1,
                rm: !1,
                mv: !1,
                mkdir: !1,
                test: !1,
                cat: !1,
                sed: !1,
                grep: !1,
                which: !1,
                dirs: !1,
                pushd: !1,
                popd: !1,
                env: !1,
                exec: !1,
                chmod: !1,
                config: !1,
                error: !1,
                tempdir: !1,
              }),
              (n.typed = {
                ArrayBuffer: !1,
                ArrayBufferView: !1,
                DataView: !1,
                Float32Array: !1,
                Float64Array: !1,
                Int16Array: !1,
                Int32Array: !1,
                Int8Array: !1,
                Uint16Array: !1,
                Uint32Array: !1,
                Uint8Array: !1,
                Uint8ClampedArray: !1,
              }),
              (n.wsh = {
                ActiveXObject: !0,
                Enumerator: !0,
                GetObject: !0,
                ScriptEngine: !0,
                ScriptEngineBuildVersion: !0,
                ScriptEngineMajorVersion: !0,
                ScriptEngineMinorVersion: !0,
                VBArray: !0,
                WSH: !0,
                WScript: !0,
                XDomainRequest: !0,
              }),
              (n.dojo = { dojo: !1, dijit: !1, dojox: !1, define: !1, require: !1 }),
              (n.jquery = { $: !1, jQuery: !1 }),
              (n.mootools = {
                $: !1,
                $$: !1,
                Asset: !1,
                Browser: !1,
                Chain: !1,
                Class: !1,
                Color: !1,
                Cookie: !1,
                Core: !1,
                Document: !1,
                DomReady: !1,
                DOMEvent: !1,
                DOMReady: !1,
                Drag: !1,
                Element: !1,
                Elements: !1,
                Event: !1,
                Events: !1,
                Fx: !1,
                Group: !1,
                Hash: !1,
                HtmlTable: !1,
                Iframe: !1,
                IframeShim: !1,
                InputValidator: !1,
                instanceOf: !1,
                Keyboard: !1,
                Locale: !1,
                Mask: !1,
                MooTools: !1,
                Native: !1,
                Options: !1,
                OverText: !1,
                Request: !1,
                Scroller: !1,
                Slick: !1,
                Slider: !1,
                Sortables: !1,
                Spinner: !1,
                Swiff: !1,
                Tips: !1,
                Type: !1,
                typeOf: !1,
                URI: !1,
                Window: !1,
              }),
              (n.prototypejs = {
                $: !1,
                $$: !1,
                $A: !1,
                $F: !1,
                $H: !1,
                $R: !1,
                $break: !1,
                $continue: !1,
                $w: !1,
                Abstract: !1,
                Ajax: !1,
                Class: !1,
                Enumerable: !1,
                Element: !1,
                Event: !1,
                Field: !1,
                Form: !1,
                Hash: !1,
                Insertion: !1,
                ObjectRange: !1,
                PeriodicalExecuter: !1,
                Position: !1,
                Prototype: !1,
                Selector: !1,
                Template: !1,
                Toggle: !1,
                Try: !1,
                Autocompleter: !1,
                Builder: !1,
                Control: !1,
                Draggable: !1,
                Draggables: !1,
                Droppables: !1,
                Effect: !1,
                Sortable: !1,
                SortableObserver: !1,
                Sound: !1,
                Scriptaculous: !1,
              }),
              (n.yui = { YUI: !1, Y: !1, YUI_config: !1 }),
              (n.mocha = {
                describe: !1,
                it: !1,
                before: !1,
                after: !1,
                beforeEach: !1,
                afterEach: !1,
                suite: !1,
                test: !1,
                setup: !1,
                teardown: !1,
              });
          },
          {},
        ],
        10: [
          function (e, t, n) {
            function r() {
              (this._events = this._events || {}), (this._maxListeners = this._maxListeners || undefined);
            }
            function i(e) {
              return typeof e == "function";
            }
            function s(e) {
              return typeof e == "number";
            }
            function o(e) {
              return typeof e == "object" && e !== null;
            }
            function u(e) {
              return e === void 0;
            }
            (t.exports = r),
              (r.EventEmitter = r),
              (r.prototype._events = undefined),
              (r.prototype._maxListeners = undefined),
              (r.defaultMaxListeners = 10),
              (r.prototype.setMaxListeners = function (e) {
                if (!s(e) || e < 0 || isNaN(e)) throw TypeError("n must be a positive number");
                return (this._maxListeners = e), this;
              }),
              (r.prototype.emit = function (e) {
                var t, n, r, s, a, f;
                this._events || (this._events = {});
                if (e === "error")
                  if (!this._events.error || (o(this._events.error) && !this._events.error.length))
                    throw (
                      ((t = arguments[1]), t instanceof Error ? t : TypeError('Uncaught, unspecified "error" event.'))
                    );
                n = this._events[e];
                if (u(n)) return !1;
                if (i(n))
                  switch (arguments.length) {
                    case 1:
                      n.call(this);
                      break;
                    case 2:
                      n.call(this, arguments[1]);
                      break;
                    case 3:
                      n.call(this, arguments[1], arguments[2]);
                      break;
                    default:
                      (r = arguments.length), (s = new Array(r - 1));
                      for (a = 1; a < r; a++) s[a - 1] = arguments[a];
                      n.apply(this, s);
                  }
                else if (o(n)) {
                  (r = arguments.length), (s = new Array(r - 1));
                  for (a = 1; a < r; a++) s[a - 1] = arguments[a];
                  (f = n.slice()), (r = f.length);
                  for (a = 0; a < r; a++) f[a].apply(this, s);
                }
                return !0;
              }),
              (r.prototype.addListener = function (e, t) {
                var n;
                if (!i(t)) throw TypeError("listener must be a function");
                this._events || (this._events = {}),
                  this._events.newListener && this.emit("newListener", e, i(t.listener) ? t.listener : t),
                  this._events[e]
                    ? o(this._events[e])
                      ? this._events[e].push(t)
                      : (this._events[e] = [this._events[e], t])
                    : (this._events[e] = t);
                if (o(this._events[e]) && !this._events[e].warned) {
                  var n;
                  u(this._maxListeners) ? (n = r.defaultMaxListeners) : (n = this._maxListeners),
                    n &&
                      n > 0 &&
                      this._events[e].length > n &&
                      ((this._events[e].warned = !0),
                      console.error(
                        "(node) warning: possible EventEmitter memory leak detected. %d listeners added. Use emitter.setMaxListeners() to increase limit.",
                        this._events[e].length
                      ),
                      console.trace());
                }
                return this;
              }),
              (r.prototype.on = r.prototype.addListener),
              (r.prototype.once = function (e, t) {
                function n() {
                  this.removeListener(e, n), r || ((r = !0), t.apply(this, arguments));
                }
                if (!i(t)) throw TypeError("listener must be a function");
                var r = !1;
                return (n.listener = t), this.on(e, n), this;
              }),
              (r.prototype.removeListener = function (e, t) {
                var n, r, s, u;
                if (!i(t)) throw TypeError("listener must be a function");
                if (!this._events || !this._events[e]) return this;
                (n = this._events[e]), (s = n.length), (r = -1);
                if (n === t || (i(n.listener) && n.listener === t))
                  delete this._events[e], this._events.removeListener && this.emit("removeListener", e, t);
                else if (o(n)) {
                  for (u = s; u-- > 0; )
                    if (n[u] === t || (n[u].listener && n[u].listener === t)) {
                      r = u;
                      break;
                    }
                  if (r < 0) return this;
                  n.length === 1 ? ((n.length = 0), delete this._events[e]) : n.splice(r, 1),
                    this._events.removeListener && this.emit("removeListener", e, t);
                }
                return this;
              }),
              (r.prototype.removeAllListeners = function (e) {
                var t, n;
                if (!this._events) return this;
                if (!this._events.removeListener)
                  return arguments.length === 0 ? (this._events = {}) : this._events[e] && delete this._events[e], this;
                if (arguments.length === 0) {
                  for (t in this._events) {
                    if (t === "removeListener") continue;
                    this.removeAllListeners(t);
                  }
                  return this.removeAllListeners("removeListener"), (this._events = {}), this;
                }
                n = this._events[e];
                if (i(n)) this.removeListener(e, n);
                else while (n.length) this.removeListener(e, n[n.length - 1]);
                return delete this._events[e], this;
              }),
              (r.prototype.listeners = function (e) {
                var t;
                return (
                  !this._events || !this._events[e]
                    ? (t = [])
                    : i(this._events[e])
                    ? (t = [this._events[e]])
                    : (t = this._events[e].slice()),
                  t
                );
              }),
              (r.listenerCount = function (e, t) {
                var n;
                return !e._events || !e._events[t] ? (n = 0) : i(e._events[t]) ? (n = 1) : (n = e._events[t].length), n;
              });
          },
          {},
        ],
      },
      {},
      [3]
    )(3);
  }),
  define(
    "ace/document",
    ["require", "exports", "module", "ace/lib/oop", "ace/lib/event_emitter", "ace/range", "ace/anchor"],
    function (e, t, n) {
      var r = e("./lib/oop"),
        i = e("./lib/event_emitter").EventEmitter,
        s = e("./range").Range,
        o = e("./anchor").Anchor,
        u = function (e) {
          (this.$lines = []),
            e.length === 0
              ? (this.$lines = [""])
              : Array.isArray(e)
              ? this._insertLines(0, e)
              : this.insert({ row: 0, column: 0 }, e);
        };
      (function () {
        r.implement(this, i),
          (this.setValue = function (e) {
            var t = this.getLength();
            this.remove(new s(0, 0, t, this.getLine(t - 1).length)), this.insert({ row: 0, column: 0 }, e);
          }),
          (this.getValue = function () {
            return this.getAllLines().join(this.getNewLineCharacter());
          }),
          (this.createAnchor = function (e, t) {
            return new o(this, e, t);
          }),
          "aaa".split(/a/).length === 0
            ? (this.$split = function (e) {
                return e.replace(/\r\n|\r/g, "\n").split("\n");
              })
            : (this.$split = function (e) {
                return e.split(/\r\n|\r|\n/);
              }),
          (this.$detectNewLine = function (e) {
            var t = e.match(/^.*?(\r\n|\r|\n)/m);
            (this.$autoNewLine = t ? t[1] : "\n"), this._signal("changeNewLineMode");
          }),
          (this.getNewLineCharacter = function () {
            switch (this.$newLineMode) {
              case "windows":
                return "\r\n";
              case "unix":
                return "\n";
              default:
                return this.$autoNewLine || "\n";
            }
          }),
          (this.$autoNewLine = ""),
          (this.$newLineMode = "auto"),
          (this.setNewLineMode = function (e) {
            if (this.$newLineMode === e) return;
            (this.$newLineMode = e), this._signal("changeNewLineMode");
          }),
          (this.getNewLineMode = function () {
            return this.$newLineMode;
          }),
          (this.isNewLine = function (e) {
            return e == "\r\n" || e == "\r" || e == "\n";
          }),
          (this.getLine = function (e) {
            return this.$lines[e] || "";
          }),
          (this.getLines = function (e, t) {
            return this.$lines.slice(e, t + 1);
          }),
          (this.getAllLines = function () {
            return this.getLines(0, this.getLength());
          }),
          (this.getLength = function () {
            return this.$lines.length;
          }),
          (this.getTextRange = function (e) {
            if (e.start.row == e.end.row) return this.getLine(e.start.row).substring(e.start.column, e.end.column);
            var t = this.getLines(e.start.row, e.end.row);
            t[0] = (t[0] || "").substring(e.start.column);
            var n = t.length - 1;
            return (
              e.end.row - e.start.row == n && (t[n] = t[n].substring(0, e.end.column)),
              t.join(this.getNewLineCharacter())
            );
          }),
          (this.$clipPosition = function (e) {
            var t = this.getLength();
            return (
              e.row >= t
                ? ((e.row = Math.max(0, t - 1)), (e.column = this.getLine(t - 1).length))
                : e.row < 0 && (e.row = 0),
              e
            );
          }),
          (this.insert = function (e, t) {
            if (!t || t.length === 0) return e;
            (e = this.$clipPosition(e)), this.getLength() <= 1 && this.$detectNewLine(t);
            var n = this.$split(t),
              r = n.splice(0, 1)[0],
              i = n.length == 0 ? null : n.splice(n.length - 1, 1)[0];
            return (
              (e = this.insertInLine(e, r)),
              i !== null &&
                ((e = this.insertNewLine(e)), (e = this._insertLines(e.row, n)), (e = this.insertInLine(e, i || ""))),
              e
            );
          }),
          (this.insertLines = function (e, t) {
            return e >= this.getLength()
              ? this.insert({ row: e, column: 0 }, "\n" + t.join("\n"))
              : this._insertLines(Math.max(e, 0), t);
          }),
          (this._insertLines = function (e, t) {
            if (t.length == 0) return { row: e, column: 0 };
            while (t.length > 61440) {
              var n = this._insertLines(e, t.slice(0, 61440));
              (t = t.slice(61440)), (e = n.row);
            }
            var r = [e, 0];
            r.push.apply(r, t), this.$lines.splice.apply(this.$lines, r);
            var i = new s(e, 0, e + t.length, 0),
              o = { action: "insertLines", range: i, lines: t };
            return this._signal("change", { data: o }), i.end;
          }),
          (this.insertNewLine = function (e) {
            e = this.$clipPosition(e);
            var t = this.$lines[e.row] || "";
            (this.$lines[e.row] = t.substring(0, e.column)),
              this.$lines.splice(e.row + 1, 0, t.substring(e.column, t.length));
            var n = { row: e.row + 1, column: 0 },
              r = { action: "insertText", range: s.fromPoints(e, n), text: this.getNewLineCharacter() };
            return this._signal("change", { data: r }), n;
          }),
          (this.insertInLine = function (e, t) {
            if (t.length == 0) return e;
            var n = this.$lines[e.row] || "";
            this.$lines[e.row] = n.substring(0, e.column) + t + n.substring(e.column);
            var r = { row: e.row, column: e.column + t.length },
              i = { action: "insertText", range: s.fromPoints(e, r), text: t };
            return this._signal("change", { data: i }), r;
          }),
          (this.remove = function (e) {
            e instanceof s || (e = s.fromPoints(e.start, e.end)),
              (e.start = this.$clipPosition(e.start)),
              (e.end = this.$clipPosition(e.end));
            if (e.isEmpty()) return e.start;
            var t = e.start.row,
              n = e.end.row;
            if (e.isMultiLine()) {
              var r = e.start.column == 0 ? t : t + 1,
                i = n - 1;
              e.end.column > 0 && this.removeInLine(n, 0, e.end.column),
                i >= r && this._removeLines(r, i),
                r != t &&
                  (this.removeInLine(t, e.start.column, this.getLine(t).length), this.removeNewLine(e.start.row));
            } else this.removeInLine(t, e.start.column, e.end.column);
            return e.start;
          }),
          (this.removeInLine = function (e, t, n) {
            if (t == n) return;
            var r = new s(e, t, e, n),
              i = this.getLine(e),
              o = i.substring(t, n),
              u = i.substring(0, t) + i.substring(n, i.length);
            this.$lines.splice(e, 1, u);
            var a = { action: "removeText", range: r, text: o };
            return this._signal("change", { data: a }), r.start;
          }),
          (this.removeLines = function (e, t) {
            return e < 0 || t >= this.getLength() ? this.remove(new s(e, 0, t + 1, 0)) : this._removeLines(e, t);
          }),
          (this._removeLines = function (e, t) {
            var n = new s(e, 0, t + 1, 0),
              r = this.$lines.splice(e, t - e + 1),
              i = { action: "removeLines", range: n, nl: this.getNewLineCharacter(), lines: r };
            return this._signal("change", { data: i }), r;
          }),
          (this.removeNewLine = function (e) {
            var t = this.getLine(e),
              n = this.getLine(e + 1),
              r = new s(e, t.length, e + 1, 0),
              i = t + n;
            this.$lines.splice(e, 2, i);
            var o = { action: "removeText", range: r, text: this.getNewLineCharacter() };
            this._signal("change", { data: o });
          }),
          (this.replace = function (e, t) {
            e instanceof s || (e = s.fromPoints(e.start, e.end));
            if (t.length == 0 && e.isEmpty()) return e.start;
            if (t == this.getTextRange(e)) return e.end;
            this.remove(e);
            if (t) var n = this.insert(e.start, t);
            else n = e.start;
            return n;
          }),
          (this.applyDeltas = function (e) {
            for (var t = 0; t < e.length; t++) {
              var n = e[t],
                r = s.fromPoints(n.range.start, n.range.end);
              n.action == "insertLines"
                ? this.insertLines(r.start.row, n.lines)
                : n.action == "insertText"
                ? this.insert(r.start, n.text)
                : n.action == "removeLines"
                ? this._removeLines(r.start.row, r.end.row - 1)
                : n.action == "removeText" && this.remove(r);
            }
          }),
          (this.revertDeltas = function (e) {
            for (var t = e.length - 1; t >= 0; t--) {
              var n = e[t],
                r = s.fromPoints(n.range.start, n.range.end);
              n.action == "insertLines"
                ? this._removeLines(r.start.row, r.end.row - 1)
                : n.action == "insertText"
                ? this.remove(r)
                : n.action == "removeLines"
                ? this._insertLines(r.start.row, n.lines)
                : n.action == "removeText" && this.insert(r.start, n.text);
            }
          }),
          (this.indexToPosition = function (e, t) {
            var n = this.$lines || this.getAllLines(),
              r = this.getNewLineCharacter().length;
            for (var i = t || 0, s = n.length; i < s; i++) {
              e -= n[i].length + r;
              if (e < 0) return { row: i, column: e + n[i].length + r };
            }
            return { row: s - 1, column: n[s - 1].length };
          }),
          (this.positionToIndex = function (e, t) {
            var n = this.$lines || this.getAllLines(),
              r = this.getNewLineCharacter().length,
              i = 0,
              s = Math.min(e.row, n.length);
            for (var o = t || 0; o < s; ++o) i += n[o].length + r;
            return i + e.column;
          });
      }.call(u.prototype),
        (t.Document = u));
    }
  );
