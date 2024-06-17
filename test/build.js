

describe("build", function() {
	var build = require("../lib/build.js")
	, cli = require("..")

	require("../snapshot.js")

	describe("file {0}", [
		["build-cp"],
		["build-inline"],
		["build-simple"],
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
})

