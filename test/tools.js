
describe("tools", function() {
	var fs = require("fs")
	, child = require("child_process")
	, path = require("path")
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
		"test/data/**/*",
		"test/[ab]*.js",
		"test/**/a*.js",
	], function(glob, assert) {
		assert.equal(
			cli.ls(glob).join(" "),
			child.execSync("bash -c 'shopt -s globstar;echo " + glob + "'").toString("utf8").trim()
		)
		assert.end()
	})

	it ("should list .dot files", function(assert) {
		cli.mkdirp(".github/.dot")
		cli.cp("package.json", ".github/.dot/p.json")
		cli.cp(".github/.dot", ".github/.dot2")
		assert.equal(
			cli.ls(".*/.d*", null, ".github").join(" "),
			child.execSync("bash -c 'shopt -s globstar;echo .github .*/.d*'").toString("utf8").trim()
		)
		// Assert options
		assert.equal(cli.ls(".github/*", { dir: false }).join(" "), ".github/jshint.json .github/litejs.json")
		assert.equal(cli.ls("*", { cwd: ".github", dir: false }).join(" "), "jshint.json litejs.json")
		assert.own(cli.ls("*", { cwd: ".github", stat: true }), [
			{ size: 225,  name: "jshint.json" },
			{ size: 21,   name: "litejs.json" },
			{ size: 4096, name: "workflows" }
		])
		assert.equal(cli.ls(".github/*", { file: false }).join(" "), ".github/workflows")
		assert.equal(cli.ls(".github/*", { file: false, root: "/www/" }).join(" "), "/www/.github/workflows")
		assert.equal(cli.ls(".github/*", { file: false, absolute: true }).join(" "), path.join(process.cwd(), ".github/workflows"))
		assert.equal(cli.ls(".github/*", { dot: true }).join(" "), ".github/.dot .github/.dot2 .github/jshint.json .github/litejs.json .github/workflows")
		cli.rmrf(".github/.dot")
		cli.rmrf(".github/.dot2")
		assert.end()
	})

	it ("should deepAssign", function(assert) {
		cli.deepAssign({}, JSON.parse('{"__proto__": {"devMode": true}}'))
		assert.notOk({}.devMode)
		assert.end()
	})
})

