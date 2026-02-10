

describe("test.js", function() {

	function Dog() {
		this.woofed = this.barked = 0
	}
	var dog = new Dog()
	, Dog$bark = Dog.prototype.bark = function(count) { return this.barked += count }
	, Dog$woof = Dog.prototype.woof = function() { return this.woofed++ }
	, Dog$sit = Dog.prototype.sit = function() {}

	it("should test types", function(assert, mock) {
		mock.swap(Object.prototype, "foo", "bar")
		var undef, tmp, len, i, j
		, count = 0
		, args = (function(){return arguments})(1, "2")
		, date = new Date()
		, date0 = new Date(0)
		, re = /re/
		, obj1 = {a:"A"}
		, obj2 = {a:"B"}
		, obj3 = {b:"A"}
		, circ1 = {a:"D"}
		, circ2 = {a:"D"}
		, types = [
			"string",    '"0"',                             "0",
			"string",    '"null"',                          "null",
			"string",    '"undefined"',                     String("undefined"),
			"string",    '"1"',                             String(1),
			"number",    '0',                               0,
			"number",    '1',                               1,
			"number",    '-1',                              -1,
			"number",    '3',                               Number(3),
			"number",    '4',                               Number("4"),
			"infinity",  'Infinity',                        Infinity,
			"infinity",  '-Infinity',                       -Infinity,
			"boolean",   'true',                            true,
			"boolean",   'false',                           Boolean(false),
			"date",      '1970-01-01T00:00:00.000Z',        date0,
			"error",     'Error: 5',                        Error("5"),
			"error",     'Error',                           Error(""),
			"regexp",    '/re/',                            re,
			"null",      'null',                            null,
			"nan",       'NaN',                             NaN,
			"object",    '{}',                              {},
			"object",    '<null>{}',                        Object.create(null),
			"object",    '{"a":1}',                         {a:1},
			"object",    '<anon>{}',                        new (function(){}),
			"object",    'User{"name":"test1"}',            new User("test1"),
			"object",    'Item{"id":1}',                    new Item(1),
			"object",    'Model{"id":2}',                   new Model(2),
			"array",     '[]',                              [],
			"array",     '[1]',                             [1],
			"array",     '[1,"2"]',                         [1,"2"],
			"array",     '[1970-01-01T00:00:00.000Z,/re/]', [date0, re],
			"undefined", 'undefined',                       undef,
			"undefined", 'undefined',                       undefined,
			"arguments", 'arguments[1,"2"]',                args,
			"object",    '{"a":"D","circ":Circular}',       circ1,
			//"function",  'stringify(item, maxLen)',       assert,
			"function",  '()',                              function(){},
			"function",  '()',                              function  ()  {  },
			"function",  'abc(de,f)',                       function   abc( de , f )  {  },
			"symbol",    'Symbol(Foo)',                     Symbol("Foo"),
			"string",    '""',                              ""
		]
		, equals = [
			"a", "a",
			0, 0,
			1, 1,
			null, null,
			NaN, NaN,
			undefined, undefined,
			[], [],
			[1, circ1, circ1], [1, circ1, circ2],
			{}, {},
			{a:1}, {a:1},
			date0, new Date(0),
			"", ""
		]
		, testSet = [
			0,
			"",
			"0",
			-1,
			1,
			false,
			true,
			null,
			undefined,
			{},
			{a:1},
			[],
			[1],
			date,
			date0,
			re,
			obj1,
			obj2,
			obj3,
			circ1,
			circ2
		]
		, notEquals = [
			0,         testSet.slice(1),
			"",        testSet.slice(2),
			"0",       testSet.slice(3),
			-1,        testSet.slice(4),
			1,         testSet.slice(5),
			false,     testSet.slice(6),
			true,      testSet.slice(7),
			null,      testSet.slice(9), // null == undefined
			undefined, testSet.slice(9),
			{},        testSet.slice(10),
			{a:1},     testSet.slice(11),
			[],        testSet.slice(12),
			[1],       testSet.slice(13),
			date,      testSet.slice(14),
			date0,     testSet.slice(15),
			re,        testSet.slice(16),
			obj1,      testSet.slice(17),
			obj2,      testSet.slice(18),
			obj3,      testSet.slice(19),
			circ1,     testSet.slice(21), // circ1 is equal to circ2
			circ2,     testSet.slice(21),
			"a", "b"
		]

		circ1.circ = circ1
		circ2.circ = circ2

		function User(name) {
			this.name = name
		}

		function Item(id) {
			this.data = {id: id}
		}

		Item.prototype.toJSON = function() {
			return this.data
		}

		function Model(id) {
			this.id = id
		}

		Model.prototype.toString = function() {
			return "Model<" + this.id + ">"
		}

		for (len = types.length, i = 0; i < len; i+=3) {
			assert.type(types[i+2], types[i], "Type test #" + (i/3))
			//assert.equal(typeof describe.stringify(types[i+2]), "string", "Stringify type #" + (i/3))
			assert.equal(describe.stringify(types[i+2]), types[i+1])
		}

		assert.equal(describe.stringify([date0], 10), "[1970-0..]")

		for (len = equals.length, i = 0; i < len; i+=2) {
			assert.equal(equals[i+1], equals[i], "equals test #" + (i>>1))
		}

		for (len = notEquals.length, i = 0; i < len; i+=2) {
			tmp = notEquals[i + 1]
			for (j = tmp.length; j--;) {
				assert.notEqual(tmp[j], notEquals[i])
			}
		}

		obj1 = {a:1,b:2,c:{d:3,e:4}}
		tmp = JSON.stringify(obj1)

		assert.own(obj1, {a:1})
		assert.own(obj1, {c:{e:4}})
		assert.notOwn(obj1, obj1)
		assert.notOwn(obj1, {a:2})
		assert.notOwn(obj1, {b:{c:2}})
		assert.notOwn(obj1, {c:1})
		assert.notOwn(obj1, {d:3})
		assert.equal(JSON.stringify(obj1), tmp, "Does not mutate obj")

		assert.anyOf(1, [0, 1, 2])

		assert.end()
	})

	it("should diff '{0}' vs '{1}'", [
		[ "", "", [] ],
		[ "", "a", [[0,0,"a"]] ],
		[ "a", "", [[0,1,""]] ],
		[ "a", "ba", [[0,0,"b"]] ],
		[ "a", "ab", [[1,0,"b"]] ],
		[ "ba", "a", [[0,1,""]] ],
		[ "ab", "a", [[1,1,""]] ],
		[ "hello", "Helo world", [[0,1,"H"],[3,1,""],[5,0," world"]] ],
		[ "hello!", "Helo world!", [[0,1,"H"],[3,1,""],[5,0," world"]] ]
	], function(a, b, expected, assert) {
		var revert = a.split("")
		expected.forEach(function(p) { revert.splice(p[0], p[1], p[2]) })
		revert = revert.join("")

		assert
		.equal(describe.diff(a, b), expected)
		.equal(revert, b)
		.end()
	})

	it("should color diff", function(assert) {
		assert
		.equal(describe.diff("abc", "acd", "", "[-", "-]", "[+", "+]"), "a[-b-]c[+d+]")
		.end()
	})

	describe("format", function formatTest() {
		var formatData = {
			fn: formatTest,
			who: "World"
		}

		it ("should format '{0}'", [
			[ "", "" ],
			[ "Hello", "Hello" ],
			[ "Hello, {who}!", "Hello, World!" ],
			[ "{fn.name}", "formatTest" ]
		], function(str, expected, assert) {
			assert.equal(describe.format(str, formatData), expected).end()
		})
	})

	it("should mock fn", function(assert, mock) {
		var count = 0
		, spy1 = mock.fn()
		, spy2 = mock.fn(function() {
			return count++
		})
		, spy3 = mock.fn(["a", "b", "c"])
		, spy4 = mock.fn({
			'': "A",
			'1': "B",
			'"1"': "C",
			'1,"1"': "D"
		})
		, spy5 = mock.fn(function() {
			SOME_UNDEFINED_VALIABLE
		})

		spy1()
		spy5()
		assert.equal(spy2(), 0)
		assert.equal(spy2(), 1)

		assert.own(spy1, {called: 1, errors: 0})
		assert.own(spy5, {called: 1, errors: 1})
		assert.equal(spy2.called, 2)
		assert.equal(count, 2)

		assert.equal([spy3(), spy3(), spy3(), spy3()], ["a", "b", "c", "a"])
		assert.equal(spy3.results, ["a", "b", "c", "a"])

		assert.equal(
			[spy4(), spy4(1), spy4(1), spy4("1"), spy4(1, "1")],
			["A",    "B",     "B",     "C",       "D"]
		)

		assert.equal(dog.bark(3), 3)
		assert.equal(dog.barked, 3)

		mock.spy(dog, "bark", function(count) {
			return this.barked += 2 * count
		})
		mock.spy(dog, "woof")
		assert.notEqual(dog.bark, Dog$bark)
		assert.notEqual(dog.woof, Dog$woof)
		assert.equal(dog.sit, Dog$sit)

		assert.equal(dog.bark(5), 13)
		assert.equal(dog.barked, 13)
		assert.equal(dog.bark.called, 1)

		assert.equal(dog.woof(), 0)
		assert.equal(dog.woofed, 1)
		assert.equal(dog.woof.called, 1)

		assert.end()
	})

	var behaviorTable = [
		[ 1, null, 1 ],
		[ function() { throw 2 }, 2, undefined ],
	]

	it("should mock async fn", behaviorTable, function(origin, err, result, assert, mock) {
		var fn = mock.fn(origin, true)
		fn()
		.then(function(result_) {
			assert.equal(result_, result).end()
		})
		.catch(function(err_) {
			assert.equal(err_, err).end()
		})
	})

	it("should mock callback fn", behaviorTable, function(origin, err, result, assert, mock) {
		var fn = mock.fn(origin, 0)
		fn(function(err_, result_) {
			assert
			.equal(err_, err)
			.equal(result_, result_)
			.end()
		})
	})

	it("should recover mocks", function(assert) {
		assert.equal(dog.bark, Dog$bark)
		assert.equal(dog.woof, Dog$woof)
		assert.equal(dog.sit, Dog$sit)
		assert.end()
	})

	it("should restore falsy values", function(assert, mock) {
		var obj = { zero: 0, empty: "", no: false, nil: null }
		mock.swap(obj, "zero", 99)
		mock.swap(obj, "empty", "replaced")
		mock.swap(obj, "no", true)
		mock.swap(obj, "nil", "not null")

		assert.strictEqual(obj.zero, 99)
		assert.strictEqual(obj.empty, "replaced")
		assert.strictEqual(obj.no, true)
		assert.strictEqual(obj.nil, "not null")

		mock.restore()

		assert.strictEqual(obj.zero, 0)
		assert.strictEqual(obj.empty, "")
		assert.strictEqual(obj.no, false)
		assert.strictEqual(obj.nil, null)
		assert.own(obj, { zero: 0, empty: "", no: false, nil: null })
		assert.end()
	})

	it("should mock swap", function(assert, mock) {
		mock.swap(Object.prototype, "foo", function(){})
		var count = 0
		mock.swap(Dog.prototype, {
			woof: mock.fn([1, 2, 3]),
			bark: mock.fn({
				"1": 11,
				"2": 12,
				'"2"': 22,
				'*': 32
			})
		})

		assert.notEqual(dog.bark, Dog$bark)
		assert.notEqual(dog.woof, Dog$woof)
		assert.equal(dog.sit, Dog$sit)

		assert.equal(dog.bark(1), 11)
		assert.equal(dog.bark(2), 12)
		assert.equal(dog.bark("2"), 22)
		assert.equal(dog.bark.called, 3)
		assert.equal(dog.bark.calls[0], {
			args: [1],
			scope: dog,
			error: null,
			result: 11
		})

		assert.equal(dog.bark("3"), 32)

		assert.equal(dog.woof(), 1)
		assert.equal(dog.woofed, 1)
		assert.equal(dog.woof(), 2)
		assert.equal(dog.woofed, 1)
		assert.equal(dog.woof(), 3)
		assert.equal(dog.woofed, 1)
		assert.equal(dog.woof(), 1)
		assert.equal(dog.woofed, 1)
		assert.equal(dog.woof.called, 4)

		assert.end()
	})

	it("should mock current time", function(assert, mock) {
		// ensure to mock time in beginning of ms
		for(var now = Date.now(); now === Date.now();); now = Date.now()

		mock.time()

		var fakeTimeout = setTimeout

		mock.tick() // noop without timers and ms
		assert.equal(Date.now(), now)

		setTimeout(null, 1)
		setTimeout("", 1)
		mock.tick() // tick till next timer
		assert.equal(Date.now(), now + 1)

		mock.tick()
		assert.equal(Date.now(), now + 1)

		mock.tick(1)
		assert.equal(Date.now(), now + 2)

		mock.restore()

		assert.notStrictEqual(fakeTimeout, setTimeout)
		fakeTimeout(assert.end, 0)
	})

	it("should mock time", function(test, mock) {
		var nativeDate = Date
		, seq = 0
		, inc = function() { return ++seq }
		, cb1 = mock.fn(inc)
		, cb2 = mock.fn(inc)
		, cb3 = mock.fn(inc)
		, cb4 = mock.fn(inc)
		, cb5 = mock.fn(inc)
		, cb6 = mock.fn(inc)

		test.strictEqual(nativeDate, Date)
		mock.time("2018-01-02T13:45:51.001Z")
		test.notStrictEqual(nativeDate, Date)

		setTimeout(cb1, 2)
		setTimeout(cb2, 5, "a")
		setTimeout(cb3, 2, "a", 2)
		var int4 = setInterval(cb4, 2)
		setTimeout(cb5, 20).unref()
		clearTimeout()

		test.equal(Date.parse("2018-01-02T13:45:51.001Z"), 1514900751001)
		test.equal(new Date(1514900751002).toJSON(), "2018-01-02T13:45:51.002Z")
		test.equal(new Date(2018,0,2,13,45,51,2).toJSON(), "2018-01-02T11:45:51.002Z")
		test.equal(new Date(Date.UTC(2018,0,2,13,45,51,2)).toJSON(), "2018-01-02T13:45:51.002Z")
		test.equal(new Date(Date.UTC(2018,0)).toJSON(), "2018-01-01T00:00:00.000Z")
		test.equal(new Date(Date.UTC(2018)).toJSON(), "2018-01-01T00:00:00.000Z")
		test.equal(new Date(2018,0).getMonth(), 0)
		test.equal(new Date(2018,11,31).getDate(), 31)

		test.equal(new Date().getTime(), 1514900751001)
		test.equal(cb1.called, 0)
		test.equal(cb2.called, 0)
		test.equal(cb3.called, 0)
		test.equal(cb4.called, 0)
		test.equal(cb5.called, 0)
		test.equal(cb6.called, 0)

		mock.tick(1)
		test.equal(new Date().getTime(), 1514900751002)
		test.equal(cb1.called, 0)
		test.equal(cb2.called, 0)
		test.equal(cb3.called, 0)
		test.equal(cb4.called, 0)
		test.equal(cb5.called, 0)

		setImmediate(cb6)

		mock.tick(1)
		test.equal(new Date().getTime(), 1514900751003)
		test.equal(cb1.called, 1)
		test.equal(cb2.called, 0)
		test.equal(cb3.called, 1)
		test.equal(cb4.called, 1)
		test.equal(cb5.called, 0)
		test.equal(cb6.called, 1)
		test.equal(cb1.calls[0].result, 2)
		test.equal(cb3.calls[0].result, 3)
		test.equal(cb3.calls[0].args, ["a", 2])
		test.equal(cb4.calls[0].result, 4)
		test.equal(cb6.calls[0].result, 1)

		mock.tick(1)
		test.equal(new Date().getTime(), 1514900751004)
		test.equal(cb1.called, 1)
		test.equal(cb2.called, 0)
		test.equal(cb3.called, 1)
		test.equal(cb4.called, 1)
		test.equal(cb5.called, 0)
		test.equal(cb6.called, 1)

		process.nextTick(cb6, 1)
		mock.tick(0)
		test.equal(new Date().getTime(), 1514900751004)
		test.equal(cb1.called, 1)
		test.equal(cb2.called, 0)
		test.equal(cb3.called, 1)
		test.equal(cb4.called, 1)
		test.equal(cb5.called, 0)
		test.equal(cb6.called, 2)
		test.equal(cb6.calls[1].result, 5)
		test.equal(cb6.calls[1].args, [1])

		mock.tick(1)
		test.equal(new Date().getTime(), 1514900751005)
		test.equal(cb1.called, 1)
		test.equal(cb2.called, 0)
		test.equal(cb3.called, 1)
		test.equal(cb4.called, 2)
		test.equal(cb5.called, 0)
		test.equal(cb6.called, 2)
		test.equal(cb4.calls[1].result, 6)

		mock.tick()
		test.equal(new Date().getTime(), 1514900751006)
		test.equal(cb1.called, 1)
		test.equal(cb2.called, 1)
		test.equal(cb2.calls[0].args, ["a"])
		test.equal(cb3.called, 1)
		test.equal(cb4.called, 2)
		test.equal(cb5.called, 0)
		test.equal(cb6.called, 2)

		mock.tick()
		test.equal(new Date().getTime(), 1514900751007)
		test.equal(cb1.called, 1)
		test.equal(cb2.called, 1)
		test.equal(cb3.called, 1)
		test.equal(cb4.called, 3)
		test.equal(cb5.called, 0)
		test.equal(cb6.called, 2)

		mock.tick(4)
		test.equal(new Date().getTime(), 1514900751011)
		test.equal(cb1.called, 1)
		test.equal(cb2.called, 1)
		test.equal(cb3.called, 1)
		test.equal(cb4.called, 5)
		test.equal(cb5.called, 0)
		test.equal(cb6.called, 2)

		var hrtime = process.hrtime()

		test.equal(hrtime, [1514900751,11000000])
		mock.tick(.01)
		test.equal(process.hrtime(), [1514900751,11010000])
		test.equal(process.hrtime(hrtime), [0,10000])

		test.equal(new Date().getTime(), 1514900751011)
		test.equal(cb1.called, 1)
		test.equal(cb2.called, 1)
		test.equal(cb3.called, 1)
		test.equal(cb4.called, 5)
		test.equal(cb5.called, 0)
		test.equal(cb6.called, 2)

		clearInterval(int4)

		mock.time(1514900751021)
		test.equal(new Date().getTime(), 1514900751021)
		test.equal(cb1.called, 1)
		test.equal(cb2.called, 1)
		test.equal(cb3.called, 1)
		test.equal(cb4.called, 5)
		test.equal(cb5.called, 1)
		test.equal(cb6.called, 2)

		test.end()
	})

	var randomTable = [
		[ 12345, [ 0.7260542734819591, 0.21872897521097423, 0.9517854940965272 ]]
	]

	it("should mock Math.random() with seed {0}", randomTable, function(seed, expected, assert, mock) {
		var _random = Math.random
		mock.rand(seed)
		assert
		.notStrictEqual(Math.random, _random)
		.equal([ Math.random(), Math.random(), Math.random() ], expected)

		mock.restore()
		assert.strictEqual(Math.random, _random).end()
	})

	it("should take Math.random() seed from arguments", function(assert) {
		require("child_process").execSync("node -r ./test.js test/test-random.js --seed=123456")
		try {
			require("child_process").execSync("node -r ./test.js test/test-random.js")
		} catch(e) {
			assert.equal(e.status, 1)
		}
		assert.end()
	})
})


