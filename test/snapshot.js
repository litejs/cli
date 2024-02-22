
describe("snapshot.js", function() {
	require("../snapshot.js")

	it("should test snapshots", [
		["node -r ./test.js test/test-structure.js --no-time", "./test/spec/test-structure", {}],
		["node -r ./test.js test/v8.js --no-v8 --no-time", "./test/spec/test-v8", {}],
		["node -r ./test.js test/v8.js --no-time", "./test/spec/test-v8", {}],
		["node -r ./test.js test/test-fail.js --no-status --no-color --no-time --no-stack --cut=10", "./test/spec/test-fail", {}],
		["node --no-extra-info-on-fatal-exception -r ./test.js test/test-fail-table.js", "./test/spec/test-fail-table", { expectFail: true }],
		["node -r ./test.js test/test-fail.js --no-status --color --no-time --stack=4 --no-cut 1", "./test/spec/test-first", {}],
		["node -r ./test.js test/test-global.js --no-status --global=describe,test,it,should --brief --no-time", "./test/spec/test-global", {}],
		["node -r ./test.js test/test--no-global.js --no-status --no-global --tap --no-time", "./test/spec/test-no-global", {}],
	], function(cmd, file, opts, assert) {
		assert.cmdSnapshot(cmd, file, opts).end()
	})

	it("should test status code", [
		["node -r ./test.js test/test-fail.js", 12],
		["node -r ./test.js test/snapshot-fail.js", 3],
	], function(cmd, exitStatus, assert) {
		try {
			require("child_process").execSync(cmd, { stdio: "ignore" })
		} catch(e) {
			assert.equal(e.status, exitStatus)
		}
		assert.end()
	})
})

