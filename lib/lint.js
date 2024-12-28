//-
//-  Usage
//-    lj lint


module.exports = function(opts) {
	var vm = require("vm")
	, cli = require("..")
	, fileNameRe = /^(?:\/?[a-z0-9](?:[-.]?[A-Za-z0-9])*)+\.[a-z0-9]+$/
	, whitespaceErrRe = /^ +\t|^\t+ |\r|[ \t]$/m
	, files = cli.ls(opts._[0] ? opts._ : ["*.json","*.js"], { dir: false })
	, formatNeeded = [].concat(
		validate(files, "js", isValidJs),
		validate(files, "json", isValidJson)
	)
	if (!files[0]) return console.error("No files to lint: " + opts._)
	if (formatNeeded.length > 0) {
		console.log("lint error: Format needed: " + formatNeeded.join(", "))
		process.exit(1)
	} else {
		console.log("# Lint OK %s files:", files.length, files.join(", "))
	}

	function validate(files, ext, validator) {
		return files.filter(function(name) {
			return name.split(".").pop() === ext && (
				!isValidName(name) ||
				!validator(name, cli.readFile(name))
			)
		})
	}

	function isValidName(name) {
		if (fileNameRe.test(name)) return true
		console.error("Invalid file name:", JSON.stringify(name))
	}

	function isValidJson(file, content) {
		try {
			var expected = JSON.stringify(JSON.parse(content), null, 2) + "\n"
			if (content === expected) return true
			if (opts.fix) {
				cli.writeFile(file, expected)
				console.log("# Lint fix:", file)
				return true
			}
		} catch(e) {
			console.error(e)
		}
	}

	function isValidJs(file, content) {
		try {
			// Does it compiles?
			var script = new vm.Script(content, { filename: file })
			if (whitespaceErrRe.test(content)) {
				throw "White space error in " + file
			}
			return !!script
		} catch(e) {
			console.error(e)
		}
	}
}




