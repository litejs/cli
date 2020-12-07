
function a(a, b) {
	return {
        get prop() {
            return a;
        }
    }
}

function Dog() {
	this.woofed = this.barked = 0
}
var dog = new Dog()
, Dog$bark = Dog.prototype.bark = function(count) { return this.barked += count }
, Dog$woof = Dog.prototype.woof = function() { return this.woofed++ }
, Dog$sit = Dog.prototype.sit = function() {}

var oba = {}
oba.a=1
oba.b=1
oba.c=1
delete oba.b
var obb = {}
obb.a=1
obb.b=1
obb.c=1

require("../v8")
require("../snapshot.js")

describe("TestSuite 1 with scope", function() {
	this
	.test("it should run first test 1.1", function(assert) {
		assert.ok(true)
		assert.ok(true)
		.notOk(false)
		setTimeout(assert.end, 1)
	})
})
.describe("TestSuite 2 with map", {
	"Case 2.1": function() {
		this.plan(1).ok(1)
	},
	"Case 2.2": function(assert) {
		setTimeout(assert.wait(), 60)
		assert.ok(1).end()
	},
	"Case 2.3": function() {
		this.ok(1).plan(1)
	}
})
.test("it should run second test 2.3", function(assert) {

	assert.cmdSnapshot(
		"node -r ./test.js test/test-fail.js --no-status --no-time",
		"./test/spec/test-fail.test"
	)
	assert.cmdSnapshot(
		"node -r ./test.js test/test-fail.js --no-status --tap --no-time",
		"./test/spec/test-fail.tap"
	)
	try {
		require("child_process").execSync("node -r ./test.js test/test-fail.js")
	} catch(e) {
		assert.equal(e.status, 4)
	}
	assert.end()
})
.it("supports a pending test 2.4")
.test("it should mock fn 2.6", function(assert, mock) {
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

	spy1()
	assert.equal(spy2(), 0)
	assert.equal(spy2(), 1)

	assert.equal(spy1.called, 1)
	assert.equal(spy2.called, 2)
	assert.equal(count, 2)

	assert.equal([spy3(), spy3(), spy3(), spy3()], ["a", "b", "c", "a"])

	assert.equal([spy4(), spy4(1), spy4(1), spy4("1"), spy4(1, "1")], ["A", "B", "B", "C", "D"])

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
.test("it should recover mocks 2.7", function(assert) {
	assert.equal(dog.bark, Dog$bark)
	assert.equal(dog.woof, Dog$woof)
	assert.equal(dog.sit, Dog$sit)
	assert.end()
})
.test("it should mock map 2.8", function(assert, mock) {
	var count = 0
	mock.map(Dog, {
		woof: [1, 2, 3],
		bark: {
			"1": 11,
			"2": 12,
			'"2"': 22,
			'*': 32
		}
	})

	assert.notEqual(dog.bark, Dog$bark)
	assert.notEqual(dog.woof, Dog$woof)
	assert.notEqual(dog.sit, Dog$sit)

	assert.equal(dog.bark(1), 11)
	assert.equal(dog.bark(2), 12)
	assert.equal(dog.bark("2"), 22)
	assert.equal(dog.bark.called, 3)
	assert.equal(dog.bark.calls[0], {
		args: [1],
		scope: dog,
		error: undefined,
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
.test("it should mock time 2.9", function(test, mock) {
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
	setTimeout(cb2, 5)
	setTimeout(cb3, 2)
	var int4 = setInterval(cb4, 2)
	setTimeout(cb5, 20)

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
.test("it should recover mocks 2.10", function(assert) {
	assert.equal(dog.bark, Dog$bark)
	assert.equal(dog.woof, Dog$woof)
	assert.equal(dog.sit, Dog$sit)
	assert.notEqual(new Date().getTime(), 1514900751002)
	assert.end()
})
.test("it should mock Math.random() 2.11", function(assert, mock) {
	mock.rand(12345)

	assert.equal(Math.random(), 0.7260542734819591)
	assert.equal(Math.random(), 0.21872897521097423)
	assert.equal(Math.random(), 0.9517854940965272)
	assert.equal(Math.random(), 0.9459277032748628)

	assert.end()
})
.test("it should recover from random mock 2.12", function(assert) {
	assert.notEqual(Math.random(), 0.742924822201702)
	assert.end()
})


describe("TestSuite 3")
.test("it should run first test 3.1", function(assert) {
	assert.ok(true)
	.equal(true, true)
	.equal(true, true)
	.isOptimized(a, [1,2])
	.isOptimized(a, ["1",2])
	.isOptimized(a, ["1",{}])
	.isNotFast(oba)
	.isFast(obb)
	//assert.end()
	setTimeout(assert.end.bind(assert), 10)
})
.test("it should run second test 3.2", function(assert) {
	assert.plan(1)
	assert.ok(true)
})


