#!/usr/bin/env node
//-
//-  Usage
//-    lj [init|bench|build|help|test]
//-
//-  build options
//-    --banner        Add commented banner to output
//-    --cat           Build src files (default: true)
//-    --assets        URL template for assets eg "assets/{h}.{ext}"
//-    --fetch         Fetch remote resources (default: true)
//-    --min           Minified output file
//-    --out           Output file
//-    --readme        Replace readme tags in file
//-    --ver           Override version string
//-    --worker        Update worker file
//-
//-  Examples
//-    lj b --out=ui/index.html ui/dev.html
//-    lj r
//-

var fs = require("fs")
, path = require("path")
, cli = require("./index.js")
, opts = require("./opts.js").opts({
	bench: {
		samples: 10,
		sampleTime: 500,
		warmup: 2000
	},
	build_b: {
		banner: "",
		cat: true,
		assets: "{h}.{ext}",
		fetch: true,
		jsmin: "",
		min: "",
		out: "",
		readme: "",
		ver: "",
		worker: ""
	},
	init_i: {},
	lint: {
		jshint: "",
		fix: false,
		_: ["*.css", "*.json", "*.js"]
	},
	release_r: {
		build: true,
		commit: true,
		global: "",
		install: true,
		lint: true,
		rewrite: false,
		tag:true,
		test: true,
		update: true,
		upstream: true
	},
	serve: {
		port: 8080
	},
	static: {
		base: "",
		cat: true,
		fetch: true,
		min: true,
		script: true,
		out: "_site/",
	},
	"ui-test": {
		port: 8091,
		budget: 5000,
		_: ["test/index.html"]
	},
	test_t: {
		status: true,
		tz: "",
		up: false,
		watch: false,
		_: ["test/*.js"]
	},
	color: true,
	help: false,
	version: true
}, "package.json#litejs,.github/litejs.json")
, libFile = opts._cmd && "./lib/" + opts._cmd + ".js"
, package = require("./package.json")
, userPackage = {}

try {
	userPackage = require(path.resolve("package.json"))
} catch(e) {}

var ver = package.name + "@" + package.version + " on " + cli.engine + "@" + cli.engineVersion

if (opts.tz) process.env.TZ = opts.tz

if (opts._unknown[0] && opts._cmd !== "test") {
	console.error("\nError: Unknown option: " + opts._unknown)
	usage(true)
	process.exit(1)
} else if (libFile && !opts.help) {
	if (opts.version) console.error("# %s %s@%s with %s", opts._cmd, userPackage.name, userPackage.version, ver)
	require(libFile)(opts)
} else {
	usage()
}

function usage(err) {
	if (!err && opts.version) console.log("# %s", ver)
	var helpFile = libFile ? path.resolve(module.filename, "." + libFile) : module.filename
	console.log(fs.readFileSync(helpFile, "utf8").match(/^\/\/-.*/gm).join("\n").replace(/^.../gm, ""))
}



