


!function(exports) {
	var tmp, started, testSuite, timerType
	, _global = exports.window || global
	, _process = _global.process || { exit: This }
	, _setTimeout = setTimeout
	, _clearTimeout = clearTimeout
	, _Date = Date
	, isArray = Array.isArray
	, tests = []
	, totalCases = 0
	, failedCases = []
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
	, conf = describe.conf = {
		color: (_process.stdout || exports).isTTY,
		status: 1,
		time: 1,
		trace: 1
	}
	, assert = describe.assert = {
		notOk: function(value, message) {
			return this.ok(!value, message || stringify(value) + " is falsy")
		},
		equal: function(actual, expected, message) {
			return this.ok(
				arguments.length > 1 && _deepEqual(actual, expected, []),
				message || [actual, "equal", expected]
			)
		},
		notEqual: function(actual, expected, message) {
			return this.ok(
				arguments.length > 1 && !_deepEqual(actual, expected, []),
				message || [actual, "notEqual", expected]
			)
		},
		strictEqual: function(actual, expected, message) {
			return this.ok(
				arguments.length > 1 && actual === expected,
				message || [actual, "===", expected]
			)
		},
		notStrictEqual: function(actual, expected, message) {
			return this.ok(
				arguments.length > 1 && actual !== expected,
				message || [actual, "!==", expected]
			)
		},
		skip: function() {
			skipped++
			return this
		},
		throws: function(fn, message) {
			var actual = false
			try {
				fn()
			} catch(e) {
				actual = true
			}
			return this.ok(actual, message || "throws")
		},
		type: function(thing, expected) {
			var actual = type(thing)
			return this.ok(
				actual === expected,
				"type should be " + expected + ", got " + actual
			)
		},
		anyOf: function(a, b) {
			return this.ok(
				isArray(b) && b.indexOf(a) != -1,
				"should be one from " + stringify(b) + ", got " + a
			)
		}
	}
	, toStr = assert.toString
	, hasOwn = assert.hasOwnProperty
	, argv = describe.argv = _process.argv && _process.argv.slice(2) || []
	, argi = argv.length
	, bold = "\x1b[1m"
	, red = "\x1b[31m"
	, green = "\x1b[32m"
	, yellow = "\x1b[33m"
	, reset = "\x1b[0m"

	for (; argi--; ) {
		tmp = argv[argi].split(/[-=]/)
		if (tmp[0] + tmp[1] == "") {
			if (tmp[2] == "no") {
				conf[tmp[3]] = false
			} else {
				conf[tmp[2]] = tmp[3] || true
			}
			argv.splice(argi, 1)
		}
	}

	if (!conf.color) {
		bold = red = green = yellow = reset = ""
	}

	describe.output = ""
	describe.failed = 0

	exports.test = def.bind(exports, 2)
	exports.it = def.bind(exports, 3)

	function def(_, name, fn, opts) {
		tests.splice(++splicePos, 0, arguments)
		arguments.skip =
			_ > 1 && type(fn) != "function" && "pending" ||
			name.charAt(0) === "#" && "by name" ||
			opts && opts.skip
		if (!started) {
			started = new Date()
			print("TAP version 13")
			timerType = type(_setTimeout(nextCase, 1))
		}
		return exports
	}

	function nextCase() {
		var testCase, tick
		, args = tests[splicePos = runPos++]
		if (args == null) printResult()
		else if (args[0] === 1) nextSuite(testSuite = args)
		else {
			testCase = Object.assign({
				num: ++totalCases,
				name: totalCases + (args[0] === 3 ? " - it " : " - ") + args[1],
				total: 0,
				passed: 0,
				errors: [],
				ok: function(value, message) {
					testCase.total++
					if (testCase.ended) {
						fail("Error: assertion after end")
					}
					if (value) {
						testCase.passed++
					} else {
						if (isArray(message)) {
							message = message[1] +
							"\nexpected: " + stringify(message[2], 160) +
							"\nactual:   " + stringify(message[0], 160)
						}

						fail("AssertionError#" + testCase.total + ": " + (message || stringify(value)), Error().stack)
					}
					if (testCase.planned <= testCase.total) {
						endCase()
					}
					return testCase
				},
				plan: function(planned) {
					testCase.planned = planned
					return testCase
				},
				setTimeout: function(ms) {
					_clearTimeout(tick)
					tick = _setTimeout(endCase, ms, "TIMEOUT: " + ms + "ms")
					return testCase
				},
				wait: function() {
					var k
					, obj = this
					, hooks = []
					, hooked = []

					for (k in obj) if (type(obj[k]) == "function") !function(k) {
						hooked.push(k, obj[k])
						obj[k] = function() {
							hooks.push(k, arguments)
							return obj
						}
					}(k)

					return function() {
						if (!hooks) return
						for (var v, scope = obj, i = hooked.length; i--; i--) {
							obj[hooked[i-1]] = hooked[i]
						}
						// i == -1 from previous loop
						for (; v = hooks[++i]; ) {
							scope = scope[v].apply(scope, hooks[++i]) || scope
						}
						hooks = hooked = null
					}
				},
				end: endCase
			}, assert)
			if (args.skip || testSuite && testSuite.skip || argv.length && argv.indexOf("" + totalCases) < 0) {
				skipped++
				if (!argv.length) {
					print("ok " + testCase.name.replace(/#\s*/, "") + " # skip - " + (args.skip || "by suite"))
				}
				return nextCase()
			}

			try {
				testCase.setTimeout(args[3] && args[3].timeout || 999)
				if (type(args[2]) === "function") {
					args[2].call(testCase, testCase, (testCase.mock = args[2].length > 1 && new Mock))
				}
			} catch (e) {
				fail(e, e.stack)
				endCase()
			}
		}
		function fail(message, stack) {
			if (stack) {
				for (var row, start, i = 0, arr = (stack || "").split("\n"); row = arr[++i]; ) {
					if (row.indexOf("/litejs/test/index.js:") < 0) {
						if (!start) start = i
					}
					if (i - start >= conf.trace) break
				}
				message = [ message ].concat(arr.slice(start, i)).join("\n")
			}

			if (testCase.errors.push(message) == 1) {
				failedCases.push(testCase)
			}
			if (describe.result) printResult()
		}
		function endCase(err) {
			_clearTimeout(tick)
			if (err) fail(err)
			if (testCase.ended) return fail("Error: ended multiple times")
			testCase.ended = Date.now()

			if (testCase.planned != void 0 && testCase.planned !== testCase.total) {
				fail("Error: planned " + testCase.planned + " actual " + testCase.total)
			}
			if (testCase.mock) {
				testCase.mock.restore()
			}

			totalAsserts += testCase.total
			passedAsserts += testCase.passed

			print(
				(testCase.errors.length ? "not ok " : "ok ") +
				testCase.name + " [" + testCase.passed + "/" + testCase.total + "]"
			)
			if (runPos % 1000) nextCase()
			else _setTimeout(nextCase, 1)
		}
	}
	function nextSuite(testSuite) {
		if (!argv.length) print("# " + testSuite[1])
		if (type(testSuite[2]) === "function") {
			testSuite[2].call(exports)
		} else if (type(testSuite[2]) === "object") {
			for (var name in testSuite[2]) if (hasOwn.call(testSuite[2], name)) {
				def(2, name, testSuite[2][name])
			}
		}
		nextCase()
	}
	function printResult() {
		print("1.." + totalCases)
		var failed = failedCases.length
		if (failed) {
			describe.failed += failed
			if (conf.status) _process.exitCode = describe.failed
			for (var nums = [], stack = []; testCase = failedCases[--failed]; ) {
				nums[failed] = testCase.num
				// TODO:2020-03-31:lauri:Add test number
				stack[failed] = testCase.name + "\n" + testCase.errors.join("\n")
			}
			print(("---\n" + stack.join("\n---\n") + "\n...").replace(/^/gm, "  "))
			print("#" + red + bold + " FAIL  tests " + nums.join(", "))
			failedCases.length = 0
		}
		print(
			describe.result = "#" + (failed ? "" : green + bold) + " pass  " + (totalCases - describe.failed) + "/" + totalCases
			+ " [" + passedAsserts + "/" + totalAsserts + "]"
			+ (
				conf.time ?
				" in " + (_Date.now() - started) + " ms at " + started.toTimeString().slice(0, 8) :
				""
			)
		)
		if (skipped) {
			print("# " + yellow + bold + "skip  " + skipped)
		}
		if (describe.onend) describe.onend()
	}

	function This() {
		return this
	}
	function print(str) {
		describe.output += str + "\n"
		if (describe.onprint) describe.onprint(str)
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
		if (type(repeat) !== "object") {
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
				var err, key, result
				, args = timers.slice.call(arguments)
				if (type(origin) === "function") {
					try {
						result = origin.apply(this, arguments)
					} catch(e) {
						err = e
					}
				} else if (isArray(origin)) {
					result = origin[spy.called % origin.length]
				} else if (origin && origin.constructor === Object) {
					key = JSON.stringify(args).slice(1, -1)
					result = hasOwn.call(origin, key) ? origin[key] : origin["*"]
				}
				// TODO:2019-09-09:lauri:
				// var spy = assert.spy(Item, "method")
				// assert.equal(spy.callCount, 1)
				spy.called++
				spy.calls.push({
					scope: this,
					args: args,
					error: err,
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
			if (type(existing) === "function") {
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
				fakeNow = type(newTime) === "string" ? _Date.parse(newTime) : newTime
				mock.tick(0)
			}
		},
		tick: function(amount, noRepeat) {
			if (type(amount) === "number") {
				fakeNow += amount
			} else if (timers[0]) {
				fakeNow = timers[0].at
			}

			for (var t; t = timers[0]; ) {
				if (t.at <= fakeNow) {
					timers.shift()
					if (type(t.fn) === "string") t.fn = Function(t.fn)
					if (type(t.fn) === "function") t.fn.apply(null, t.args)
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


