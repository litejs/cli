
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
	, threads = opts.threads
	, nums = opts.args.filter(Number)
	, test = require.resolve("../test.js")
	, pendingRuns = 0
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
		if (!threads || threads === true) threads = require("os").cpus().length
		runAgain()
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
		if (!files[0]) return
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
		if (--pendingRuns < 1) allDone()
		else run()
	}
	function allDone() {
		printCoverage()
	}
	function runAgain() {
		pendingRuns += files.length
		for (; threads--; run());
		if (opts.watch) watcher.add(getRequired())
	}
	function printCoverage() {
		if (!opts.coverage) return
		var coverages = {}
		, fileCoverage = require("./coverage.js").fileCoverage
		, fileNames = cli.ls.apply(null, opts.sources.split(",")).filter(function(name) {
			return this.indexOf(name) < 0
		}, ("" + opts.ignore).split(","))
		, fileMap = fileNames.reduce(function(map, name) {
			map[map[name] = "file://" + path.resolve(name)] = name
			return map
		}, {})
		, good = []
		, bad = []
		, lcov = []

		cli.ls(opts.coverage + "/*.json").forEach(function(file) {
			require(path.resolve(file)).result.forEach(function(row) {
				if (!fileMap[row.url]) return
				if (coverages[row.url]) {
					var current = coverages[row.url]
					if (current.functions.length < row.functions.length) {
						coverages[row.url] = row
						row = current
						current = coverages[row.url]
					}
					row.functions.forEach(function(fn, i) {
						var current = this[i].ranges
						if (current.length < fn.ranges.length) {
							this[i].ranges = fn.ranges
							fn.ranges = current
							current = this[i].ranges
						}
						fn.ranges.forEach(function(range, i) {
							this[i].count += range.count
						}, current)
					}, current.functions)
				} else coverages[row.url] = row
			})
		})

		var results = fileNames.map(function(file) {
			var source = cli.readFile(fileMap[file].slice(7))
			, result = fileCoverage(file, source, (coverages[fileMap[file]] || { functions: [{ranges:[{count:0}]}]}).functions)
			if (result.coverage < 100) {
				if (opts.status) process.exitCode++
				bad.push(file + " coverage " + result.text)
				if (opts.uncovered) bad.push(result.branches.uncovered)
			} else {
				good.push(file)
			}
			lcov.push(result.lcov)
			return result
		})
		if (opts.lcov) cli.writeFile(opts.lcov, lcov.join("\n"))
		if (good[0]) console.log("# Coverage 100%:", good.join(", "))
		if (bad[0]) console.log("\x1b[31m# " + bad.join("\n# ") + "\x1b[0m")
		require("./coverage.js").reportTable(results)
	}
}

