

describe("build", function() {
	var fs = require("fs")
	, build = require("../lib/build.js")
	, cli = require("..")

	require("../snapshot.js")

	cli.rmrf("test/data/temp")

	describe("file {0}", [
		["build-inline"],
		["build-simple"],
		["build-ui-css"],
	], function(name) {
		test("to {0}", [
			[ "same folder", "" ],
			[ "build folder", "build/" ],
		], function(x, outDir, assert, mock) {
			var temp = "test/data/temp/" + assert.i + "/"
			, prefix = "test/data/snap/" + assert.i + "/"

			mock.swap(console, "error", mock.fn())
			cli.cp("test/data/" + name, temp)
			var initialFiles = cli.ls(temp + "**/*", { dir: false })

			cli.mkdirp(temp + outDir)

			build({ _: [temp + "dev.html"], out: temp + outDir + "index.html", assetsKeep: ["*.webmanifest"] })
			var createdFiles = cli.ls(temp + "**/*", { dir: false }).filter(function(file) {
				return initialFiles.indexOf(file) < 0
			})
			assert.planned = initialFiles.length + createdFiles.length + 2
			assert.matchSnapshot(prefix + "ls", ".\n" + cli.ls(temp + "**/*").map(function(f) { return "./" + f.slice(temp.length) }).sort().join("\n") + "\n")
			assert.matchSnapshot(temp + outDir + "index.html", 0, prefix + "index.html")
			initialFiles.forEach(function(file) {
				file = file.replace("index.html", "dev.html")
				assert.matchSnapshot(file.replace("/temp/" + assert.i, "/" + name), 0, file)
			})
			createdFiles.forEach(function(file) {
				try {
					assert.matchSnapshot(file, 0, file.replace("/temp/", "/snap/"))
				} catch(e) {
					assert(false, e)
				}
			})
			cli.rmrf(temp)
		})
	})

	var temp = "test/data/temp/js-ui/"
	, files = ["test/data/build-ui-css/app.js", "test/data/build-ui-css/style.css", "test/data/build-ui-css/view.ui"]
	test("js build with ui transform", function(assert, mock) {
		mock.swap(console, "error", mock.fn())
		mock.swap(console, "log", mock.fn())
		build({ _: files, out: temp + "out.js" })
		assert.matchSnapshot(temp + "out.js", 0, "test/data/snap/js-ui/out.js")
		cli.rmrf(temp)
		assert.end()
	})

	test("js build keeps es5 syntax by default", function(assert, mock) {
		mock.swap(console, "log", mock.fn())
		build({ _: ["test/data/build-target/app.js"], out: temp + "es5.js" })
		assert.equal(cli.readFile(temp + "es5.js").trim(), "var f=1,e={f:f};")
		cli.rmrf(temp)
		assert.end()
	})

	test("js build with --jsTarget", function(assert, mock) {
		mock.swap(console, "log", mock.fn())
		build({ _: ["test/data/build-target/app.js"], out: temp + "es2018.js", jsTarget: "es2018" })
		assert.equal(cli.readFile(temp + "es2018.js").trim(), "var f=1,e={f};")
		cli.rmrf(temp)
		assert.end()
	})

	test("js build hints --jsTarget for newer syntax", function(assert, mock) {
		mock.swap(console, "log", mock.fn())
		try {
			build({ _: ["test/data/build-target/rest.js"], out: temp + "rest.js" })
			assert.ok(0, "should throw")
		} catch(e) {
			assert.ok(e.message.indexOf("Minified JS needs a newer --jsTarget than es5, eg es2018\n") === 0, e.message)
		}
		cli.rmrf(temp)
		assert.end()
	})

	test("ui build with --out", function(assert, mock) {
		mock.swap(console, "error", mock.fn())
		mock.swap(console, "log", mock.fn())
		build({ _: files, out: temp + "out.ui" })
		assert.matchSnapshot(temp + "out.ui", 0, "test/data/snap/ui-build/out.ui")
		cli.rmrf(temp)
		assert.end()
	})

	test("ui build with --min", function(assert, mock) {
		mock.swap(console, "error", mock.fn())
		mock.swap(console, "log", mock.fn())
		build({ _: files, min: temp + "min-{h}.ui" })
		var out = cli.ls(temp + "*.ui", { dir: false })
		assert.equal(out.length, 1)
		assert.ok(out[0].indexOf("{h}") < 0, "hash should be resolved")
		assert.matchSnapshot(out[0], 0, "test/data/snap/ui-build/min.ui")
		cli.rmrf(temp)
		assert.end()
	})

	test("js build with --jsmin command and --banner", function(assert, mock) {
		mock.swap(console, "log", mock.fn())
		build({ _: ["test/data/build-target/app.js"], out: temp + "cmd.js", jsmin: "cat", banner: "x 1.0" })
		assert.equal(cli.readFile(temp + "cmd.js"), "/*! x 1.0 */\n\nvar f = 1, e = {f: f}\n\n")
		build({ _: ["test/data/build-target/app.js"], out: temp + "es5.js" })
		assert.equal(cli.readFile(temp + "es5.js").trim(), "var f=1,e={f:f};")
		cli.rmrf(temp)
		assert.end()
	})

	test("build without a supported --out", function(assert, mock) {
		var log = mock.fn()
		mock.swap(console, "log", log)
		build({ _: ["test/data/build-simple/a.css"], out: temp + "out.css" })
		assert.equal(log.calls[0].args, ["Nothing to build, use --out=build/index.html"])
		assert.notOk(fs.existsSync(temp))
		assert.end()
	})

	test("html build with --no-cat", function(assert, mock) {
		var err = mock.fn()
		, dir = "test/data/temp/no-cat/"
		mock.swap(console, "error", err)
		mock.swap(console, "log", mock.fn())
		cli.cp("test/data/build-inline", dir)
		build({ _: [dir + "dev.html"], out: dir + "index.html" })
		cli.writeFile(dir + "lib1.js", "var kept = 1")
		build({ _: [dir + "dev.html"], out: dir + "index.html", cat: false })
		assert.ok(err.calls.some(c => c.args[0] === "CAT DISABLED"))
		assert.equal(cli.readFile(dir + "lib1.js"), "var kept = 1")
		cli.rmrf(dir)
		assert.end()
	})

	test("html build with --worker", function(assert, mock) {
		var err = mock.fn()
		, dir = "test/data/temp/worker/"
		mock.swap(console, "error", err)
		mock.swap(console, "log", mock.fn())
		cli.cp("test/data/build-simple", dir)
		cli.writeFile(dir + "sw.js", "\nvar VERSION = \"0\"\n, FILES = [\"a.css?\", \"d.css\"]\n")
		build({ _: [dir + "dev.html"], out: dir + "index.html", worker: "sw.js" })
		var sw = cli.readFile(dir + "sw.js")
		assert.ok(/VERSION = "\d{4}-\d\d-\d\dT[\d:.]+Z"/.test(sw), sw)
		assert.ok(sw.indexOf(', FILES = [\n\t"a.css?",\n\t"d.css"\n]') > -1, sw)
		assert.equal(err.calls.pop().args, ["# Update worker: sw.js\n'" + dir + "a.css' not commited?\n'" + dir + "d.css' not commited?"])
		cli.rmrf(dir)
		assert.end()
	})
})

