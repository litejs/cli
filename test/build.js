

describe("build", function() {
	var build = require("../lib/build.js")
	, cli = require("..")

	require("../snapshot.js")

	describe("file {0}", [
		["build-cp",     [], [/*"build/a.svg", "build/b.svg",*/ "build/c.svg"]],
		["build-inline", ["lib1.css", "lib2.css"], ["lib1.css", "lib2.css"]],
		["build-simple", [], []],
		//["test/ui/dev.html", "test/ui/index.html", [
		//	"test/ui/lib1.css", "test/ui/lib2.css"
		//]],
		//["test/ui/dev.html", "test/ui/min/index.html", [
		//	"test/ui/lib1.css", "test/ui/lib2.css",
		//	"test/ui/min/manifest.json",
		//	"test/ui/min/image.svg"
		//]]
	], function(name, sameFolderFiles, buildFolderFiles) {
		test("to {0}", [
			[ "same folder", "", sameFolderFiles ],
			[ "build folder", "build/", buildFolderFiles ],
		], function(x, outDir, files, assert, mock) {
			var temp = "test/build-temp-" + assert.i + "/"
			, prefix = "test/data/snap/" + assert.i + "-"

			mock.swap(console, "error", mock.fn())
			cli.mkdirp(temp + outDir)
			cli.cp("test/data/" + name, temp)

			assert.planned = files.length + 2

			build({ _: [temp + "dev.html"], out: temp + outDir + "index.html" })
			assert.cmdSnapshot("cd " + temp + ";find .|sort", prefix + "ls")
			assert.matchSnapshot(temp + outDir + "index.html", 0, prefix + "index.html")
			files.forEach(function(name) {
				try {
					assert.matchSnapshot(temp + name, 0, prefix + name)
				} catch(e) {
					assert(false, e)
				}
			})
			cli.rmrf(temp)
		})

	})
})

