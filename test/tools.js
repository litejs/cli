
describe("tools", function() {
	var fs = require("fs")
	, child = require("child_process")
	, cli = require("..")

	it ("should check command exists", [
		[ "node", true ],
		[ "nnn-non-existing", false ]
	], function(cmd, expected, assert) {
		assert.equal(cli.command(cmd), expected).end()
	})

	it ("should create and remove files", function(assert, mock) {
		var errLog = mock.fn()
		mock.swap(console, "error", errLog)

		assert.throws(function() {
			fs.statSync("test/blabla")
		})

		cli.mkdirp("test/blabla/deep")

		fs.statSync("test/blabla")

		cli.rmrf("test/blabla")

		assert.throws(function() {
			fs.statSync("test/blabla")
		})
		assert.throws(function() {
			cli.rmrf("/")
		})
		assert.end()
	})

	it ("should list files: {0}", [
		"test/index.js",
		"*.js",
		"test/[ab]*.js",
		"test/**/a*.js",
	], function(glob, assert) {
		assert.equal(
			cli.ls(glob).join(" "),
			child.execSync("bash -c 'shopt -s globstar;echo " + glob + "'").toString("utf8").trim()
		)
		assert.end()
	})

	it ("should list files with options", [
		[ "*", { dir: false }, "README.md bench.js browser.js cli.js index.js opts.js package.json snapshot.js test.js v8.js watch.js" ],
	], function(glob, opts, expected, assert) {
		assert.equal(cli.ls(glob, opts).join(" "), expected).end()
	})

	it ("should list .dot files", function(assert) {
		cli.mkdirp(".github/.dot")
		cli.cp("package.json", ".github/.dot/p.json")
		cli.cp(".github/.dot", ".github/.dot2")
		assert.equal(
			cli.ls(".*/.d*", null, ".github").join(" "),
			child.execSync("bash -c 'shopt -s globstar;echo .github .*/.d*'").toString("utf8").trim()
		)
		cli.rmrf(".github/.dot")
		cli.rmrf(".github/.dot2")
		assert.end()
	})
})

