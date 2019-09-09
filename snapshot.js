
var cli = require("../lib/cli")
, describe = require("./").describe

describe.assert.matchSnapshot = function(file, transform) {
	var expected
	, actual = transform(cli.readFile(file))

	try {
		expected = cli.readFile(file + ".snap")
	} catch(e) {
		expected = ""
	}

	if (actual !== expected && describe.argv.indexOf("-u") > -1) {
		console.error("# Update snapshot %s", file)
		cli.writeFile(file + ".snap", actual)
	} else {
		this.equal(actual, expected, "Snapshot " + file + "\n---\n" + actual + "\n---\n" + expected)
	}

	return this
}

