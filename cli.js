#!/usr/bin/env node
//-
//-  Usage
//-    lj [init|bench|build|help|test]
//-
//-  build options
//-    --banner, -b    Add comment banner to output
//-    --input,  -i    Input file
//-    --output, -o    Output file
//-    --readme, -r    Replase readme tags in file
//-
//-  Examples
//-    lj b -r README.md -i ui/dev.html -o ui/index.html
//-    lj r
//-

var fs = require("fs")
, path = require("path")
, opts = require("./opts.js").opts({
	bench: {
		samples: 10,
		sampleTime: 500,
		warmup: 2000
	},
	build_b: {
		banner: "",
		cat: true,
		fetch: true,
		out: "",
		readme: "",
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


if (opts.tz) process.env.TZ = opts.tz

if (opts._unknown[0] && opts._cmd !== "test") {
	console.error("\nError: Unknown option: " + opts._unknown)
	usage(true)
	process.exit(1)
} else if (libFile && !opts.help) {
	if (opts.version) console.error("# %s %s@%s with %s@%s", opts._cmd, userPackage.name, userPackage.version, package.name, package.version)
	require(libFile)(opts)
} else {
	usage()
}

function usage(err) {
	if (!err && opts.version) console.log("%s v%s", package.name, package.version)
	var helpFile = libFile ? path.resolve(module.filename, "." + libFile) : module.filename
	console.log(fs.readFileSync(helpFile, "utf8").match(/^\/\/-.*/gm).join("\n").replace(/^.../gm, ""))
}



