
var fs = require("fs")
, child = require("child_process")
, cli = require("./index.js")
, package = {
	"name": "unnamed",
	"version": "0.0.0",
	"license": "MIT",
	"author": "",
	"description": "LiteJS application",
	"main": "app/index.js",
	"readmeFilename": "README.md",
	"files": [
		"app",
		"ui"
	],
	"scripts": {
		"build": "litejs build -i ui/dev.html -o ui/index.html",
		"start": "node app",
		"test": "node --allow-natives-syntax test/index.js",
		"test-trace": "node --allow-natives-syntax --trace_opt --trace_deopt test/index.js"
	},
	"repository": "",
	"bugs": {
		"url": ""
	}
}

module.exports = function(opts) {
	var path = process.cwd() + (opts.file ? "/" + opts.file : "")

	cli.mkdirp(path)
	process.chdir(path)

	try {
		require(path + "/package.json")
	} catch(e){
		package.name = path.replace(/.*\//, "")
		cli.writeFile("package.json", JSON.stringify(package, null, "  "))
	}

	//child.spawnSync("npm", ["install", "--save-prod", "litejs@next"], {stdio: "inherit"})
	child.spawnSync("npm", ["link", "litejs"], {stdio: "inherit"})
	child.spawnSync("./node_modules/.bin/litejs", ["init-app", "app"], {stdio: "inherit"})
	child.spawnSync("./node_modules/.bin/litejs", ["init-ui", "ui"], {stdio: "inherit"})
}

