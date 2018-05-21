

!function(exports) {
	var doneTick, lastSuite, lastCase, started, ended
	, Fn = require("../lib/fn").Fn
	, assert = require("./assert")
	, nativeTimeout = setTimeout
	, nativeClearTimeout = clearTimeout
	, nativeDate = Date
	, empty = {}
	, hasOwn = empty.hasOwnProperty
	, proc = typeof process == "undefined" ? { argv: [] } : process
	, color = (proc.stdout || empty).isTTY && proc.argv.indexOf("--no-color") == -1
	, totalCases = 0
	, failedCases = 0
	, skipCases = 0
	, lastAssert = 0
	, skipAssert = 0
	, passedAsserts = 0
	, bold      = color ? "\x1b[1m"  : ""
	, italic    = color ? "\x1b[3m"  : ""
	, strike    = color ? "\x1b[9m"  : ""
	, underline = color ? "\x1b[4m"  : ""
	, red       = color ? "\x1b[31m" : ""
	, green     = color ? "\x1b[32m" : ""
	, yellow    = color ? "\x1b[33m" : ""
	, reset     = color ? "\x1b[0m"  : ""


	exports.defineAssert = defineAssert
	exports.describe = describe
	exports.test = function(name, next) {
		return describe().test(name, next)
	}


	function TestSuite(name) {
		lastSuite = this
		checkEnd(lastAssert)
		if (!started) {
			started = nativeDate.now()
			print("TAP version 13")
		}
		if (lastCase && !lastCase.ended) {
			lastCase.end()
		}
		print("# " + (name || "{unnamed test suite}"))
	}

	TestSuite.prototype = {
		wait: Fn.hold,
		describe: describe,
		it: function(name, next, opts) {
			return this.test("it " + name, next, opts)
		},
		test: function(name, next, opts) {
			if (lastCase && !lastCase.ended) {
				lastCase.end()
			}
			if (typeof name === "function") {
				next = name
				name = ""
			}
			if (typeof next !== "function") {
				opts = next
				next = null
			}
			var testSuite = this
			, testCase = lastCase = new TestCase(name, opts)
			checkEnd()

			;["describe", "it", "test"].forEach(function(name) {
				testCase[name] = function() {
					return testSuite[name].apply(testSuite, arguments)
				}
			})

			if (next) {
				nativeClearTimeout(doneTick)
				testCase.setTimeout()
				testCase.resume = testSuite.wait()
				next(
					testCase,
					(testCase.mock = next.length > 1 && new Mock)
				)
				return testSuite
			}

			return testCase
		},
		_test: This
	}

	function TestCase(name, opts) {
		var testCase = this
		, opts = testCase.opts = opts || {}
		testCase.name = (++totalCases) + " - " + (name || "{unnamed test case}")
		testCase.failed = []
		testCase.passedAsserts = 0
		testCase.totalAsserts = 0

		return testCase
	}

	TestCase.prototype = {
		plan: function(num) {
			this.planned = num
			return this
		},
		setTimeout: function(ms) {
			var testCase = this
			nativeClearTimeout(testCase.timeout)
			testCase.timeout = nativeTimeout(function() {
				throw Error("Timeout on running '" + testCase.name + "'")
			}, ms || 5000)
			return testCase
		},
		end: function() {
			var testCase = this
			, name = testCase.name
			, n = "\n  "

			if (testCase.ended) {
				failedCases++
				throw Error("'" + name + "' ended multiple times")
			}

			testCase.ended = nativeDate.now()
			name += " [" + testCase.passedAsserts + "/" + testCase.totalAsserts + "]"

			if (testCase.opts.skip) {
				skipCases++
				return print("ok " + name + " # skip - " + testCase.opts.skip)
			}

			if (testCase.planned != void 0 && testCase.planned !== testCase.totalAsserts) {
				testCase.failed.push("Planned " + testCase.planned + " actual " + testCase.totalAsserts)
			}

			if (testCase.failed.length) {
				failedCases++
				print("not ok " + name + n + "---\n" + testCase.failed.join("\n").replace(/^/gm, "  ") + n + "...")
			} else {
				print("ok " + name)
			}
			if (testCase.timeout) {
				nativeClearTimeout(testCase.timeout)
				testCase.timeout = null
				if (testCase.mock) {
					testCase.mock.restore()
				}
				testCase.resume()
				checkEnd()
			}
		}
	}

	Object.keys(assert).forEach(defineAssert)

	chainable(TestSuite, TestCase)

	// Terminology
	//  - A spy is a wrapper function to verify an invocation
	//  - A stub is a spy with replaced behavior.
	var fakeNow
	, timers = []
	, timerId = 0
	, fakeTimers = {
		setTimeout: fakeTimeout.bind(null, false),
		setInterval: fakeTimeout.bind(null, true),
		clearTimeout: fakeClear,
		clearInterval: fakeClear,
		Date: fakeDate
	}
	if (global.setImmediate) {
		fakeTimers.setImmediate = fakeNextTick
		fakeTimers.clearImmediate = fakeClear
	}
	function fakeDate(year, month, date, hr, min, sec, ms) {
		return (
			arguments.length > 1 ?
			new nativeDate(year|0, month|0, date||1, hr|0, min|0, sec|0, ms|0) :
			new nativeDate(year || Math.floor(fakeNow))
		)
	}
	fakeDate.now = function() {
		return Math.floor(fakeNow)
	}
	fakeDate.parse = nativeDate.parse
	// [seconds, nanoseconds]
	function fakeHrtime(time) {
		var diff = Array.isArray(time) ? fakeNow - (time[0] * 1e3 + time[1] / 1e6) : fakeNow
		return [Math.floor(diff / 1000), Math.round((diff % 1e3) * 1e3) * 1e3]
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
		return repeat.id
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
		for (var i = timers.length; i--; ) {
			if (timers[i].id === id) {
				timers.splice(i, 1)
				break
			}
		}
	}

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
				var fn, result
				, args = spy.calls.slice.call(arguments)
				if (typeof origin === "function") {
					result = origin.apply(this, arguments)
				} else if (Array.isArray(origin)) {
					result = origin[spy.called % origin.length]
				} else if (origin && origin.constructor === Object) {
					result = origin[JSON.stringify(args).slice(1,-1)]
					fn = typeof origin.fn === "function" ? origin.fn : typeof result === "function" ? result : null
					if (fn) {
						result = fn.call(this, result)
					}
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
			if (typeof obj[name] === "function") {
				mock.replaced.push(obj, name, hasOwn.call(obj, name) && obj[name])
				obj[name] = fn
			}
		},
		spy: function(obj, name, stub) {
			var mock = this
			mock.replace(obj, name, mock.fn(stub || obj[name]))
		},
		time: function(newTime) {
			var key
			, mock = this
			if (!mock.timeFreeze) {
				mock.timeFreeze = fakeNow = nativeDate.now()
				for (key in fakeTimers) {
					mock.replace(global, key, fakeTimers[key])
				}
				if (proc.nextTick) {
					mock.replace(proc, "nextTick", fakeNextTick)
					mock.replace(proc, "hrtime", fakeHrtime)
				}
			}
			if (newTime) {
				fakeNow = typeof newTime === "string" ? nativeDate.parse(newTime) : newTime
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
			var mock = this
			, replaced = mock.replaced
			, i = replaced.length
			for (; --i > 0; i -= 2) {
				if (replaced[i]) {
					replaced[i - 2][replaced[i - 1]] = replaced[i]
				} else {
					delete replaced[i - 2][replaced[i - 1]]
				}
			}
			if (timers.length) {
				mock.tick(Infinity, true)
			}
		}
	}

	function print(str) {
		console.log(str + reset)
	}

	function describe(name) {
		return lastSuite && lastSuite !== this ? lastSuite.describe(name) : new TestSuite(name)
	}

	function checkEnd() {
		var curSuite = lastSuite
		, curCase = lastCase
		, curAssert = lastAssert

		nativeClearTimeout(doneTick)
		doneTick = setTimeout(function() {
			if (curAssert === lastAssert && curCase === lastCase && lastCase && !lastCase.timeout && curSuite == lastSuite) {
				if (!lastCase.ended) {
					lastCase.end()
				}
				end()
			}
		}, 1)
	}

	function end(next) {
		if (ended) {
			throw Error("ended in multiple times")
		}
		nativeClearTimeout(doneTick)
		ended = nativeDate.now()

		print("1.." + totalCases)

		if (skipAssert) {
			print("# " + yellow + bold + "skip  " + skipCases + "/" + skipAssert)
		}

		print("#" + (failedCases ? "" : green + bold) + " pass  " + (totalCases - failedCases)
			+ "/" + totalCases
			+ " [" + passedAsserts + "/" + lastAssert + "]"
			+ " in " + (ended - started) + " ms")

		failedCases && print("#" + red + bold + " fail  " + failedCases
			+ " [" + (lastAssert - passedAsserts) + "]")

		if (typeof next == "function") next()
		/*
		* FAILED tests 1, 3, 6
		* Failed 3/6 tests, 50.00% okay
		* PASS 1 test executed in 0.023s, 1 passed, 0 failed, 0 dubious, 0 skipped.
		*/
	}

	function defineAssert(key, fn, _skip) {
		if (!assert[key]) {
			assert[key] = fn
		}
		TestSuite.prototype["_" + key] = TestCase.prototype["_" + key] = skip
		TestSuite.prototype[key] = _skip === true ? skip : function() {
			var testCase = this.test("", null)
			return testCase[key].apply(testCase, arguments)
		},
		TestCase.prototype[key] = _skip === true ? skip : assertWrapper
		function assertWrapper(a, b, c) {
			var testCase = this
			if (testCase.opts.skip) {
				return skip.call(testCase)
			}
			lastAssert++
			if (!testCase.timeout) checkEnd()
			testCase.totalAsserts++
			try {
				assert[key].call(assert, a, b, c, assertWrapper)
				passedAsserts++
				testCase.passedAsserts++
			} catch(e) {
				testCase.failed.push(testCase.opts.noStack ? e.message : e.stack)
			}
			if (testCase.planned != null && testCase.planned <= testCase.totalAsserts) {
				testCase.end()
			}
			return testCase
		}
		return this
	}

	function chainable() {
		var a
		, arr = []
		, j, i = 0
		for (; a = arguments[i++]; ) {
			arr.push.apply(arr, Object.keys(a.prototype))
		}
		for (i = 0; a = arguments[i++]; ) {
			for (j = arr.length; j--; ) {
				if (!a.prototype[arr[j]]) {
					a.prototype[arr[j]] = This
				}
			}
		}
	}

	function skip() {
		skipAssert++
		return this
	}

	function This() {
		return this
	}

	describe.diff = diff
	describe.colorDiff = colorDiff

	function colorDiff(a, b) {
		var res = diff(a, b)
		console.log(
			a.slice(0, res[0]) +
			bold + red + strike + a.slice(res[0], res[0] + res[1]) +
			green + b.slice(res[0], res[0]+res[2]) +
			reset + a.slice(res[0] + res[1])
		)
	}

	function diff(a, b, re) {
		var c = 0, d = a.length, e = b.length
		for (; a.charAt(c) && a.charAt(c) == b.charAt(c); c++);
		for (; d > c && e > c && a.charAt(d - 1) == b.charAt(e - 1); d--) e--;
		return [c, d - c, e - c]
	}
}(this)


/*
* http://sourceforge.net/projects/portableapps/files/
*/

