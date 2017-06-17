#!/usr/bin/env node

var fs = require("fs")
, process = require("process")
, child = require("child_process")
, opts = {}

function getopts(args, i, opts) {
	for (var arg; arg = args[i++]; ) {
		switch (arg) {
		case "-b":
		case "--banner":
			opts.banner = args[i++]
			break;
		default:
			if (arg.charAt(0) == "-") {
				args.splice.apply(
					args,
					[i, 0].concat(arg.replace(/\w(?!$)/g,"$& " + args[i] + " -").split(" "))
				)
			} else if (!opts.cmd) {
				opts.cmd = arg
			} else {
				opts.file = arg
			}
		}
	}
}

getopts(process.argv, 2, opts)

switch (opts.cmd) {
case "init":
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
	child.spawnSync("npm", ["init"], {stdio: "inherit"})
	child.spawnSync("npm", ["install", "--save", "litejs"], {stdio: "inherit"})
}



