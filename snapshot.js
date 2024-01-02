
var cli = require(".")
, child = require("child_process")
, fs = require("fs")
, path = require("path")
, relPathRe = /[^(]+(?=:\d+:\d+\))/gm
, relPathFn = path.relative.bind(path, process.cwd())
, seen = {}

/* globals describe */
describe.assert.cmdSnapshot = function(cmd, file, opts) {
	var actual
	try {
		actual = child.execSync(cmd, opts).toString("utf8").replace(relPathRe, relPathFn)
	} catch(e) {
		if (opts.expectFail) {
			actual = e.toString()
		} else {
			return this(0, "Snapshot command failed: " + cmd + "\n---\n" + e.toString())
		}
	}
	return this.matchSnapshot(file, actual)
}

describe.assert.matchSnapshot = function(file, actual) {
	if (!actual) actual = fs.readFileSync(path.resolve(file), "utf8")
	var expected
	, snapExt = ".snap" + (seen[file] || "")
	, snapFile = file.indexOf(".") < 1 ? file + snapExt : file.replace(/\.(?!\.)/, snapExt + ".")
	, enc = typeof actual === "string" ? "utf8" : null

	seen[file] = (seen[file] || 0) + 1

	try {
		expected = fs.readFileSync(path.resolve(snapFile), enc)
		if (actual && actual.constructor === Uint8Array) expected = new Uint8Array(expected)
		if (typeof expected === "string") expected = expected.replace(relPathRe, relPathFn)
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


