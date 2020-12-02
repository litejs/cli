
describe
.it("should fail on timeout", function(assert) {
	assert.setTimeout(5)
})
.it("should fail on multiple ends", function(assert) {
	setTimeout(this.end, 6)
	assert.end()
})
.it("should fail on assertion after end", function(assert) {
	assert.end()
	assert.ok(1)
})
.it("should fail on invalid assertions", function() {
	this.equal(
		[1, 2]  // <-- notice a comma is missing after "]"
		[3]
	)
	.equal(1, 2)
	.ok(0)
	.throws(function(){})
	.end()
})


