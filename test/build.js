

describe("build", function() {
	var build = require("../lib/build.js")
	, cli = require("..")

	require("../snapshot.js")

	describe("file {0}", [
		["build-cp"],
		["build-inline"],
		["build-simple"],
		["build-ui-css"],
		//["test/ui/dev.html", "test/ui/index.html", [
		//	"test/ui/lib1.css", "test/ui/lib2.css"
		//]],
		//["test/ui/dev.html", "test/ui/min/index.html", [
		//	"test/ui/lib1.css", "test/ui/lib2.css",
		//	"test/ui/min/manifest.json",
		//	"test/ui/min/image.svg"
		//]]
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

			build({ _: [temp + "dev.html"], out: temp + outDir + "index.html" })
			var createdFiles = cli.ls(temp + "**/*", { dir: false }).filter(function(file) {
				return initialFiles.indexOf(file) < 0
			})
			assert.planned = initialFiles.length + createdFiles.length + 2
			assert.cmdSnapshot("cd " + temp + ";find .|sort", prefix + "ls")
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
})

