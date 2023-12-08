

describe("bench.js", function() {
	var bench = require("../bench")

	function nop() {}


	it ("should return similar result on same fn", function(assert) {
		assert.setTimeout(3000)
		var count = 5
		retry()
		function retry() {
			bench({ a: nop, b: nop }, {warmup:10,samples:3,"sample-time":30}, function(err, result) {
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
			a: function() { new Date() / Date.now() }
		}, {warmup:10,"sample-time":10}, function(err, result) {
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
		}, {warmup:1,"sample-time":1}, function(err, result) {
			assert.equal(Object.keys(result), ["a", "b.b1", "b.b2", "c"])
			assert.end()
		})
	})
})

