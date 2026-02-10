//-
//-  Usage
//-    lj test

var path = require("path")
, { ls, watch } = require("..")

/* global describe */

module.exports = function(opts) {
	var files = ls(opts._, { dir: false })
	, rerun = process.argv.slice(1).filter(s => s !== "--watch")
	if (!files[0]) return console.error("No test found: " + opts._)

	process.exitCode = 0
	process.argv.length = 2
	process.argv.push(...opts._valid, ...opts._unknown, ...opts._.filter(Number))
	require("../test.js")
	files.forEach(file => require(path.resolve(file)))

	if (opts.watch) {
		var watcher, child
		describe.onend = () => {
			if (watcher) watcher.close()
			watcher = watch(Object.keys(require.cache), () => {
				if (child) child.kill()
				child = require("child_process").spawn(process.argv[0], rerun, { stdio: "inherit" })
			}, 100)
		}
	}
}
