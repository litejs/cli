
require("../test.js").describe(function() {
	this
	.test(function() {
		this
		.type(global.describe, "undefined")
		.type(global.test, "undefined")
		.type(global.it, "undefined")
		.type(global.should, "undefined")
		.end()
	})
})


