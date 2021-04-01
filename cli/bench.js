//-
//-  Usage
//-    litejs bench [FILES..]
//-
//-  Examples
//-    litejs bench test/bench/date-vs-native-date.js
//-

var tmp
, child = require("child_process")
, fs = require("fs")
, path = require("path")
, bench = require("../bench.js")
, cli = require("..")

global.requireGit = requireGit

module.exports = function(opts) {
	var files = cli.ls(opts.args)
	if (!files[0]) return console.error("No files found: " + opts.args)
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
	if (!tmp) {
		tmp = fs.mkdtempSync(path.join(require("os").tmpdir(), "bench-"))
		console.log("mkdtemp", tmp)
		process.on("exit", function() {
			cli.rmrf(tmp)
		})
	}

	id = id.replace(/:(.*)/, function(_, file) {
		return ":" + path.relative(process.cwd(), path.join(__filename, "..", file))
	})

	var cleared = tmp + "/" + id.replace(/\.?\.\/|\/|:/g, "-")
	, content = child.spawnSync("git", ["show", id]).output.join("")

	fs.writeFileSync(cleared, content, "utf8")
	return require(cleared)
}


