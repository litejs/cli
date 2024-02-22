

describe("bench.js", function() {
	var bench = require("../bench")

	function nop() {}


	it ("should return similar result on same fn", function(assert) {
		assert.setTimeout(3000)
		var count = 15
		retry()
		function retry() {
			bench({ a: nop, b: nop }, {warmup:50,samples:5,sampleTime:50}, function(err, result) {
				if (result.a.rel !== result.b.rel && --count) return retry()
				assert.ok(result.a.diff < 5)
				assert.ok(result.b.diff < 5)
				assert.end()
			})
		}
	})
	it ("should compare fn and nop", function(assert) {
		bench({
			b: nop,
			a: function() { return new Date() / Date.now() }
		}, {warmup:10,sampleTime:10}, function(err, result) {
			assert.notEqual(result.a.rel, "fastest")
			assert.equal(result.b.rel, "fastest")
			assert.end()
		})
	})
	it ("should spread fns array", function(assert) {
		bench({
			a: nop,
			b: {
				fns: [ function b1(){}, function b2(){} ],
				run: nop
			},
			c: nop
		}, {warmup:1,sampleTime:1}, function(err, result) {
			assert.equal(Object.keys(result), ["a", "b.b1", "b.b2", "c"])
			assert.end()
		})
	})
})

