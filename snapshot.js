
var cli = require("../lib/cli")
, describe = require("./").describe

describe.assert.matchSnapshot = function(file, transform) {
	var expected
	, actual = typeof transform === "function" ? transform(cli.readFile(file)) : transform

	try {
		expected = cli.readFile(file + ".snap")
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

