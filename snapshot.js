
var cli = require(".")
, child = require("child_process")
, path = require("path")
, relPathRe = /[^(]+(?=:\d+:\d+\))/gm
, relPathFn = path.relative.bind(path, process.cwd())

describe.assert.cmdSnapshot = function(cmd, file) {
	var actual
	try {
		actual = child.execSync(cmd).toString("utf8").replace(relPathRe, relPathFn)
	} catch(e) {
		return this(0, "Snapshot command failed: " + cmd + "\n---\n" + e.stdout.toString("utf8"))
	}
	return this.matchSnapshot(file, actual)
}

describe.assert.matchSnapshot = function(file, transform) {
	var expected
	, actual = typeof transform === "function" ? transform(cli.readFile(file)) : transform || cli.readFile(file)

	try {
		expected = cli.readFile(file + ".snap").replace(relPathRe, relPathFn)
	} catch(e) {}
	if (actual === expected) {
		this.ok(1)
	} else if (describe.conf.up) {
		console.error("# Update snapshot %s", file)
		cli.writeFile(file + ".snap", actual)
		this.ok(1)
	} else {
		try {
			child.execSync("git diff --no-index --color -- " + file + ".snap -", {
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

