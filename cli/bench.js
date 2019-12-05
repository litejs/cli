//-
//-  Usage
//-    litejs bench [FILES..]
//-
//-  Examples
//-    litejs bench test/bench/date.js
//-

var tmp
, child = require("child_process")
, fs = require("fs")
, path = require("path")
, bench = require("../../test/bench")

exports.execute = execute
global.requireGit = requireGit

function execute(argv, i) {
	var file = process.argv[i]
	, mod = file && require(path.join(process.cwd(), file))

	if (mod) {
		run(mod, execute.bind(null, argv, i + 1))
	}
}

function run(mod, next) {
	var i = 0
	if (Array.isArray(mod)) {
		loop()
	} else {
		var skip = []
		, enabled = Object.keys(mod).reduce(function(map, name) {
			if (name && name.charAt(0) !== "_") {
				map[name] = mod[name]
			} else {
				skip.push(name)
			}
			return map
		}, {})
		console.log(
			"---\nBench: %s%s\n---",
			Object.keys(enabled).join(" vs "),
			skip.length ? "\n Skip: " + skip.join(", ") : ""
		)
		bench(enabled, function(err, result) {
			Object.keys(result).forEach(function(name) {
				console.log(name + "\n  " + result[name].text + " ops/s, " + result[name].rel)
			})
			if (typeof next === "function") {
				next()
			}
		})
	}
	function loop() {
		var cur = mod[i++]
		if (cur) run(cur, loop)
		else if (typeof next === "function") next()
	}
}

function requireGit(id) {
	if (!tmp) {
		tmp = fs.mkdtempSync(
			path.join(require("os").tmpdir(), "bench-")
		)
		console.log("mkdtemp", tmp)
		process.on("exit", cleanup)
	}

	id = id.replace(/:(.*)/, function(_, file) {
		return ":" + path.relative(process.cwd(), path.join(__filename, "..", file))
	})

	var cleared = tmp + "/" + id.replace(/\.?\.\/|\/|:/g, "-")
	, content = child.spawnSync("git", ["show", id]).output.join("")

	fs.writeFileSync(cleared, content, "utf8")
	return require(cleared)
}

function cleanup() {
	module.parent.exports.rmrf(tmp)
}

