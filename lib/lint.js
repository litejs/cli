//-
//-  Usage
//-    lj lint


module.exports = function(opts) {
	var cli = require("..")
	, files = cli.ls(opts._[0] ? opts._ : "*.json")
	, formatNeeded = files.filter(function(file) {
		var ext = file.split(".").pop()
		if (ext === "json") return !jsonValid(file)
		return true
	})
	if (!files[0]) return console.error("No files found: " + opts._)
	if (formatNeeded.length > 0) {
		console.log("lint error: Format needed: " + formatNeeded.join(", "))
		process.exit(1)
	} else {
		console.log("# Lint OK %s files", files.length)
	}


	function jsonValid(file) {
		var str = cli.readFile(file)
		try {
			var expected = JSON.stringify(JSON.parse(str), null, 2) + "\n"
			if (str === expected) return true
			if (opts.fix) {
				cli.writeFile(file, expected)
				console.log("# Lint fix:", file)
				return true
			}
		} catch(e) {
			console.error(e)
		}
	}
}




