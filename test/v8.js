
describe("v8.js", function() {
	require("../v8.js")

	var fastObj = {a:1, b:2}
	fastObj.c = 1

	var slowObj = {a:1, b:2, c:3}
	delete slowObj.b

	function fastFn(a, b) {
		return {
			get prop() { return a }
		}
	}

	function slowFn(o) {
		return o instanceof fastFn
	}


	it("should test optimization", function(assert) {
		assert
		.isOptimized(fastFn, [1, 2])
		.isOptimized(fastFn, ["1", 2])
		.isOptimized(fastFn, ["1", {}])
		.end()
	})
	it("should test fast properties", function(assert) {
		assert
		.isFast(fastObj)
		.isNotFast(slowObj)
		.end()
	})
})

