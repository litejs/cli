


!function(exports) {
	var started, testSuite, timerType, inSuite
	, _global = exports.window || global
	, _process = _global.process || /* istanbul ignore next */ { exit: This }
	, _setTimeout = setTimeout
	, _clearTimeout = clearTimeout
	, _Date = Date
	, _isArray = Array.isArray
	, lineRe = /{(\w+)}/g
	, tests = []
	, totalCases = 0
	, failedCases = []
	, totalAsserts = 0
	, passedAsserts = 0
	, skipped = 0
	, runPos = 0
	, splicePos = 0
	, describe = exports.describe = def.bind(describe, 1)
	, assert = describe.assert = {
		notOk: function(value, message) {
			return this.ok(!value, message || stringify(value) + " !== falsy")
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
		skip: This,
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
		own: function(actual, expected, message) {
			return this.ok(own(actual, expected), message || own.lastMsg)
		},
		notOwn: function(actual, expected, message) {
			return this.ok(!own(actual, expected), message || own.lastMsg)
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
			return this.ok(actual === expected, [expected, "type", actual])
		},
		anyOf: function(a, b) {
			return this.ok(
				_isArray(b) && b.indexOf(a) > -1,
				"should be one from " + stringify(b) + ", got " + a
			)
		}
	}
	, conf = describe.conf = {
		// process.platform === 'win32' -> √×.
		file: (Error().stack + " /cli/test.js:").match(/\S+?:(?=[:\d)]*$)/m)[0],
		global: "describe",
		cut: 160,
		head: "",
		indent: "  ",
		suite: "{1}", //➜✺✽❖❣❢•※⁕∅
		ok: "  {green}✔{reset} {name} #{num} [{passed}/{total}]",
		nok: "  {red}✘{reset} {name} #{num} [{passed}/{total}]",
		skip: "  {yellow}∅{reset} {name} #{num}",
		sum: "1..{total}\n#{passGreen} pass  {pass}/{total} [{passAsserts}/{totalAsserts}]{timeStr}",
		failSum: "#{red}{bold} FAIL  tests {failNums}",
		skipSum: "#{yellow}{bold} skip  {skip}",
		bold: "\x1b[1m",
		red: "\x1b[31m",
		green: "\x1b[32m",
		yellow: "\x1b[33m",
		reset: "\x1b[0m",
		color: (_process.stdout || /* istanbul ignore next */ _process).isTTY,
		seed: (Math.random() * 1e5)|0,
		delay: 1,
		status: 1,
		time: 1,
		timeout: 999,
		trace: 3
	}
	, toStr = conf.toString
	, hasOwn = conf.hasOwnProperty
	, argv = describe.argv = _process.argv && _process.argv.slice(2) || /* istanbul ignore next */ []
	, arg, argi = argv.length
	/*** mockTime ***/
	, fakeNow
	, tmpDate = new _Date()
	, timers = []
	, timerId = 0
	, fakeTimers = {
		setTimeout: fakeTimeout.bind(null, false),
		setInterval: fakeTimeout.bind(null, true),
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
				args: timers.slice.call(arguments, 3),
				at: fakeNow + ms,
				ms: ms
			}
		}
		for (var i = timers.length; i-- && !(timers[i].at <= repeat.at);); // jshint ignore:line
		timers.splice(i + 1, 0, repeat)
		return timerType == "number" ? /* istanbul ignore next */ repeat.id : {
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
		if (id) for (var i = timers.length; i--; ) {
			if (timers[i].id === id || timers[i].id === id.id) {
				timers.splice(i, 1)
				break
			}
		}
	}
	/* mockTime end */

	for (; argi--; ) {
		arg = argv[argi].split(/=|--(no-)?/)
		if (arg[0] === "") {
			conf[arg[2]] = arg[4] || !arg[1]
			argv.splice(argi, 1)
		}
	}

	describe.describe = describe
	describe.test = def.bind(describe, 2)
	describe.it = def.bind(describe, 3)
	describe.should = def.bind(describe, 4)
	describe.failed = 0
	describe.output = ""
	describe.print = print
	describe.stringify = stringify

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
				conf.ok = conf.skip = "ok {num} - {name} [{passed}/{total}]"
				conf.nok = "not " + conf.ok
				conf.indent = ""
			} else if (conf.brief) {
				conf.suite = conf.ok = conf.indent = ""
				conf.skip = "{yellow}skip {num} - {name}"
				conf.sum = conf.sum.slice(11)
			}

			line("head")
			timerType = type(_setTimeout(nextCase, conf.delay|0))
			if (splicePos === 0 && _ !== 1) def(1)
		}
		tests.splice(++splicePos, 0, {
			parent: inSuite,
			indent: inSuite ? inSuite.indent + conf.indent : "",
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
		var testCase, tick
		, args = tests[splicePos = runPos++]
		if (!args) printResult()
		else if (args[0] === 1) nextSuite(testSuite = args)
		else {
			testCase = Object.assign({
				num: ++totalCases,
				name: (args[0] === 4 ? "it should " : args[0] === 3 ? "it " : "") + args[1],
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
						if (_isArray(message)) {
							message = message[1] +
							"\nexpected: " + stringify(message[2]) +
							"\nactual:   " + stringify(message[0])
						}

						fail("AssertionError#" + testCase.total + ": " + (message || stringify(value)), Error().stack)
					}
					return testCase.plan(testCase.planned)
				},
				plan: function(planned) {
					testCase.planned = planned
					if (planned <= testCase.total) {
						endCase()
					}
					return testCase
				},
				setTimeout: function(ms) {
					_clearTimeout(tick)
					tick = _setTimeout(endCase, ms, "TIMEOUT: " + ms + "ms")
					return testCase
				},
				end: endCase
			}, assert)
			if (args.skip || testSuite.skip || argv.length && argv.indexOf("" + totalCases) < 0) {
				skipped++
				if (!argv.length) {
					line("skip", testCase)
				}
				return nextCase()
			}

			try {
				testCase.setTimeout(conf.timeout)
				args[2].call(testCase, testCase, (testCase.mock = args[2].length > 1 && new Mock()))
			} catch (e) {
				console.log(e)
				fail(e, e.stack)
				endCase()
			}
		}
		function fail(message, stack) {
			if (stack) {
				// iotjs returns stack as Array
				for (var row, start, i = 0, arr = _isArray(stack) ? /* istanbul ignore next */ stack : (stack + "").split("\n"); (row = arr[++i]); ) {
					if (row.indexOf(conf.file) < 0) {
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
			testCase.ended = _Date.now()

			if (testCase.planned != void 0 && testCase.planned !== testCase.total) {
				fail("Error: planned " + testCase.planned + " actual " + testCase.total)
			}
			if (testCase.mock) {
				testCase.name += testCase.mock.txt
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
		var failed = failedCases.length
		conf.total = totalCases
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
			for (var nums = []; (testCase = failedCases[--failed]); ) {
				nums[failed] = testCase.num
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
		if (testSuite && testSuite.indent) str = testSuite.indent + str.split("\n").join("\n" + testSuite.indent)
		describe.output += str + "\n"
		if (describe.onprint) describe.onprint(str)
		if (console.log) console.log(str + conf.reset)
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
			spy.errors = 0
			spy.calls = []
			spy.results = []
			return spy
			function spy() {
				var err, key, result = origin
				, args = timers.slice.call(arguments)
				if (isFn(origin)) {
					try {
						result = origin.apply(this, arguments)
					} catch(e) {
						err = e
					}
				} else if (_isArray(origin)) {
					result = origin[spy.called % origin.length]
				} else if (isObj(origin)) {
					key = JSON.stringify(args).slice(1, -1)
					result = hasOwn.call(origin, key) ? origin[key] : origin["*"]
				}
				spy.called++
				if (err) spy.errors++
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
			if (fn === fn && obj[name] !== fn) throw Error("Unable to swap " + name)
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
			var key
			, mock = this
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
			if (type(amount) === "number") {
				fakeNow += amount
			} else if (timers[0]) {
				fakeNow = timers[0].at
			}

			for (var t; (t = timers[0]) && t.at <= fakeNow; ) {
				timers.shift()
				if (type(t.fn) === "string") t.fn = Function(t.fn)
				if (isFn(t.fn)) t.fn.apply(null, t.args)
				if (!noRepeat && t.repeat) {
					t.at += t.ms
					fakeTimeout(t)
				}
			}
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
		} else {
			for (var k in b) if (hasOwn.call(b, k)) {
				if (
					!hasOwn.call(a, k) ||
					(isObj(b[k]) ? !own(a[k], b[k]) : a[k] !== b[k])
				) {
					own.lastMsg = k + " " + stringify(a[k]) + " != " + stringify(b[k])
					return false
				}
			}
			return true
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
			(!item || t === "number" || t === "regexp" || item === true) ? "" + item :
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
			"{" + tmp + "}"

			if (t === "object" && item.constructor !== Object) {
				str = (item.constructor && item.constructor.name || "Null") + str
			}
		}

		return str
	}
}(this) // jshint ignore:line


