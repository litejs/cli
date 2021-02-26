
require("../test.js")
.describe(function() {
	var output = []
	, log = console.log.bind(console)
	console.log = null
	this.onprint = function(str) {
		output.push(str)
	}
	this.onend = function(){
		log("- " + output.join("\n- "))
		log("# test completed")
	}
	this
	.test(function(assert) {
		assert.type(global.describe, "undefined")
		assert.type(global.test, "undefined")
		assert.type(global.it, "undefined")
		assert.type(global.should, "undefined")
		assert.end()
	})
})


