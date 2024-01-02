
var cli = require(".")
, child = require("child_process")
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
	, snapFile = file + ".snap" + (seen[file] || "")

	seen[file] = (seen[file] || 0) + 1

	try {
		expected = cli.readFile(snapFile).replace(relPathRe, relPathFn)
	} catch(e) {}
	if (actual === expected) {
		this.ok(1)
	} else if (describe.conf.up) {
		console.error("# Update snapshot %s", file)
		cli.writeFile(snapFile, actual)
		this.ok(1)
	} else {
		try {
			child.execSync("git diff --no-index --color -- " + snapFile + " -", {
				input: actual,
				encoding: "utf8"
			})
		/* c8 ignore next */
		} catch(e) {
			return this(0, e.stdout ?
				"Snapshot " + file + "\n---\n" + e.stdout :
				"Snapshot diff failed, add --up to update snapshot\n---\n" + e.stderr
			)
		}
	}

	return this
}

