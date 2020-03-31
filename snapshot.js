
var cli = require("../lib/cli")
, child = require("child_process")
, path = require("path")
, describe = require("./").describe
, relPathRe = /[^(]+(?=:\d+:\d+\))/gm
, relPathFn = path.relative.bind(path, process.cwd())

describe.assert.matchSnapshot = function(file, transform) {
	var expected
	, actual = typeof transform === "function" ? transform(cli.readFile(file)) : transform

	actual = actual.replace(relPathRe, relPathFn)
	try {
		expected = cli.readFile(file + ".snap").replace(relPathRe, relPathFn)
	} catch(e) {
		expected = ""
	}

	if (actual !== expected && describe.conf.ok) {
		console.error("# Update snapshot %s", file)
		cli.writeFile(file + ".snap", actual)
		this.ok(1)
	} else {
		this.equal(actual, expected, "Snapshot " + file + "\n---\n" + actual + "\n---\n" + expected)
	}

	return this
}

