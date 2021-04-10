

describe("build", function() {
	require("../snapshot.js")
	var build = require("../cli/build.js")


	it ("should minimize html", function(assert) {
		assert.planned = 0
		assert.testHtml = function(file) {
			assert.planned+=5
			build({ args: [file], out: "test/ui/index.html" })
			assert.matchSnapshot(file)
			assert.matchSnapshot("test/ui/b.js")
			assert.matchSnapshot("test/ui/index.html")
			assert.matchSnapshot("test/ui/lib.css")
			assert.matchSnapshot("test/ui/min.js")
		}

		assert.testHtml("test/ui/dev.html")
	})

})

//, boolAttr = /^(allowpaymentrequest|async|auto(focus|play)|controls|default|(form|)novalidate|hidden|ismap|itemscope|loop|multiple|nomodule|open|playsinline|readonly|(check|disabl|mut|requir|revers|select|truespe)ed)$/
