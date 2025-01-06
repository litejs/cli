//-
//-  Usage
//-    lj lint


module.exports = function(opts) {
	var vm = require("vm")
	, exit = 0
	, child = require("child_process")
	, { ls, readFile, writeFile } = require("..")
	, { CSSStyleSheet } = require("@litejs/dom")
	, invalidNameRe = /^[-\/]|[^-\/a-z0-9.]|[-\/]$/i
	, whitespaceErrRe = /^ +\t|^\t+ |\r|[ \t]$/m
	, files = ls(opts._, { dir: false })
	, jsFiles = files.filter(byExt(".js"))
	, formatNeeded = [].concat(
		validate(files, "css", isValidCss),
		validate(files, "js", isValidJs),
		validate(files, "json", isValidJson)
	)
	if (opts.jshint && jsFiles[0]) try {
		child.execSync("npx jshint --config=" + opts.jshint + " " + jsFiles.join(" "), { stdio: ["ignore", 1, 2]})
	} catch(e) {
		exit = 1
	}

	if (formatNeeded.length > 0) {
		console.log("lint error: Format needed: " + formatNeeded.join(", "))
		exit = 1
	}

	if (!files[0]) return console.error("No files to lint: " + opts._)
	if (exit) process.exit(exit)
	else console.log("# Lint OK %s files:", files.length, files.join(", "))

	function validate(files, ext, validator) {
		return files.filter(function(name) {
			return name.split(".").pop() === ext && (
				!isValidName(name) ||
				!validator(name, readFile(name))
			)
		})
	}

	function byExt(ext) {
		return function(name) {
			return name.slice(-ext.length) === ext
		}
	}

	function isValidName(name) {
		if (!invalidNameRe.test(name)) return true
		console.error("Invalid file name:", JSON.stringify(name))
	}

	function isValidCss(file, content) {
		try {
			var sheet = new CSSStyleSheet()
			sheet.replaceSync(content)
			checkWhitespaces(file, content)
			return true
		} catch(e) {
			console.error(e)
		}
	}

	function isValidJson(file, content) {
		try {
			var expected = JSON.stringify(JSON.parse(content), null, 2) + "\n"
			if (content === expected) return true
			if (opts.fix) {
				writeFile(file, expected)
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
			checkWhitespaces(file, content)
			return !!script
		} catch(e) {
			console.error(e)
		}
	}

	function checkWhitespaces(file, content) {
		if (whitespaceErrRe.test(content)) {
			var m = content.match(whitespaceErrRe)
			console.log(m.index, JSON.stringify( content.slice(Math.max(0, m.index - 10 ), m.index + 10)))
			throw "White space error in " + file
		}
	}
}




