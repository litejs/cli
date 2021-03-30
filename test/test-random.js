
it("should mock Math.random()", function(assert, mock) {
	mock.rand()
	assert.equal(Math.random(), 0.13391362878817917).end()
})

