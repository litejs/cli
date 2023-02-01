

describe("build", function() {
	require("../snapshot.js")
	var build = require("../cli/build.js")

	var table = [
		["test/ui/dev.html", "test/ui/index.html", [
			"test/ui/lib1.css", "test/ui/lib2.css"
		]],
		["test/ui/dev.html", "test/ui/min/index.html", [
			"test/ui/lib1.css", "test/ui/lib2.css",
			"test/ui/min/manifest.json",
			"test/ui/min/image.svg"
		]]
	]

	it ("should minimize html", table, function(inFile, outFile, arr, assert) {
		assert.planned = arr.length + 2
		build({ args: [inFile], out: outFile })
		assert.matchSnapshot(inFile)
		assert.matchSnapshot(outFile)
		arr.forEach(function(name) {
			assert.matchSnapshot(name)
		})
	})
})

