//-
//-  Usage
//-    litejs bench [FILES..]
//-
//-  Examples
//-    litejs bench test/bench/date.js
//-

var bench = require("../../test/bench")
, path = require("path")

exports.execute = execute

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

