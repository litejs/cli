
var cli = require(".")
, child = require("child_process")
, fs = require("fs")
, path = require("path")
, relPathRe = /[^(]+(?=:\d+:\d+\))|^(?:\/|[A-Za-z]:\\)[\w/.\\-]+(?=:\d)/gm
, cwd = process.cwd()
, relPathFn = function(p) { return path.relative(cwd, p).replace(/\\/g, "/") }
, seen = {}

/* globals describe */

function normalize(str) {
	return str.replace(/\r\n/g, "\n").replace(relPathRe, relPathFn).replace(/at \w+\.<anonymous>/g, "at <anonymous>")
}

describe.assert.cmdSnapshot = function(cmd, file, opts) {
	var actual
	opts = Object.assign({stdio: "pipe"}, opts)
	try {
		actual = child.execSync(cmd, opts)
	} catch(e) {
		actual = e
		if (!opts.expectFail) {
			return this(0, "Snapshot command failed: " + cmd + "\n---\n" + actual)
		}
	}
	return this.matchSnapshot(file, normalize(actual.toString("utf8")))
}

describe.assert.matchSnapshot = function(file, actual, snapFile) {
	if (typeof actual === "function") actual = actual(fs.readFileSync(path.resolve(file), "utf8"))
	if (!actual) actual = fs.readFileSync(path.resolve(file), "utf8")
	var expected
	, enc = typeof actual === "string" ? "utf8" : null
	, snapExt = ".snap" + (seen[file] || "")

	if (!snapFile) snapFile = file.indexOf(".") < 1 ? file + snapExt : file.replace(/\.(?!\.)/, snapExt + ".")

	seen[file] = (seen[file] || 0) + 1

	try {
		expected = fs.readFileSync(path.resolve(snapFile), enc)
		if (actual && actual.constructor === Uint8Array) expected = new Uint8Array(expected)
		if (typeof expected === "string") expected = normalize(expected)
	} catch(e) {}

	if (describe.conf.up) {
		if (!describe.equal(actual, expected)) {
			console.error("# Update snapshot %s", snapFile)
			cli.writeFile(path.resolve(snapFile), actual)
		}
		return this.ok(1)
	}

	return this.equal(actual, expected)
}
