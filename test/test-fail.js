
describe
.it("_should skip by name", function(assert) {
	assert.ok(0)
})
.it("should fail on timeout", function(assert) {
	assert.setTimeout(1)
})
.it("should fail on wrong plan 1", function(assert) {
	assert.plan(1).end()
})
.it("should fail on wrong plan 2", function(assert) {
	assert.plan(1).ok(1).ok(1)
})
.it("should fail on multiple ends", function(assert) {
	setTimeout(this.end, 1)
	assert.end()
})
.it("should fail on assertion after end", function(assert) {
	assert.end()
	assert.ok(1)
})
.it("should fail on invalid test", function(assert) {
	SOME_UNDEFINED_VALIABLE
	assert.end()
})
.it("should fail on invalid assertions", function() {
	var a = Object.create(null)
	a.a = a
	a.toJSON = function() { return a }
	function B() {}

	this.equal(
		[1, 2]  // <-- notice a comma is missing after "]"
		[3]
	)
	.equal(a, "2")
	.equal(/1/, /1/m)
	.equal(arguments, [])
	.equal([/1/, new B, a], [/1/, B, Object.assign({}, a)])
	.ok(0)
	.throws(function(){})
	.end()
})
.it("should fail on invalid assertions", function(assert, mock) {
	var a = {}
	Object.defineProperty(a, "prop", { value: "test", writable: false })
	mock.swap(a, "prop", 1)
	assert.end()
})
//.describe("_Invalid Suite", function() { SOME_UNDEFINED_VALIABLE })


