
require("../test.js")

describe("cli", function() {
	var fs = require("fs")
	, child = require("child_process")
	, cli = require("..")

	this.should("pass", function(assert, mock) {
		var errLog = mock.fn()
		mock.swap(console, "error", errLog)

		assert.ok(cli.command("node"))
		assert.notOk(cli.command("nnnn" + Math.random().toString(32).slice(2)))

		assert.throws(function() {
			fs.statSync("test/blabla")
		})

		cli.mkdirp("test/blabla/deep")

		fs.statSync("test/blabla")

		cli.rmrf("test/blabla")

		assert.throws(function() {
			fs.statSync("test/blabla")
		})
		assert.end()
	})

	it ("should list files", function(assert) {
		function comp(glob) {
			assert.equal(
				cli.ls(glob).join(" "),
				child.execSync("bash -c 'shopt -s globstar;echo " + glob + "'").toString("utf8").trim()
			)
		}
		comp("test/index.js")
		comp("*.js")
		comp("test/[ab]*.js")
		comp("**/a*.js")
		assert.end()
	})
})

describe("Test", function() {
	require("./test.js")
	require("./snapshot.js")
	require("./v8.js")
})

