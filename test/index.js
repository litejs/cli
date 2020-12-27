
require("../test.js")

describe("cli", function() {
	var fs = require("fs")
	, cli = require("..")

	this.should("pass", function(assert, mock) {
		var errLog = mock.fn()
		mock.replace(console, "error", errLog)

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
})

describe("Test", function() {
	require("./assert.js")
	require("./test.js")
})

