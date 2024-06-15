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
, opts = require("./opts.js").opts(mergeOpts({
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
		fix: false
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
		min: true,
		script: true,
		out: "_site/",
	},
	test_t: {
		coverage: false,
		lcov: true,
		sources: "./*.js",
		status: true,
		tz: "",
		up: false,
		watch: false
	},
	color: true,
	help: false,
	version: true
}, [ "package.json", "litejs", ".github/litejs.json", null ]))
, libFile = opts._cmd && "./lib/" + opts._cmd + ".js"
, package = require("./package.json")
, userPackage = {}
, hasOwn = userPackage.hasOwnProperty

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

function mergeOpts(opts, searchList) {
	var file = searchList.shift()
	, key = searchList.shift()
	if (file) try {
		var conf = require(path.resolve(file))
		if (key) conf = conf[key]
		if (conf) {
			return assignOpts(opts, conf)
		}
	} catch(e) {}
	if (searchList[0]) mergeOpts(opts, searchList)
	return opts
}

function assignOpts(to, from) {
	var key, val, tmp
	for (key in to) if (hasOwn.call(to, key)) {
		tmp = key.split("_")
		val = hasOwn.call(from, tmp[0]) ? from[tmp[0]] : hasOwn.call(from, tmp[1]) ? from[tmp[1]] : null
		if (val !== null) to[key] = isObj(val) ? assignOpts(to[key], val) : val
	}
	return to
}

function isObj(obj) {
	return !!obj && obj.constructor === Object
}



