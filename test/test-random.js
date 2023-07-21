
it("should mock Math.random()", function(assert, mock) {
	mock.rand()
	assert
	.equal(Math.random(), 0.13391362878817917)
	.equal(Math.random(), 0.9500751509214926)
	.equal(Math.random(), 0.25631320249669093)
	.equal(Math.random(), 0.30665996095786335)
	.end()
})

