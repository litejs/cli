
var path = require("../lib/path")
, child = require("child_process")
, fs = require("fs")
, describe = require("./").describe

describe.onend = function() {
	if (!describe.conf.watch) return

	var tick
	, cmd = process.argv[0]
	, argv = process.execArgv.concat(process.argv.slice(1)).filter(function(arg) {
		return arg !== "--watch"
	})

	Object.keys(require.cache).forEach(watch)

	function watch(name) {
		fs.watch(name, watchFn).name = name
	}
	function watchFn(ev, name) {
		if (ev == "rename") {
			this.close()
			setTimeout(watch, 5, this.name)
		}
		clearTimeout(tick)
		tick = setTimeout(runAgain, 10)
	}
	function runAgain() {
		try {
			child.spawn(cmd, argv, { stdio: "inherit" })
		} catch(e) {
			console.error(e)
		}
	}
}


