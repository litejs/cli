//-
//-  Usage
//-    lj test

var cli = require("..")
, child = require("child_process")
, fs = require("fs")
, path = require("path")

/* global describe */

module.exports = function(opts) {
	var watcher
	, subOpts = {
		env: Object.assign({}, process.env),
		stdio: "inherit"
	}
	, files = cli.ls(opts._[0] ? opts._.filter(isNaN) : "test/*.js")
	, threads = opts.threads
	, nums = opts._.filter(Number)
	, test = require.resolve("../test.js")
	, pendingRuns = 0
	if (!files[0]) return console.error("No test found: " + opts._)

	process.exitCode = 0

	if (!opts.threads && !opts.coverage && files.length < 10) {
		process.argv.length = 2
		nums.push.apply(process.argv, opts._valid.concat(opts._unknown, nums))
		require(test)
		files.forEach(function(file) { require(path.resolve(file)) })
	} else {
		if (opts.coverage) {
			opts.coverage = subOpts.env.NODE_V8_COVERAGE = path.resolve(
				opts.coverage === true ? process.env.NODE_V8_COVERAGE || "./coverage" : opts.coverage
			)
			rmrf(opts.coverage)
			if (opts.lcov === true) opts.lcov = opts.coverage + "/lcov.info"
		}
		if (!threads || threads === true) threads = require("os").cpus().length
		runAgain()
	}
	if (opts.watch) {
		describe.onend = function() {
			watcher = watch(getRequired(), runAgain, 100)
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
		child.spawn(process.argv[0], [].concat(
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
			map[map[name] = path.resolve(name)] = name
			return map
		}, {})
		, good = []
		, bad = []
		, lcov = []

		cli.ls(opts.coverage + "/*.json").forEach(function(file) {
			require(path.resolve(file)).result.forEach(function(row) {
				var fileName = row.url.slice(7)
				if (!fileMap[fileName]) return
				if (coverages[fileName]) {
					var current = coverages[fileName]
					if (current.functions.length < row.functions.length) {
						coverages[fileName] = row
						row = current
						current = coverages[fileName]
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
				} else coverages[fileName] = row
			})
		})

		var results = fileNames.map(function(file) {
			var source = fs.readFileSync(fileMap[file], "utf8")
			, result = fileCoverage(file, source, (coverages[fileMap[file]] || { functions: [{ranges:[{count:0}]}]}).functions)
			if (result.coverage < 100) {
				if (opts.status) process.exitCode++
				bad.push(file + " coverage " + result.text)
				if (opts.uncovered === file) bad.push(result.branches.uncovered)
			} else {
				good.push(file)
			}
			lcov.push(result.lcov)
			return result
		})
		if (opts.lcov) writeFile(opts.lcov, lcov.join("\n"))
		if (good[0]) console.log("# Coverage 100%:", good.join(", "))
		if (bad[0]) console.log("\x1b[31m# " + bad.join("\n# ") + "\x1b[0m")
		require("./coverage.js").reportTable(results)
	}
}

function mkdirp(dir) {
	try {
		fs.statSync(dir)
	} catch (e) {
		mkdirp(path.dirname(dir))
		fs.mkdirSync(dir)
	}
}

function rmrf(dir) {
	if (dir === "/") throw Error("Can not remove root")
	try {
		if (fs.lstatSync(dir).isDirectory()) {
			for (var arr = fs.readdirSync(dir), i = arr.length; i--; ) {
				rmrf(path.join(dir, arr[i]))
			}
			fs.rmdirSync(dir)
		} else {
			fs.unlinkSync(dir)
		}
	} catch (e) {
		if (e.code === "ENOENT") return
		throw e
	}
}

function watch(paths, cb, delay) {
	var timer
	, watchers = {}
	, changed = []

	add(paths)

	return {
		add: add
	}
	function add(paths) {
		paths.forEach(watch)
	}
	function run() {
		add(changed)
		changed.length = 0
		cb()
	}
	function watch(file) {
		if (watchers[file]) return
		try {
			watchers[file] = fs.watch(file, function() {
				if (watchers[file]) {
					changed.push(file)
					watchers[file].close()
					watchers[file] = null
				}
				clearTimeout(timer)
				timer = setTimeout(run, delay)
			})
		} catch (e) {}
	}
}

function writeFile(name, content) {
	mkdirp(path.dirname(name))
	fs.writeFileSync(name, content, "utf8")
}

