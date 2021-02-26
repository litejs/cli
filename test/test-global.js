
describe(function() {
	for (var i = 1015; i--; ) this.should("break stack", function(assert) {assert.ok(1).end()})
	this
	.should("have globals defined", function(assert) {
		assert.type(global.describe, "function")
		assert.type(global.test, "function")
		assert.type(global.it, "function")
		assert.type(global.should, "function")
		assert.end()
	})
})


