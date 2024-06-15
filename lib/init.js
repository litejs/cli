//-
//-  Usage
//-    lj init

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
	var dir = path.join(process.cwd(), opts._[0] || "")
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

	child.spawnSync("git", ["init", "-b", "main"], stdio)
	add("litejs", "prod")
	add("@litejs/cli", "dev")
	add("@litejs/ui", "dev")

	addTemplate("ui")
	addTemplate("server")

	package.litejs = opts
	cli.writePackage(package)

	child.spawnSync("lj", ["build"], stdio)

	function add(name, dep) {
		child.spawnSync("npm", [
			opts.link ? "link" : "install", "--save-exact", "--save-" + dep, name
		], stdio)
	}
	function addTemplate(type) {
		if (opts[type]) {
			var name = (opts[type].name || opts[type]).match(/^(?:@\w+\/)?\w+/)[0]
			, source = opts[type].source || opts[type].slice(name.length + 1) || "src"
			add(name, "dev")
			cli.cp(path.join("node_modules", name, source), opts[type].target || type)
		}
	}
}

function format(str, map) {
	return str.replace(/\{(\w+)\}/g, function(_, w){
		return map[w]
	})
}

