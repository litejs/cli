


!function(exports) {
	var started, testSuite, timerType, inSuite
	, tests = []
	, _global = exports.window || global
	, _process = _global.process || /* c8 ignore next */ { exit: This }
	, _setTimeout = setTimeout
	, _clearTimeout = clearTimeout
	, _Date = Date
	, _Error = Error
	, _isArray = Array.isArray
	, _keys = Object.keys
	, _slice = tests.slice
	, lineRe = /{(\w+)}/g
	, totalCases = 0
	, failedCases = []
	, totalAsserts = 0
	, passedAsserts = 0
	, skipped = 0
	, runPos = 0
	, splicePos = 0
	, describe = exports.describe = curry(def, 1)
	, assert = describe.assert = {
		notOk: function(value, message) {
			return this(!value, message, value, "!=", "falsy")
		},
		equal: function(actual, expected, message) {
			return this(
				arguments.length > 1 && _deepEqual(actual, expected, []),
				message, actual, "equal", expected
			)
		},
		notEqual: function(actual, expected, message) {
			return this(
				arguments.length > 1 && !_deepEqual(actual, expected, []),
				message, actual, "notEqual", expected
			)
		},
		skip: This,
		strictEqual: function(actual, expected, message) {
			return this(
				arguments.length > 1 && actual === expected,
				message, actual, "===", expected
			)
		},
		notStrictEqual: function(actual, expected, message) {
			return this(
				arguments.length > 1 && actual !== expected,
				message, actual, "!==", expected
			)
		},
		own: function(actual, expected, message) {
			own.lastMsg = ""
			return this(own(actual, expected), message || own.lastMsg)
		},
		notOwn: function(actual, expected, message) {
			own.lastMsg = ""
			return this(!own(actual, expected), message || own.lastMsg)
		},
		throws: function(fn, message) {
			var actual = false
			try {
				fn()
			} catch(e) {
				actual = true
			}
			return this(actual, message || "throws")
		},
		type: function(thing, expected) {
			var actual = type(thing)
			return this(actual === expected, 0, actual, "type", expected)
		},
		anyOf: function(a, b) {
			return this(
				_isArray(b) && b.indexOf(a) > -1,
				"should be one from " + stringify(b) + ", got " + a
			)
		}
	}
	, conf = describe.conf = {
		// process.platform === 'win32' -> √×.
		file: (_Error().stack + " /cli/test.js:").match(/\S+?:(?=[:\d)]*$)/m)[0],
		global: "describe,it",
		head: "",
		indent: "  ",
		suite: "{indent}{1}", //➜✺✽❖❣❢•※⁕∅
		ok: "{indent}  {green}✔{reset} {n} #{i} [{passed}/{total}]",
		nok: "{indent}  {red}✘{reset} {n} #{i} [{passed}/{total}]",
		skip: "{indent}  {yellow}∅{reset} {n} #{i}",
		sum: "1..{total}\n#{passGreen} pass  {pass}/{total} [{passAsserts}/{totalAsserts}]{timeStr}",
		failSum: "#{red}{bold} FAIL  tests {failNums}",
		skipSum: "#{yellow}{bold} skip  {skip}",
		bold: "\x1b[1m",
		red: "\x1b[31m",
		green: "\x1b[32m",
		yellow: "\x1b[33m",
		reset: "\x1b[0m",
		color: (_process.stdout || /* c8 ignore next */ _process).isTTY,
		cut: 1500,
		delay: 1,
		seed: (Math.random() * 1e5)|0,
		stack: 4,
		status: 1,
		time: 1,
		timeout: 999,
		total: 0
	}
	, toStr = conf.toString
	, hasOwn = conf.hasOwnProperty
	, argv = _process.argv && _process.argv.slice(2) || /* c8 ignore next */ []
	, arg, argi = argv.length
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
		if (!isObj(repeat)) {
			repeat = {
				id: ++timerId,
				repeat: repeat,
				fn: fn,
				args: _slice.call(arguments, 3),
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
			args: _slice.call(arguments, 1),
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

	describe.describe = describe
	describe.test = curry(def, 2)
	describe.it = curry(def, 3)
	describe.should = curry(def, 4)
	describe.failed = 0
	describe.output = ""
	describe.print = print
	describe.stringify = stringify

	for (; argi; ) {
		arg = argv[--argi].split(/=|--(no-)?/)
		if (arg[0] === "") {
			conf[arg[2]] = arg[4] || !arg[1]
			argv.splice(argi, 1)
		}
	}

	if (conf.global) conf.global.split(",").map(function(key) {
		_global[key] = describe[key]
	})

	function def(_, name, fn) {
		if (!name || isFn(name)) {
			fn = name
			name = "Unnamed Test" + (_ == 1 ? "Suite" : "Case")
		}
		if (!started) {
			started = new _Date()

			if (!conf.color) {
				conf.bold = conf.red = conf.green = conf.yellow = conf.reset = ""
			}

			if (conf.tap) {
				conf.head = "TAP version 13"
				conf.suite = "# {1}"
				conf.ok = conf.skip = "ok {i} - {n} [{passed}/{total}]"
				conf.nok = "not " + conf.ok
				conf.indent = ""
			} else if (conf.brief) {
				conf.suite = conf.ok = conf.indent = ""
				conf.skip = "{yellow}skip {i} - {n}"
				conf.sum = conf.sum.slice(11)
			}

			line("head")
			timerType = type(_setTimeout(nextCase, conf.delay|0))
			if (splicePos === 0 && _ !== 1) def(1)
		}
		tests.splice(++splicePos, 0, {
			parent: inSuite,
			indent: inSuite ? inSuite.indent + (_ > 1 ? "" : conf.indent) : "",
			skip:
				_ > 1 && !isFn(fn) && "pending" ||
				name.charAt(0) === "_" && (name = name.slice(1)) && "by name",
			0: _,
			1: name,
			2: fn
		})
		return describe
	}

	function nextCase() {
		var tick
		, args = tests[splicePos = runPos++]
		if (!args) printResult()
		else if (args[0] === 1) nextSuite(args)
		else {
			testCase.i = ++totalCases
			testCase.indent = testSuite.indent
			testCase.n = (args[0] < 3 ? "" : "it " + (args[0] < 4 ? "" : "should ")) + args[1]
			testCase.errors = []
			testCase.total = testCase.passed = 0
			if (args.skip || testSuite.skip || argv.length && argv.indexOf("" + totalCases) < 0) {
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
				args = args[2].call(testCase, testCase, (testCase.mock = args[2].length > 1 && new Mock()))
				if (args && args.then) args.then(curry(end, null), end)
			} catch (e) {
				print(e)
				end(e)
			}
		}
		function testCase(value, message, actual, op, expected) {
			testCase.total++
			if (testCase.ended) {
				fail("assertion after end")
			}
			if (value) {
				testCase.passed++
			} else {
				fail("Assertion:" + testCase.total + ": " + (message || (
					op ? op +
					"\nexpected: " + stringify(expected) +
					"\nactual:   " + stringify(actual)
					: stringify(value) + " is truthy"
				)))
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

			if (testCase.errors.push(err) == 1) {
				failedCases.push(testCase)
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
		newSuite.parent = inSuite
		inSuite = testSuite = newSuite
		if (isFn(testSuite[2])) {
			testSuite[2].call(describe)
		} else if (isObj(testSuite[2])) {
			for (var name in testSuite[2]) if (hasOwn.call(testSuite[2], name)) {
				def(isObj(testSuite[2][name]) ? 1 : 2, name, testSuite[2][name])
			}
		}
		inSuite = newSuite.parent
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
		conf.skip = skipped
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
	function line(name, map) {
		return print(conf[name].replace(lineRe, function(_, field) {
			return hasOwn.call(map, field) ? map[field] : conf[field]
		}))
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
	Mock.prototype = {
		fn: function(origin) {
			spy.called = 0
			spy.calls = []
			spy.errors = 0
			spy.results = []
			return spy
			function spy() {
				var err, key, result
				, args = _slice.call(arguments)
				if (isFn(origin)) {
					try {
						result = origin.apply(this, arguments)
					} catch(e) {
						spy.errors++
						err = e
					}
				} else if (_isArray(origin)) {
					result = origin[spy.called % origin.length]
				} else if (isObj(origin)) {
					key = JSON.stringify(args).slice(1, -1)
					result = hasOwn.call(origin, key) ? origin[key] : origin["*"]
				} else result = origin
				spy.called++
				spy.results.push(result)
				spy.calls.push({
					scope: this,
					args: args,
					error: err,
					result: result
				})
				return result
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
		swap: function(obj, name, fn) {
			if (isObj(name)) {
				for (fn in name) if (hasOwn.call(name, fn)) {
					this.swap(obj, fn, name[fn])
				}
				return
			}
			var existing = obj[name]
			this._r.push(obj, name, hasOwn.call(obj, name) && existing)
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
			this.tick(Infinity, true)
		},
		time: function(newTime, newZone) {
			var mock = this
			if (!mock._time) {
				mock._time = fakeNow = _Date.now()
				mock.swap(_global, fakeTimers)
				mock.swap(_process, { nextTick: fakeNextTick, hrtime: fakeHrtime })
			}
			if (newTime) {
				fakeNow = type(newTime) === "string" ? _Date.parse(newTime) : newTime
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
				if (type(t.fn) === "string") t.fn = Function(t.fn)
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
		var b = a * 2e3
		, c = a * 3e4
		, d = a * 4e5
		return function() {
			var z, t = d
			t ^= t << 11; t ^= t >>> 8
			d = c; c = b
			z = b = a
			t ^= z; t ^= z >>> 19
			a = t
			return (t >>> 0) / 4294967295
		}
	}

	function _deepEqual(actual, expected, circ) {
		if (
			actual === expected ||
			// null == undefined
			expected === null && actual == expected ||
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
			actual.constructor !== expected.constructor ||
			(aType == "date" && actual.getTime() !== expected.getTime()) ||
			(aType == "regexp" && "" + actual !== "" + expected)
		) {
			return false
		}

		key = circ.indexOf(actual)
		if (key > -1) return true
		circ.push(actual)

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
					!hasOwn.call(expected, key) ||
					!_deepEqual(actual[key], expected[key], circ)
				) return false
			}
		}
		return true
	}

	function type(obj) {
		/* jshint -W041 */
		// Standard clearly states that NaN is a number
		// but this is not useful for testing.
		return obj !== obj ? "nan" : obj == null ? "" + obj : toStr.call(obj).slice(8, -1).toLowerCase()
	}
	function num(a, b) {
		return type(a -= 0) === "number" ? a : b
	}
	function isFn(obj) {
		return type(obj) === "function"
	}
	function isObj(obj) {
		return type(obj) === "object"
	}
	function own(a, b) {
		if (a === b) {
			own.lastMsg = "Can not be strictEqual"
		} else if (a) {
			for (var k in b) if (hasOwn.call(b, k)) {
				if (!hasOwn.call(a, k) || (
					isObj(b[k]) ? !own(a[k], b[k]) :
					_isArray(b[k]) ? b[k].some(function(val, idx) {
						return isObj(val) ? !own(a[k][idx], val) : a[k][idx] !== val
					}) :
					a[k] !== b[k]
				)) {
					own.lastMsg = own.lastMsg || k + " " + stringify(a[k]) + " != " + stringify(b[k])
					return false
				}
			}
			return true
		}
	}
	function curry(fn, arg) {
		return function() {
			return fn.apply(null, [arg].concat(_slice.call(arguments)))
		}
	}

	function stringify(item, maxLen) {
		var max = conf.cut > 0 ? conf.cut : Infinity
		, str = _stringify(item, max, [])
		return str.length > max ? str.slice(0, max - 3) + ".." + str.slice(-1) : str
	}

	function _stringify(item, max, circ) {
		var i, tmp
		, left = max
		, t = type(item)
		, str =
			t === "string" ? JSON.stringify(item) :
			t === "function" ? ("" + item).replace(/^\w+|\s+|{[\s\S]*/g, "") :
			(!item || item === true || t === "error" || t === "number" || t === "regexp") ? "" + item :
			item.toJSON ? item.toJSON() :
			item

		if (typeof str == "object") {
			if (circ.indexOf(str) > -1) return "Circular"
			circ.push(str)
			tmp = []
			for (i in str) if (hasOwn.call(str, i)) {
				i = (t === "object" ? _stringify(i, left) + ":" : "") + _stringify(str[i], left, circ)
				tmp.push(i)
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
}(this) // jshint ignore:line


