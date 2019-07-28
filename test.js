


!function(exports) {
	var tick, started, testSuite, timerType
	, _global = exports.window || global
	, _process = _global.process || {}
	, _setTimeout = setTimeout
	, _clearTimeout = clearTimeout
	, _Date = Date
	, isArray = Array.isArray
	, tests = []
	, totalCases = 0
	, failedCases = []
	, failedStacks = []
	, totalAsserts = 0
	, passedAsserts = 0

	, skipped = 0
	, runPos = 0
	, splicePos = 0
	/*** mockTime */
	, fakeNow
	, timers = []
	, timerId = 0
	, fakeTimers = {
		setTimeout: fakeTimeout.bind(null, false),
		setInterval: fakeTimeout.bind(null, true),
		clearTimeout: fakeClear,
		clearInterval: fakeClear,
		Date: fakeDate
	}
	/* mock time end */
	, describe = exports.describe = def.bind(exports, 1)
	, assert = {
		ok: function assertOk(value, message, _, _stackStart) {
			this.total++
			if (!value) {
				if (!message) {
					message = stringify(value) + " == true"
				} else if (isArray(message)) {
					message = message[1] +
					"\nexpected: " + stringify(message[2], 160) +
					"\nactual:   " + stringify(message[0], 160)
				}
				this.errors.push(new AssertionError(message + " #" + this.total, _stackStart || assertOk))
			}
			if (this.planned <= this.total) {
				this.end()
			}
			return this
		},
		notOk: function notOk(value, message, _, _stackStart) {
			return this.ok(
				!value,
				message || [value, "==", null],
				null,
				_stackStart || notOk
			)
		},
		equal: function assertEqual(actual, expected, message, _stackStart) {
			return this.ok(
				_deepEqual(actual, expected, []),
				message || [actual, "==", expected],
				null,
				_stackStart || assertEqual
			)
		},
		notEqual: function notEqual(actual, expected, message, _stackStart) {
			return this.ok(
				!_deepEqual(actual, expected, []),
				message || [actual, "!=", expected],
				null,
				_stackStart || notEqual
			)
		},
		strictEqual: function strictEqual(actual, expected, message, _stackStart) {
			return this.ok(
				actual === expected,
				message || [actual, "===", expected],
				null,
				_stackStart || strictEqual
			)
		},
		notStrictEqual: function notStrictEqual(actual, expected, message, _stackStart) {
			return this.ok(
				actual !== expected,
				message || [actual, "!==", expected],
				null,
				_stackStart || notStrictEqual
			)
		},
		throws: function assertThrows(fn, message, _, _stackStart) {
			var actual = false
			try {
				fn()
			} catch(e) {
				actual = true
			}
			return this.ok(actual, message || "throws", null, _stackStart || assertThrows)
		},
		type: function assertType(thing, expected, _, _stackStart) {
			var actual = type(thing)
			return this.ok(
				actual === expected,
				"type should be " + expected + ", got " + actual,
				null,
				_stackStart || assertType
			)
		},
		anyOf: function anyOf(a, b, _, _stackStart) {
			return this.ok(
				isArray(b) && b.indexOf(a) != -1,
				"should be one from " + stringify(b) + ", got " + a,
				null,
				_stackStart || anyOf
			)
		}
	}
	, toStr = assert.toString
	, hasOwn = assert.hasOwnProperty
	, argv = describe.argv = _process.argv && _process.argv.slice(2) || []
	, color = (_process.stdout || exports).isTTY && argv.indexOf("--no-color") < 0
	, bold = color ? "\x1b[1m"  : ""
	, red = color ? "\x1b[31m" : ""
	, green = color ? "\x1b[32m" : ""
	, yellow = color ? "\x1b[33m" : ""
	, reset = color ? "\x1b[0m"  : ""

	describe.output = ""

	exports.test = def.bind(exports, 2)
	exports.it = def.bind(exports, 3)
	exports.defineAssert = function defineAssert(key, fn, _skip) {
		assert[key] = _skip !== true ? fn : function skip() {
			skipped++
			return this
		}
		return this
	}

	function def(type, name, fn, opts) {
		tests.splice(++splicePos, 0, arguments)
		arguments.skip = name.charAt(0) === "#" && "by name" || opts && opts.skip
		if (!started) {
			started = new Date()
			print("TAP version 13")
			timerType = typeof _setTimeout(nextCase, 1)
		}
		return exports
	}

	function nextCase() {
		var testCase
		, args = tests[splicePos = runPos++]
		_clearTimeout(tick)
		if (args == null) {
			var failed = failedCases.length
			print("1.." + totalCases)
			if (skipped) {
				print("# " + yellow + bold + "skip  " + skipped)
			}
			print(
				"#" + (failed ? "" : green + bold) + " pass  " + (totalCases - failed) + "/" + totalCases
				+ " [" + passedAsserts + "/" + totalAsserts + "]"
				+ " in " + (_Date.now() - started) + " ms"
				+ " at " + started.toTimeString().slice(0,8)
			)

			if (failed) {
				print("#" + red + bold + " FAILED tests " + failedCases.join(", "))
				print(failedStacks.join("\n").replace(/^/gm, "  "))
			}
		} else if (args[0] === 1) {
			if (!argv.length) print("# " + args[1])
			testSuite = args
			if (typeof args[2] === "function") {
				args[2]()
			}
			nextCase()
		} else {
			totalCases++
			var name = totalCases + (args[0] === 3 ? " - it " : " - ") + args[1]
			if (testSuite && testSuite.skip || args.skip || argv.length && argv.indexOf("" + totalCases) < 0) {
				skipped++
				if (!argv.length) {
					print("ok " + name.replace(/#\s*/, "") + " # skip - " + (args.skip || "by suite"))
				}
				return nextCase()
			}
			testCase = Object.assign({
				total: 0,
				passed: 0,
				errors: [],
				plan: function(planned) {
					testCase.planned = planned
					return testCase
				},
				setTimeout: function(ms) {
					_clearTimeout(tick)
					tick = _setTimeout(endCase, ms, "TIMEOUT " + ms + "ms")
					return testCase
				},
				end: function() {
					if (testCase.ended) {
						throw Error("ended multiple times")
					}
					testCase.ended = Date.now()
					endCase()
				}
			}, assert)

			try {
				testCase.setTimeout(args[3] && args[3].timeout || 5000)
				if (typeof args[2] === "function") {
					args[2](testCase, (testCase.mock = args[2].length > 1 && new Mock))
				}
			} catch (e) {
				endCase("INVALID TEST " + e.stack)
			}
		}
		function endCase(err) {
			if (err) {
				testCase.errors.push(err)
			}
			if (testCase.planned != void 0 && testCase.planned !== testCase.total) {
				testCase.errors.push("Planned " + testCase.planned + " actual " + testCase.total)
			}
			if (testCase.mock) {
				testCase.mock.restore()
			}

			var failed = testCase.errors.length
			if (failed) {
				failedCases.push(totalCases)
				failedStacks.push("---\n" + name + "\n" + testCase.errors.join("\n") + "\n...")
			}

			totalAsserts += testCase.total
			passedAsserts += testCase.total - failed

			print(
				(failed ? "not ok " : "ok ") +
				name + " [" + (testCase.total - failed) + "/" + testCase.total + "]"
			)
			if (runPos % 1000) nextCase()
			else _setTimeout(nextCase, 1)
		}
	}



	function This() {
		return this
	}
	function print(str) {
		describe.output += str + "\n"
		if (console.log) console.log(str + reset)
	}

	if (_global.setImmediate) {
		fakeTimers.setImmediate = fakeNextTick
		fakeTimers.clearImmediate = fakeClear
	}
	function fakeDate(year, month, date, hr, min, sec, ms) {
		return (
			arguments.length > 1 ?
			new _Date(year|0, month|0, date||1, hr|0, min|0, sec|0, ms|0) :
			new _Date(year || Math.floor(fakeNow))
		)
	}
	fakeDate.now = function() {
		return Math.floor(fakeNow)
	}
	fakeDate.parse = _Date.parse
	function fakeHrtime(time) {
		var diff = isArray(time) ? fakeNow - (time[0] * 1e3 + time[1] / 1e6) : fakeNow
		return [Math.floor(diff / 1000), Math.round((diff % 1e3) * 1e3) * 1e3] // [seconds, nanoseconds]
	}

	function fakeTimeout(repeat, fn, ms) {
		if (typeof repeat !== "object") {
			repeat = {
				id: ++timerId,
				repeat: repeat,
				fn: fn,
				args: timers.slice.call(arguments, 3),
				at: fakeNow + ms,
				ms: ms
			}
		}
		for (var i = timers.length; i--; ) {
			if (timers[i].at <= repeat.at) break
		}
		timers.splice(i + 1, 0, repeat)
		return timerType == "number" ? repeat.id : {
			id: repeat.id,
			unref: This
		}
	}

	function fakeNextTick(fn) {
		fakeTimeout({
			id: ++timerId,
			fn: fn,
			args: timers.slice.call(arguments, 1),
			at: fakeNow - 1
		})
	}

	function fakeClear(id) {
		if (id != null) for (var i = timers.length; i--; ) {
			if (timers[i].id === id || timers[i].id === id.id) {
				timers.splice(i, 1)
				break
			}
		}
	}

	//  A spy is a wrapper function to verify an invocation
	//  A stub is a spy with replaced behavior
	function Mock() {
		var mock = this
		mock.replaced = []
	}
	Mock.prototype = {
		fn: function(origin) {
			spy.called = 0
			spy.calls = []
			return spy
			function spy() {
				var key, result
				, args = timers.slice.call(arguments)
				if (typeof origin === "function") {
					result = origin.apply(this, arguments)
				} else if (isArray(origin)) {
					result = origin[spy.called % origin.length]
				} else if (origin && origin.constructor === Object) {
					key = JSON.stringify(args).slice(1, -1)
					result = hasOwn.call(origin, key) ? origin[key] : origin["*"]
				}
				spy.called++
				spy.calls.push({
					scope: this,
					args: args,
					result: result
				})
				return result
			}
		},
		map: function(obj, stubs, justStubs) {
			var key
			, mock = this
			, obj2 = justStubs ? stubs : obj
			for (key in obj2) {
				mock.spy(obj, key, stubs && stubs[key])
			}
			if (obj.prototype) {
				mock.map(obj.prototype, stubs)
			}
		},
		replace: function(obj, name, fn) {
			var mock = this
			, existing = obj[name]
			if (typeof existing === "function") {
				mock.replaced.push(obj, name, hasOwn.call(obj, name) && existing)
				obj[name] = fn
			}
			return existing
		},
		spy: function(obj, name, stub) {
			var mock = this
			mock.replace(obj, name, mock.fn(stub || obj[name]))
		},
		time: function(newTime) {
			var key
			, mock = this
			if (!mock.timeFreeze) {
				mock.timeFreeze = fakeNow = _Date.now()
				for (key in fakeTimers) {
					mock.replace(_global, key, fakeTimers[key])
				}
				if (_process.nextTick) {
					mock.replace(_process, "nextTick", fakeNextTick)
					mock.replace(_process, "hrtime", fakeHrtime)
				}
			}
			if (newTime) {
				fakeNow = typeof newTime === "string" ? _Date.parse(newTime) : newTime
				mock.tick(0)
			}
		},
		tick: function(amount, noRepeat) {
			if (typeof amount === "number") {
				fakeNow += amount
			} else if (timers[0]) {
				fakeNow = timers[0].at
			}

			for (var t; t = timers[0]; ) {
				if (t.at <= fakeNow) {
					timers.shift()
					if (typeof t.fn === "string") t.fn = Function(t.fn)
					if (typeof t.fn === "function") t.fn.apply(null, t.args)
					if (!noRepeat && t.repeat) {
						t.at += t.ms
						fakeTimeout(t)
					}
				} else {
					break
				}
			}
		},
		restore: function() {
			var arr = this.replaced
			, i = arr.length
			for (; --i > 0; i -= 2) {
				if (arr[i]) {
					arr[i - 2][arr[i - 1]] = arr[i]
				} else {
					delete arr[i - 2][arr[i - 1]]
				}
			}
			if (timers.length) {
				this.tick(Infinity, true)
			}
		}
	}



	function AssertionError(message, _stackStart) {
		this.name = "AssertionError"
		this.message = message
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, _stackStart || AssertionError)
		} else {
			this.stack = this.toString() + "\n" + (new Error()).stack
		}
	}
	AssertionError.prototype = Object.create(Error.prototype)


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
			actual == null ||
			aType !== typeof expected ||
			(aType = type(actual)) != type(expected) ||
			actual.constructor !== expected.constructor ||
			(aType == "date" && actual.getTime() !== expected.getTime()) ||
			(aType == "regexp" && ""+actual !== ""+expected)
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
			aKeys = Object.keys(actual)
			len = aKeys.length
			if (len !== Object.keys(expected).length) return false
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
		// Standard clearly states that NaN is a number
		// but this is not useful for testing.
		return obj !== obj ? "nan" : toStr.call(obj).slice(8, -1).toLowerCase()
	}

	function stringify(item, maxLen) {
		var max = maxLen > 9 ? maxLen : 70
		, str = _stringify(item, max, [])
		return str.length > max ? str.slice(0, max - 3) + ".." + str.slice(-1) : str
	}

	function _stringify(item, max, circ) {
		var i, tmp
		, left = max
		, t = type(item)
		, str =
			t === "string" ? JSON.stringify(item) :
			t === "function" ? ("" + item).split(/n | *\{/)[1] :
			(!item || t === "number" || t === "regexp" || item === true) ? "" + item :
			item.toJSON ? item.toJSON() :
			item

		if (typeof str == "object") {
			if (circ.indexOf(str) > -1) return "[Circular]"
			circ.push(str)
			tmp = []
			for (i in str) if (hasOwn.call(str, i)) {
				i = (t === "object" ? i + ":" : "") + _stringify(str[i], left, circ)
				tmp.push(i)
				left -= i.length
				if (left < 0) break
			}
			str =
			t === "array" ? "[" + tmp + "]" :
			t === "arguments" ? t + "[" + tmp + "]" :
			"{" + tmp + "}"

			if (t === "object" && item.constructor !== Object) {
				str = item.constructor.name + str
			}
		}

		return str
	}
}(this)


