
/* litejs.com/MIT-LICENSE.txt */

!function(exports, _setTimeout, _clearTimeout, _Date, _Error, _Infinity) {
	var started, testSuite, timerType, inSuite
	, tests = []
	, describe = exports.describe = curry(def, 1)
	, _global = describe.global = exports.window || global
	, _process = _global.process || /* c8 ignore next */ { exit: This }
	, _isArray = Array.isArray
	, _keys = Object.keys
	, call = def.bind.bind(def.call)
	, slice = call(tests.slice)
	, push = call(tests.push)
	, lineRe = /{([.\w]+)}/g
	, totalCases = 0
	, failedCases = []
	, totalAsserts = 0
	, passedAsserts = 0
	, skipped = 0
	, runPos = 0
	, splicePos = 0
	, assert = describe.assert = {
		notOk: function(value, message) {
			return this(!value, message || "!=", value, "falsy")
		},
		equal: function(actual, expected, message) {
			return this(
				arguments.length > 1 && _deepEqual(actual, expected, []),
				message || "equal", actual, expected
			)
		},
		notEqual: function(actual, expected, message) {
			return this(
				arguments.length > 1 && !_deepEqual(actual, expected, []),
				message || "notEqual", actual, expected
			)
		},
		skip: This,
		strictEqual: function(actual, expected, message) {
			return this(
				arguments.length > 1 && actual === expected,
				message || "===", actual, expected
			)
		},
		notStrictEqual: function(actual, expected, message) {
			return this(
				arguments.length > 1 && actual !== expected,
				message || "!==", actual, expected
			)
		},
		own: function(actual, expected, message) {
			own.lastMsg = ""
			return this(own(actual, expected), message || own.lastMsg, actual, expected)
		},
		notOwn: function(actual, expected, message) {
			own.lastMsg = ""
			return this(!own(actual, expected), message || own.lastMsg, actual, expected)
		},
		throws: function(fn, message) {
			var actual = false
			try {
				fn()
			} catch(e) {
				actual = true
			}
			return this(actual, message || "throws", actual, true)
		},
		type: function(thing, expected, message) {
			var actual = type(thing)
			return this(actual === expected, message || "type", actual, expected)
		},
		anyOf: function(a, b, message) {
			return this(
				_isArray(b) && b.indexOf(a) > -1,
				message || "anyOf", a, b
			)
		}
	}
	, argv = _process.argv && _process.argv.slice(2) || /* c8 ignore next */ []
	, conf = describe.conf = opts(argv, {
		// process.platform === 'win32' -> √×.
		file: (_Error().stack + " /cli/test.js:").match(/\S+?:(?=[:\d)]*$)/m)[0],
		global: "describe,it,test",
		head: "",
		indent: "  ",
		suite: "{indent}{n}", //➜✺✽❖❣❢•※⁕∅
		ok: "{indent}  {green}✔{reset} {i}. {n} [{passed}/{total}]",
		nok: "{indent}  {red}✘{reset} {i}. {n} [{passed}/{total}]",
		skip: "{indent}  {yellow}∅{reset} {i}. {n}",
		sum: "1..{total}\n#{passGreen} pass  {pass}/{total} [{passAsserts}/{totalAsserts}]{timeStr}",
		failSum: "#{red}{bold} FAIL  tests {failNums}",
		skipSum: "#{yellow}{bold} skip  {s}",
		bold: "\x1b[1m",
		red: "\x1b[31m",
		green: "\x1b[32m",
		yellow: "\x1b[33m",
		reset: "\x1b[0m",
		color: (_process.stdout || /* c8 ignore next */ _process).isTTY,
		cut: 15000,
		delay: 1,
		seed: (Math.random() * 1e5)|0,
		stack: 9,
		status: 1,
		time: 1,
		timeout: 999,
		total: 0
	})
	, toStr = conf.toString
	, hasOwn = call(conf.hasOwnProperty)
	/*** mockTime ***/
	, fakeNow
	, timers = []
	, timerId = 0
	, fakeTimers = {
		setTimeout: curry(fakeTimeout, false),
		setInterval: curry(fakeTimeout, true),
		clearTimeout: fakeClear,
		clearInterval: fakeClear,
		setImmediate: fakeNextTick,
		clearImmediate: fakeClear,
		Date: fakeDate
	}
	function fakeDate(year, month, date, hr, min, sec, ms) {
		return (
			arguments.length > 1 ?
			new _Date(num(year), num(month), num(date, 1), num(hr), num(min), num(sec), num(ms)) :
			new _Date(num(year, fakeNow))
		)
	}
	fakeDate.now = function() {
		return fakeNow
	}
	fakeDate.parse = _Date.parse
	fakeDate.UTC = _Date.UTC
	function fakeHrtime(time) {
		var diff = _isArray(time) ? fakeNow - (time[0] * 1e3 + time[1] / 1e6) : fakeNow
		return [Math.floor(diff / 1000), Math.round((diff % 1e3) * 1e3) * 1e3] // [seconds, nanoseconds]
	}
	function fakeTimeout(repeat, fn, ms) {
		if (Date === _Date) {
			return _setTimeout.apply(this, slice(arguments, 1))
		}
		if (!isObj(repeat)) {
			repeat = {
				id: ++timerId,
				repeat: repeat,
				fn: fn,
				args: slice(arguments, 3),
				at: fakeNow + ms,
				ms: ms
			}
		}
		for (var i = timers.length; i-- && !(timers[i].at <= repeat.at);); // jshint ignore:line
		timers.splice(i + 1, 0, repeat)
		return timerType == "number" ? /* c8 ignore next */ repeat.id : {
			id: repeat.id,
			unref: This
		}
	}
	function fakeNextTick(fn) {
		fakeTimeout({
			id: ++timerId,
			fn: fn,
			args: slice(arguments, 1),
			at: fakeNow - 1
		})
	}
	function fakeClear(id) {
		if (id) for (var i = timers.length; i--; ) {
			if (timers[i].id === id || timers[i].id === id.id) {
				timers.splice(i, 1)
				break
			}
		}
	}
	/* mockTime end */

	_Error.stackTraceLimit = +conf.stack + 5

	describe.describe = describe
	describe.test = curry(def, 2)
	describe.it = curry(def, 3)
	describe.should = curry(def, 4)
	describe.failed = 0
	describe.output = ""

	describe.diff = diff
	describe.equal = function(actual, expected) {
		return _deepEqual(actual, expected, [])
	}
	describe.format = format
	describe.opts = opts
	describe.print = print
	describe.stringify = stringify
	describe.type = type

	each(conf.global, function(_i, value) {
		_global[value] = describe[value]
	})

	function def(t, name, data, fn) {
		if (t < 1) t = isFn(data) + 1
		if (!started) {
			started = new _Date()

			if (!conf.color) {
				conf.bold = conf.red = conf.green = conf.yellow = conf.reset = ""
			}

			if (conf.tap) {
				conf.head = "TAP version 13"
				conf.suite = "# {n}"
				conf.ok = conf.skip = "ok {i} - {n} [{passed}/{total}]"
				conf.nok = "not " + conf.ok
				conf.indent = ""
			} else if (conf.brief) {
				conf.suite = conf.ok = conf.indent = ""
				conf.skip = "{yellow}skip {i} - {n}"
				conf.sum = conf.sum.slice(11)
			}

			if (t !== 1) def(1, "Tests")
			line("head")
			timerType = type(_setTimeout(nextCase, conf.delay|0))
		}
		if (!isStr(name)) {
			fn = data
			data = name
			name = "Unnamed Test" + (t > 1 ? "Case" : "Suite")
		}
		if (!isFn(fn)) {
			fn = data
		}
		var spliceData = [++splicePos, 0, {
			p: inSuite,
			indent: inSuite ? inSuite.indent + (t > 1 ? "" : conf.indent) : "",
			s: t > 1 && !isFn(fn) ? "pending" : data === false ? "by data" : 0,
			t: t,
			n: name,
			f: fn
		}]
		if (data !== fn) {
			each(data, curry(function(item, i, row) {
				conf.i = i
				i = spliceData[i - 0 + 2] = Object.create(item)
				i.f = curry(i.f, i.r = _isArray(row) ? row : (row = [row]))
				i.n = format(i.n, row, conf)
				if (item.f.length > i.r.length + 2 || i.r.length !== spliceData[2].r.length) throw "Invalid data for: " + i.n
			}, spliceData[2]))
			splicePos += data.length - 1
		}
		tests.splice.apply(tests, spliceData)
		return describe
	}

	function nextCase() {
		var tick
		, args = tests[splicePos = runPos++]
		if (!args) printResult()
		else if (args.t === 1) nextSuite(args)
		else {
			testCase.i = ++totalCases
			if (args.p && args.p !== testSuite) testSuite = args.p
			testCase.indent = testSuite.indent
			testCase.n = (args.t < 3 ? "" : "it " + (args.t < 4 ? "" : "should ")) + args.n
			testCase.errors = []
			testCase.total = testCase.passed = 0
			if (args.s || testSuite.s || argv.length && argv.indexOf("" + totalCases) < 0) {
				skipped++
				if (!argv.length) line("skip", testCase)
				return nextCase()
			}
			Object.assign(testCase, assert)
			testCase.end = end
			testCase.ok = testCase
			testCase.plan = function(planned) {
				testCase.planned = planned
				if (planned <= testCase.total) end()
				return testCase
			}
			testCase.setTimeout = function(ms) {
				_clearTimeout(tick)
				tick = _setTimeout(end, ms, "TIMEOUT: " + ms + "ms")
				return testCase
			}

			try {
				testCase.setTimeout(conf.timeout)
				args = args.f.call(testCase, testCase, (testCase.mock = args.f.length > 1 && new Mock()))
				if (args && args.then) args.then(curry(end, null), end)
			} catch (e) {
				print("" + e)
				end(e)
			}
		}
		function testCase(value, message, actual, expected) {
			testCase.total++
			if (testCase.ended) {
				fail("assertion after end")
			}
			if (value) {
				testCase.passed++
			} else {
				if (message) {
					expected = "expected: " + stringify(expected, conf.cut)
					actual   = "actual:   " + stringify(actual, conf.cut)
					if (conf.color && expected.length > 80) {
						message += "\n" + diff(expected, actual, ["\n", " ", ","], conf.red, conf.reset, conf.green, conf.reset)
					} else {
						message += "\n" + expected + "\n" + actual
					}
				} else {
					message = stringify(value, conf.cut) + " is truthy"
				}
				fail("Assertion:" + testCase.total + ": " + message)
			}
			return testCase.plan(testCase.planned)
		}
		function fail(_err) {
			var row, start, i = 0
			, err = type(_err) != "error" ? _Error(_err) : _err
			, stack = err.stack
			if (stack) {
				// iotjs returns stack as Array
				for (stack = _isArray(stack) ? stack : (stack + "").replace(err, "").split("\n"); (row = stack[++i]); ) {
					if (row.indexOf(conf.file) < 0) {
						if (!start) start = i
					}
					if (i - start >= conf.stack) break
				}
				err = [ err ].concat(stack.slice(start, i)).join("\n")
			}

			if (push(testCase.errors, err) == 1) {
				push(failedCases, testCase)
			}
			if (describe.result) printResult()
			return testCase
		}
		function end(err) {
			_clearTimeout(tick)
			if (err) fail(err)
			if (testCase.ended) return fail("ended multiple times")
			testCase.ended = _Date.now()

			if (testCase.planned != void 0 && testCase.planned !== testCase.total) {
				fail("planned " + testCase.planned + " actual " + testCase.total)
			}
			if (testCase.mock) {
				testCase.n += testCase.mock.txt
				testCase.mock.restore()
			}

			totalAsserts += testCase.total
			passedAsserts += testCase.passed

			line(testCase.errors.length ? "nok" : "ok", testCase)
			if (runPos % 1000) nextCase()
			else _setTimeout(nextCase, 1)
		}
	}
	function nextSuite(newSuite) {
		if (!argv.length) line("suite", newSuite)
		newSuite.p = inSuite
		inSuite = testSuite = newSuite
		if (isFn(testSuite.f)) {
			testSuite.f.call(describe)
		} else if (isObj(testSuite.f)) {
			each(testSuite.f, curry(def, 0))
		}
		inSuite = newSuite.p
		nextCase()
	}
	function printResult() {
		testSuite = null
		conf.total = totalCases
		var testCase
		, nums = []
		, failed = failedCases.length
		conf.fail = describe.failed += failed
		conf.pass = totalCases - conf.fail
		conf.s = skipped
		conf.passAsserts = passedAsserts
		conf.totalAsserts = totalAsserts
		conf.passGreen = conf.fail ? "" : conf.green + conf.bold
		conf.failRed = conf.fail ? conf.red : ""
		conf.timeStr = conf.time ? " in " + (_Date.now() - started) + " ms at " + started.toTimeString().slice(0, 8) : ""
		if (conf.status) _process.exitCode = conf.fail
		if (failed) {
			for (; (testCase = failedCases[--failed]); ) {
				nums[failed] = testCase.i
				print("---")
				line("nok", testCase)
				print(testCase.errors.join("\n"))
			}
			conf.failNums = nums.join(", ")
			print("...")
			line("failSum", conf)
			failedCases.length = 0
		}
		describe.result = line("sum", conf)
		if (skipped) {
			line("skipSum", conf)
		}
		if (describe.onend) describe.onend()
	}

	function This() {
		return this
	}
	function diff(a, b, sep, r1, r2, g1, g2) {
		var del, ins, pre, aLen, bLen
		, aPos = 0
		, bPos = 0
		, out = []

		if (_isArray(sep)) {
			for (del = 0; (ins = sep[del++]) && a.split(ins).length < 3; );
			sep = ins
		}
		sep = sep || ""
		a = a.split(sep)
		b = b.split(sep)

		for (aLen = a.length, bLen = b.length; aPos < aLen || bPos < bLen; aPos++, bPos++) {
			if (a[aPos] !== b[bPos]) {
				for (pre = bPos; b[pre] !== a[aPos] && pre < bLen; pre++);
				pre -= bPos;

				for (del = 0, ins = 0; a[aPos] !== b[bPos] && (aPos < aLen || bPos < bLen); ) {
					if (aPos < aLen) { del++; aPos++; }
					if (bPos < bLen && a[aPos] !== b[bPos]) { ins++; bPos++; }
				}

				if (ins > 0 || del > 0) {
					if (pre > 0 && pre < ins + del) {
						aPos -= del
						bPos -= ins - pre
						del = 0
						ins = pre
					}
					out.push([aPos - del, del, b.slice(bPos - ins, bPos).join(sep)])
				}
			}
		}
		if (r1) {
			for (bPos = 0; (b = out[bPos++]); ) {
				a.splice(b[0], b[1],
					(b[1] ? r1 + a.slice(b[0], b[0] + b[1]).join(sep) + r2 : "") +
					(b[2] ? g1 + b[2] + g2 : "")
				)
			}
			out = a.join(sep)
		}
		return out
	}
	function format(str, obj, fallback) {
		return str.replace(lineRe, function(_, path) {
			return obj[path] != null ? obj[path] :
				(_ = path.split("."))[1] && (obj = obj[_[0]]) && obj[_[1]] != null ? obj[_[1]] :
				fallback[path]
		})
	}
	function line(name, map) {
		return print(format(conf[name], map, conf))
	}
	function opts(argv, defaults) {
		for (var arg, conf = Object.assign({}, defaults), i = argv.length; i; ) {
			arg = argv[--i].split(/=|--(no-)?/)
			if (arg[0] === "") {
				conf[arg[2]] = arg[4] || !arg[1]
				argv.splice(i, 1)
			}
		}
		return conf
	}
	function print(str) {
		if (!str) return
		if (testSuite && testSuite.indent) {
			str = str.split("\n").join("\n" + testSuite.indent)
		}
		describe.output += str + "\n"
		if (describe.onprint) describe.onprint(str)
		if (_global.console && console.log) console.log(str + conf.reset)
		return str
	}

	//  A spy is a wrapper function to verify an invocation
	//  A stub is a spy with replaced behavior
	function Mock() {
		this.txt = ""
		this._r = []
	}
	Mock.prototype = describe.mock = {
		fn: function(origin, behavior) {
			spy.called = 0
			spy.calls = []
			spy.errors = 0
			spy.results = []
			return spy
			function spy() {
				var err = null, key, result
				, args = slice(arguments)
				if (isFn(origin)) {
					try {
						result = origin.apply(this, args)
					} catch(e) {
						spy.errors++
						err = e
					}
				} else if (isObj(origin)) {
					key = stringify(args).slice(1, -1)
					result = hasOwn(origin, key) ? origin[key] : origin["*"]
				} else result = _isArray(origin) ? origin[spy.called % origin.length] : origin
				spy.called++
				push(spy.results, result)
				push(spy.calls, {
					scope: this,
					args: args,
					error: err,
					result: result
				})
				if (type(behavior) === "number") args[behavior].call(this, err, result)
				else return behavior === true ? (err ? Promise.reject(err) : Promise.resolve(result)) : result
			}
		},
		rand: function(seed_) {
			var seed = seed_ || conf.seed
			this.txt += " #seed:" + seed
			this.swap(Math, "random", xorshift128(seed))
		},
		spy: function(obj, name, stub) {
			this.swap(obj, name, this.fn(stub || obj[name]))
		},
		swap: function swap(obj, name, fn) {
			if (isObj(name)) {
				each(name, curry(swap, obj, this))
				return
			}
			var existing = obj[name]
			push(this._r, obj, name, hasOwn(obj, name) && existing)
			obj[name] = fn
			if (fn === fn && obj[name] !== fn) throw _Error("Unable to swap " + stringify(name))
			return existing
		},
		restore: function() {
			for (var arr = this._r, i = arr.length; --i > 0; i -= 2) {
				if (arr[i]) {
					arr[i - 2][arr[i - 1]] = arr[i]
				} else {
					delete arr[i - 2][arr[i - 1]]
				}
			}
		/*** mockTime ***/
			this.tick(_Infinity, true)
		},
		time: function(newTime, newZone) {
			var mock = this
			if (!mock._time) {
				mock._time = fakeNow = _Date.now()
				mock.swap(_global, fakeTimers)
				mock.swap(_process, { nextTick: fakeNextTick, hrtime: fakeHrtime })
			}
			if (newTime) {
				fakeNow = isStr(newTime) ? _Date.parse(newTime) : newTime
				mock.tick(0)
			}
			fakeDate._z = newZone
		},
		tick: function(amount, noRepeat) {
			var t
			, nextNow = type(amount) === "number" ? fakeNow + amount : timers[0] ? timers[0].at : fakeNow

			for (; (t = timers[0]) && t.at <= nextNow; ) {
				fakeNow = t.at
				timers.shift()
				if (isStr(t.fn)) t.fn = Function(t.fn)
				if (isFn(t.fn)) t.fn.apply(null, t.args)
				if (!noRepeat && t.repeat) {
					t.at += t.ms
					fakeTimeout(t)
				}
			}
			fakeNow = nextNow
		/* mockTime end */
		}
	}

	function xorshift128(a) {
		var b = a * 2e3, c = a * 3e4, d = a * 4e5
		return function() {
			var t = d ^ (d << 11)
			d = c; c = b; b = a
			a ^= t ^ (t >>> 8) ^ (a >>> 19)
			return (a >>> 0) / 4294967295
		}
	}

	function _deepEqual(actual, expected, circ) {
		if (
			actual === expected ||
			// make NaN equal to NaN
			actual !== actual && expected !== expected
		) return true

		var key, aKeys, len
		, aType = typeof actual

		if (
			aType !== "object" ||
			actual == null || // jshint ignore:line
			aType !== typeof expected ||
			(aType = type(actual)) != type(expected) ||
			(actual.constructor && actual.constructor !== expected.constructor) ||
			(aType == "date" && actual.getTime() !== expected.getTime()) ||
			(aType == "regexp" && "" + actual !== "" + expected)
		) {
			return false
		}

		key = circ.indexOf(actual)
		if (key > -1) return true
		push(circ, actual)

		if (aType == "array" || aType == "arguments") {
			len = actual.length
			if (len !== expected.length) return false
			for (; len--; ) {
				if (!_deepEqual(actual[len], expected[len], circ)) return false
			}
		} else {
			aKeys = _keys(actual)
			len = aKeys.length
			if (len !== _keys(expected).length) return false
			for (; len--; ) {
				key = aKeys[len]
				if (
					!hasOwn(expected, key) ||
					!_deepEqual(actual[key], expected[key], circ)
				) return false
			}
		}
		return true
	}

	function type(obj) {
		/* jshint -W041 */
		// Standard clearly states that NaN and Infinity are numbers
		// but this is not useful for testing.
		return (
			obj !== obj ? "nan" :
			obj === _Infinity || obj === -_Infinity ? "infinity" :
			obj == null ? "" + obj :
			toStr.call(obj).slice(8, -1).toLowerCase()
		)
	}
	function num(a, b) {
		return type(a -= 0) === "number" ? a : b
	}
	function isStr(str) {
		return typeof str === "string"
	}
	function isFn(fn) {
		return typeof fn === "function"
	}
	function isObj(obj) {
		return type(obj) === "object"
	}
	function own(a, b) {
		if (a === b) {
			own.lastMsg = "Can not be strictEqual"
		} else if (a) {
			for (var k in b) if (hasOwn(b, k)) {
				if (!hasOwn(a, k) || (
					isObj(b[k]) ? !own(a[k], b[k]) :
					!_deepEqual(a[k], b[k], [])
				)) {
					own.lastMsg = own.lastMsg || k + " does not match"
					return false
				}
			}
			return true
		}
	}
	function curry(fn, arg, scope) {
		return fn.bind.apply(fn, [scope].concat(arg))
	}

	function each(arr, fn) {
		if (arr) {
			if (isStr(arr)) arr = arr.split(",")
			for (var i in arr) if (hasOwn(arr, i)) fn(i, arr[i])
		}
	}

	function stringify(item, max) {
		var circ = []
		, cut = max > 5 ? max : _Infinity
		, left = cut
		, str = _stringify(item)
		return str.length > cut ? str.slice(0, cut - 3) + ".." + str.slice(-1) : str
		function _stringify(item) {
			var i, t, tmp
			, str =
				isStr(item) ? JSON.stringify(item) :
				isFn(item) ? ("" + item).replace(/^\w+|\s+|{[\s\S]*/g, "") :
				!item || item === true || typeof item === "number" ? "" + item :
				(t = type(item)) === "error" || t === "symbol" || t === "regexp" ? item.toString() :
				item.toJSON ? item.toJSON() :
				item

			if (!isStr(str)) {
				if (circ.indexOf(str) > -1) return "Circular"
				push(circ, str)
				tmp = []
				for (i in str) if (hasOwn(str, i)) {
					i = (t === "object" ? _stringify(i) + ":" : "") + _stringify(str[i])
					push(tmp, i)
					left -= i.length
					if (left < 0) break
				}
				str =
				t === "array" ? "[" + tmp + "]" :
				t === "arguments" ? t + "[" + tmp + "]" :
				(t = item.constructor) === Object ? "{" + tmp + "}" :
				(t ? t.name || /^\w+\s+([^\s(]+)|/.exec(t)[1] || "<anon>" : "<null>") + "{" + tmp + "}"
			}
			return str
		}
	}
}(this, setTimeout, clearTimeout, Date, Error, Infinity) // jshint ignore:line

