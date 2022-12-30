
var cli = require("..")
, snap = "./test/spec/test-not-existing"

require("../snapshot.js")

it("should fail on wrong snapshots", function(assert) {
	assert.cmdSnapshot(
		"node -r ./test.js test/test--no-global.js --no-global --tap --no-time",
		"./test/spec/test-global"
	)
	.end()
})

it("should fail on non-existing snapshots", function(assert, mock) {
	cli.rmrf(snap + ".snap")

	assert.cmdSnapshot(
		"node -r ./test.js test/test--no-global.js --no-global --tap --no-time",
		snap
	)
	assert.end()
})

it("should create a new snapshot", function(assert, mock) {
	mock.swap(describe.conf, "up", true)

	assert.cmdSnapshot(
		"node -r ./test.js test/test--no-global.js --no-global --tap --no-time --up",
		snap
	)
	mock.restore()
	assert
	.matchSnapshot(snap, cli.readFile("./test/spec/test-no-global.snap"))
	cli.rmrf(snap + ".snap1")
	assert.end()
})

it("should fail on invalid command", function(assert) {
	assert.cmdSnapshot("false", "./test/spec/test-false").end()
})

