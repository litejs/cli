
var fs = require("fs")
, child = require("child_process")
, path = require("path")
, cli = require("..")
, package = {
	"name": "",
	"version": "0.0.0",
	"license": "MIT",
	"author": process.env.USER,
	"description": "LiteJS application",
	"main": "server/index.js",
	"files": [
		"server",
		"ui"
	],
	"scripts": {
		"start": "node server"
	},
	"repository": "git://github.com/{project}/{name}.git",
	"bugs": "https://github.com/{project}/{name}/issues"
}

module.exports = function(opts) {
	var tmp, undef
	, dir = path.join(process.cwd(), opts.args[0] || "")
	, stdio = {stdio: "inherit"}

	cli.mkdirp(dir)
	process.chdir(dir)

	try {
		package = require(path.join(dir, "package.json"))
		opts = Object.assign(package.litejs || {}, opts)
	} catch(e) {
		console.log("Create package.json")
		var tree = dir.split(path.sep)
		, scope = {
			name: tree.pop(),
			project: tree.pop()
		}
		package.name = scope.name
		package.repository = format(package.repository, scope)
		package.bugs = format(package.bugs, scope)
	}

	try {
		fs.statSync(".gitignore")
	} catch(e) {
		cli.cp(path.resolve(module.filename, "../../.gitignore"), ".gitignore")
	}

	child.spawnSync("git", ["init"], stdio)
	add("litejs", "prod")
	add("@litejs/ui", "dev")
	if (opts.template) {
		add(tmp = "@litejs/template-" + opts.template, "dev")
		if (opts.ui !== false) {
			cli.cp(path.join("node_modules", tmp + "/ui"), (opts.ui || "ui"))
		}
		if (opts.server !== false) {
			cli.cp(path.join("node_modules", tmp + "/server"), (opts.server || "server"))
		}
	}

	package.litejs = opts
	cli.writePackage(package)

	child.spawnSync("lj", ["build"], stdio)

	function add(name, dep) {
		if (opts.link) {
			child.spawnSync("npm", ["link", name], stdio)
		} else {
			child.spawnSync("npm", ["install", "--save-exact", "--save-" + dep, name], stdio)
		}
	}
}

function format(str, map) {
	return str.replace(/\{(\w+)\}/g, function(_, w){
		return map[w]
	})
}

