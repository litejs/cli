
var bench = require("../../test/bench")
, path = require("path")

exports.execute = execute

function execute(argv, i) {
	for (var a; a = process.argv[i++]; ) {
		a = require(path.join(process.cwd(), a))
		console.log("Bench: " + Object.keys(a).join(" vs ") + "\n---")
		bench(a, function(err, result) {
			Object.keys(result).forEach(function(name) {
				console.log(name + "\n  " + result[name].text + " ops/s, " + result[name].rel)
			})
		})
	}
}

