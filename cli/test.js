
var cli = require("..")
, child = require("child_process")
, path = require("path")

/* global describe */

module.exports = function(opts) {
	var subOpts = {
		env: Object.assign({}, process.env),
		stdio: "inherit"
	}
	, files = cli.ls(opts.args.filter(isNaN))
	, nums = opts.args.filter(Number)
	, test = path.resolve(module.filename, "../../test.js")
	if (!files[0]) return console.error("No files found: " + opts.args)

	process.exitCode = 0

	if (!opts.threads && !opts.coverage && files.length < 10 && opts.nodeArgs.length < 1) {
		process.argv.length = 2
		nums.push.apply(process.argv, nums.concat(opts.opts))
		require(test)
		files.forEach(function(file) { require(path.resolve(file)) })
	} else {
		if (opts.coverage) {
			opts.coverage = subOpts.env.NODE_V8_COVERAGE = path.resolve(
				opts.coverage === true ? process.env.NODE_V8_COVERAGE || "./coverage" : opts.coverage
			)
			cli.rmrf(opts.coverage)
			if (opts.lcov === true) opts.lcov = opts.coverage + "/lcov.info"
		}
		var threads = opts.threads
		if (!threads || threads === true) threads = require("os").cpus().length
		for (; threads--; run());
	}
	if (opts.watch) {
		var watcher
		describe.onend = function() {
			watcher = cli.watch(getRequired(), runAgain, 100)
		}
	}
	function getRequired() {
		return Object.keys(require.cache).map(fullPath)
	}
	function fullPath(file) {
		return path.resolve(file)
	}
	function run() {
		if (!files[0]) return allDone()
		var runFiles = files.splice(0, 10)
		, last = runFiles.pop()
		, args = ["-r", test]
		runFiles.forEach(function(file) {
			args.push("-r", "./" + file)
		})
		child.spawn(process.argv[0], opts.nodeArgs.concat(
			args, last, opts.opts
		), subOpts)
		.on("close", runDone)
	}
	function runDone(code) {
		if (opts.status) process.exitCode += code
		run()
	}
	function allDone() {
		printCoverage()
	}
	function runAgain() {
		files = cli.ls(opts.args.filter(isNaN))
		run()
		watcher.add(getRequired())
	}
	function printCoverage() {
		if (!opts.coverage) return
		var coverages = cli.ls(subOpts.env.NODE_V8_COVERAGE + "/*.json")
		, fileCoverage = require("./coverage.js").fileCoverage
		, files = cli.ls(opts.sources).reduce(function(map, name) {
			map["file://" + path.resolve(name)] = name
			return map
		}, {})
		, good = []
		, bad = []
		, lcov = []
		, results = []
		coverages.forEach(function(file) {
			var data = require(path.resolve(file))
			data.result.forEach(function(row) {
				if (!files[row.url]) return
				var source = cli.readFile(row.url.slice(7))
				, result = fileCoverage(files[row.url], source, row.functions)
				if (result.coverage < 100) {
					if (opts.status) process.exitCode++
					bad.push(files[row.url] + " coverage " + result.text)
				} else {
					good.push(files[row.url])
				}
				lcov.push(result.lcov)
				results.push(result)
			})
		})
		if (opts.lcov) cli.writeFile(opts.lcov, lcov.join("\n"))
		if (good[0]) console.log("# Coverage 100%:", good.join(", "))
		if (bad[0]) console.log("\x1b[31m# " + bad.join("\n# ") + "\x1b[0m")
		require("./coverage.js").reportTable(results)
	}
}

