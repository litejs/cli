
describe("coverage", function() {
	require("../../snapshot.js")

	var cli = require("../..")
	, coverage = require("../../cli/coverage.js")
	, path = require("path")
	, coverageTests = [
		[ "./test/coverage/run1.js" ]
	]
	, tmp = "./test/coverage/tmp"
	, opts = { env: { NODE_V8_COVERAGE: tmp } }

	it ("saves coverage: {0}", coverageTests, function(file, assert) {
		cli.rmrf(tmp)
		assert.cmdSnapshot("node " + file, file, opts)

		var coverages = cli.ls(tmp + "/*.json")
		, files = cli.ls(opts.sources).reduce(function(map, name) {
			map["file://" + path.resolve(name)] = name
			return map
		}, {})
		, good = []
		, bad = []
		, lcov = []

		assert.equal(coverages.length, 1)

		coverages.forEach(function(file) {
			var data = require(path.resolve(file))
			data.result.forEach(function(row, i, arr) {
				if (!files[row.url]) return
				var source = cli.readFile(row.url.slice(7))
				, result = fileCoverage(files[row.url], row.functions, source)
				if (result.cov < 100) {
					process.exitCode++
					bad.push(files[row.url] + " coverage " + result.txt)
				} else {
					good.push(files[row.url])
				}
				lcov.push(result.lcov)
			})
		})

		if (opts.lcov) cli.writeFile(opts.lcov, lcov.join("\n"))
		if (good[0]) console.log("# Coverage 100%:", good.join(", "))
		if (bad[0]) console.log("\x1b[31m# " + bad.join("\n# ") + "\x1b[0m")

		assert.matchSnapshot("./test/coverage/lcov.info")
		assert.end()
	})
})


