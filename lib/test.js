//-
//-  Usage
//-    lj test

var child = require("child_process")
, path = require("path")
, { ls, watch } = require("..")

/* global describe */

module.exports = function(opts) {
	var watcher
	, subOpts = {
		env: Object.assign({}, process.env),
		stdio: "inherit"
	}
	, files = ls(opts._, { dir: false })
	, threads = opts.threads
	, nums = opts._.filter(Number)
	, test = require.resolve("../test.js")
	, pendingRuns = 0
	if (!files[0]) return console.error("No test found: " + opts._)

	process.exitCode = 0

	if (!opts.threads && files.length < 10) {
		process.argv.length = 2
		nums.push.apply(process.argv, opts._valid.concat(opts._unknown, nums))
		require(test)
		files.forEach(function(file) { require(path.resolve(file)) })
	} else {
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
		if (--pendingRuns > 0) run()
	}
	function runAgain() {
		pendingRuns += files.length
		for (; threads--; run());
		if (opts.watch) watcher.add(getRequired())
	}
}



