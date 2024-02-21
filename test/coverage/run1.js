
var a = this.x ? 1 : 2
, b = (a) => a + 100
, bb = (a) => ({
	a: 1
})

function c(a, b) {
	return a + C() + C()
	throw "error"
	function C() {
		return b + D() + D()
		function D() {
			return b
		}
	}
}

for (var i = 10; i--; ) {
	c(i, a)
}

