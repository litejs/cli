
var fs = require("fs")
, child = require("child_process")

module.exports = function(opts) {
	var existing, tmp
	, path = process.cwd() + (opts.file ? "/" + opts.file : "")

	try {
		existing = require(path + "/package.json")
	} catch(e){}

	if (existing) {
		throw (existing.name || "-unnamed-") + " exists"
	}

	try {
		fs.statSync(path)
	} catch (e) {
		fs.mkdirSync(path)
	}
	process.chdir(path)
	module.paths = require("module")._nodeModulePaths(process.cwd())

	child.spawnSync("npm", ["init"], {stdio: "inherit"})
	child.spawnSync("npm", ["install", "--save", "litejs@next"], {stdio: "inherit"})
	fs.mkdirSync("ui")
	console.log("paths", module.paths)
	child.spawnSync("cp", [require.resolve("litejs/ui/dev.html"), "ui/dev.html"], {stdio: "inherit"})
	//fs.copyFileSync(require.resolve("litejs/ui/dev.html"), "ui/dev.html")
}

