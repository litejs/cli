
describe("TestSuite 1 with fn", function() {
	Object.prototype.foo = 1
	describe.onend = function() {
		delete Object.prototype.foo
	}
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
	"Case 2.2": function(assert, mock) {
		this.ok(1).plan(1)
	},
	"Nested Suite 2.3": {
		"Case 2.3.1": null,
		"Case 2.3.2": null
	},
	"Nested Suite 2.4": {
		"Case 2.4.1": null,
		"Case 2.4.2": null
	},
	"Case 2.5": null
})
.it("supports a pending test 2.6")
.it("_should skip test by name 2.7", function(assert) {
	assert.fail()
	assert.end()
})


describe("TestSuite 4")
.test("it should run second test 4.2", function(assert) {
	assert.plan(1)
	assert.ok(true)
})

