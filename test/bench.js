

describe("bench.js", function() {
	var bench = require("../bench")

	function nop() {}

	it ("should measure cpu speed", function(assert) {
		assert(bench.cpuSpeed() > 1).end()
	})

	it ("should return same result on same fn", function(assert) {
		assert.setTimeout(3000)
		var count = 5
		retry()
		function retry() {
			bench({ a: nop, b: nop }, {warmup:100,samples:2,"sample-time":30}, function(err, result) {
				if (result.a.rel !== result.b.rel && --count) return retry()
				assert.equal(result.a.rel, "fastest")
				assert.equal(result.b.rel, "fastest")
				assert.end()
			})
		}
	})
	it ("should compare fn and nop", function(assert) {
		bench({
			b: nop,
			a: function() { new Date() / Date.now() }
		}, {warmup:10,"sample-time":10}, function(err, result) {
			assert.notEqual(result.a.rel, "fastest")
			assert.equal(result.b.rel, "fastest")
			assert.end()
		})
	})
})

