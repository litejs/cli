

!function(exports) {
	var doneTick, lastSuite, lastCase, started, ended
	, Fn = require("../lib/fn").Fn
	, assert = require("../lib/assert")
	, empty = {}
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
			started = +new Date()
			print("TAP version 13")
		}

		print("# " + (name || "{unnamed test suite}"))
	}

	TestSuite.prototype = {
		wait: Fn.hold,
		describe: describe,
		it: function(name, opts) {
			return this.test("it " + name, null, opts)
		},
		test: function(name, next, opts) {
			if (lastCase && !lastCase.ended) {
				lastCase.end()
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
				clearTimeout(doneTick)
				testCase.setTimeout()
				testCase.resume = testSuite.wait()
				next(testCase)
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
			clearTimeout(testCase.timeout)
			testCase.timeout = setTimeout(function() {
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

			testCase.ended = new Date()
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
				print("not ok " + name + n + "---" + n + testCase.failed.join(n) + n + "...")
			} else {
				print("ok " + name)
			}
			if (testCase.timeout) {
				clearTimeout(testCase.timeout)
				testCase.timeout = null
				testCase.resume()
				checkEnd()
			}
		}
	}

	Object.keys(assert).forEach(defineAssert)

	chainable(TestSuite, TestCase)

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

		clearTimeout(doneTick)
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
		clearTimeout(doneTick)
		ended = +new Date()

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

	function defineAssert(key, fn) {
		if (!assert[key]) {
			assert[key] = fn
		}
		TestSuite.prototype["_" + key] = TestCase.prototype["_" + key] = skip
		TestSuite.prototype[key] = function() {
			var testCase = this.test("", null)
			return testCase[key].apply(testCase, arguments)
		},
		TestCase.prototype[key] = assertWrapper
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

