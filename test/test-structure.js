
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


var suitesTable = [
	[ "env.1", function() { return Promise.resolve(1) } ],
	[ "env.2", function() { return Promise.resolve(2) } ]
]
, casesTable = [
	[ "ca1", 3 ],
	[ "ca2", 4 ]
]

describe("TestSuite 3 {0}", suitesTable, function(suiteName, suiteSetup) {
	it("set up a " + suiteName, suiteSetup)
	it("tests case {0}", casesTable, function(caseName, caseId, assert) {
		assert.type(caseId, "number")
		assert.type(suiteName, "string")
		assert.type(caseName, "string")
		assert.end()
	})
})

describe("TestSuite 4")
.test("it should run chained test 4.1", function(assert) {
	assert.plan(1)
	assert.ok(true)
})
.it("supports a pending test 4.2")
.it("_should skip test by name 4.3", function(assert) {
	assert.fail()
	assert.end()
})

