//-
//-  Usage
//-    litejs bench [FILES..]
//-
//-  Examples
//-    litejs bench test/bench/date-vs-native-date.js
//-

var cli = require("..")
, child = require("child_process")
, path = require("path")
, bench = require("../bench.js")

global.requireGit = requireGit
if (!global.gc) {
	require("v8").setFlagsFromString("--expose_gc")
	global.gc = require("vm").runInNewContext("gc")
}

module.exports = function(opts) {
	var files = cli.ls(opts._)
	if (!files[0]) return console.error("No files found: " + opts._)
	run(files, opts)
}

function run(files, opts) {
	var file = files.shift()
	, mod = file && require(path.join(process.cwd(), file))
	if (!mod) return
	console.log("---\nBench: %s\n---", file)
	bench(mod, opts, function(err, result) {
		Object.keys(result).forEach(function(name) {
			console.log(name + "\n  " + result[name].text + " ops/s, " + result[name].rel)
		})
		run(files, opts)
	})
}

function requireGit(id) {
	var junks = id.split(":")
	, calleeDir = Error(id).stack.split("\n")[2].replace(/^.*\(|\/[^\/]+$/g, "")
	, newDir = path.resolve("_bench-" + junks[0])
	, file = path.join(newDir, path.relative(process.cwd(), path.resolve(calleeDir, junks[1] || "")))

	if (junks[0] === "last-tag") {
		junks[0] = child.execSync("git describe --tags --abbrev=0").toString("utf8").trim()
	}

	child.execSync("git worktree add -d '" + newDir + "' " + junks[0])

	process.on("exit", function() {
		child.execSync("git worktree remove '" + newDir + "'")
	})

	return require(file)
}
