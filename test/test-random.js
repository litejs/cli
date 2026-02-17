
it("should mock Math.random()", function(assert, mock) {
	mock.rand()
	assert
	.equal(Math.random(), 0.13391362875699997)
	.equal(Math.random(), 0.950075150700286)
	.equal(Math.random(), 0.2563132024370134)
	.equal(Math.random(), 0.3066599608864635)
	.end()
})

