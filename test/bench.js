

describe("bench")
.test("same fn", function(t) {
	var bench = require("../bench")

	function a() {
		return Math.sin(Math.random())
	}
	bench({
		a: a,
		b: a
	}, function(err, result) {
		t.ok(result.a)
		t.ok(result.b)
		console.log(result)
		t.end()
	})
})

