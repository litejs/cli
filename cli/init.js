
var fs = require("fs")
, child = require("child_process")
, path = require("path")
, cli = require("./index.js")
, package = {
	"name": "",
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
	"repository": "git://github.com/{project}/{name}.git",
	"bugs": {
		"url": "https://github.com/{project}/{name}/issues"
	}
}

module.exports = function(opts) {
	var dir = path.join(process.cwd(), opts.file || "")

	cli.mkdirp(dir)
	process.chdir(dir)

	try {
		require(path.join(dir, "package.json"))
	} catch(e) {
		console.log("Create package.json")
		makePackage(dir)
		cli.cp(path.resolve(__dirname, "../template/README.md"), "README.md")
	}

	try {
		fs.statSync(".gitignore")
	} catch(e) {
		console.log("Create .gitignore")
		cli.cp(path.resolve(__dirname, "../../.gitignore"), ".gitignore")
	}

	child.spawnSync("npm", ["install", "--save-prod", "litejs"], {stdio: "inherit"})
	//child.spawnSync("npm", ["link", "litejs"], {stdio: "inherit"})
	child.spawnSync("./node_modules/.bin/litejs", ["init-app", "app"], {stdio: "inherit"})
	child.spawnSync("./node_modules/.bin/litejs", ["init-ui", "ui"], {stdio: "inherit"})
	child.spawnSync("git", ["init"], {stdio: "inherit"})
	child.spawnSync("npm", ["run", "build"], {stdio: "inherit"})
}

function makePackage(dir) {
	var tree = dir.split(path.sep)
	, scope = {
		name: tree.pop(),
		project: tree.pop()
	}
	package.author = process.env.USER
	package.name = scope.name
	package.repository = package.repository.format(scope)
	package.bugs.url = package.bugs.url.format(scope)
	cli.writeFile("package.json", JSON.stringify(package, null, "  "))
}

