
describe("snapshot.js", function() {
	require("../snapshot.js")

	it("should test snapshots", function(assert) {
		assert.cmdSnapshot(
			"node -r ./test.js test/test-structure.js --no-time",
			"./test/spec/test-structure"
		)
		assert.cmdSnapshot(
			"node --allow-natives-syntax -r ./test.js test/v8.js --no-v8 --no-time",
			"./test/spec/test-v8"
		)
		assert.cmdSnapshot(
			"node -r ./test.js test/v8.js --no-time",
			"./test/spec/test-v8"
		)
		assert.cmdSnapshot(
			"node -r ./test.js test/test-fail.js --no-status --no-color --no-time --no-stack",
			"./test/spec/test-fail"
		)
		assert.cmdSnapshot(
			"node -r ./test.js test/test-fail.js --no-status --color --no-time --stack=4 --no-cut 1",
			"./test/spec/test-first"
		)
		assert.cmdSnapshot(
			"node -r ./test.js test/test-global.js --no-status --global=describe,test,it,should --brief --no-time",
			"./test/spec/test-global"
		)
		assert.cmdSnapshot(
			"node -r ./test.js test/test--no-global.js --no-status --no-global --tap --no-time",
			"./test/spec/test-no-global"
		)
		try {
			require("child_process").execSync("node -r ./test.js test/test-fail.js")
		} catch(e) {
			assert.equal(e.status, 12)
		}
		assert.end()
	})

	it("should test transformed snapshots", function(assert) {
		assert.matchSnapshot(
			"./test/spec/test-transform",
			function(str) {
				return str.replace(/\\/g, "/")
			}
		)
		assert.end()
	})
	it("should test failing snapshots", function(assert) {
		try {
			require("child_process").execSync("node -r ./test.js test/snapshot-fail.js", { stdio: "ignore" })
		} catch(e) {
			assert.equal(e.status, 3)
		}
		assert.end()
	})
})

