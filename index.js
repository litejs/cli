#!/usr/bin/env node

var fs = require("fs")
, path = require("path")
, child = require("child_process")
, opts = {}

global.Fn = require("../fn").Fn

exports.cp = cp
exports.mkdirp = mkdirp
exports.readFile = readFile
exports.writeFile = writeFile

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


switch (process.argv[2]) {
case "init":
	getopts(process.argv.slice(0), 2, opts)
	require("./" + process.argv[2])(opts)
	break;
case "init-app":
case "init-ui":
	child.spawnSync("cp", ["-rv",
		process.argv[2].replace("init-", "./node_modules/litejs/lib/template/default/"),
		process.cwd() + (opts.file ? "/" + opts.file : "")
	], {stdio: "inherit"})
	break;
case "build":
	require("./build").execute(process.argv, 3)
	break;
default:
	console.log("Usage: litejs [init|build]")
}

function cp(src, dest) {
	if (fs.copyFileSync) {
		fs.copyFileSync(src, dest)
	} else {
		fs.writeFileSync(dest, fs.readFileSync(src))
	}
}

function mkdirp(dir) {
	try {
		fs.statSync(dir)
	} catch (e) {
		mkdirp(path.dirname(dir))
		console.log("mkdir", dir)
		fs.mkdirSync(dir)
	}
}

function readFile(fileName) {
	return fs.readFileSync(path.resolve(fileName.split("?")[0]), "utf8")
}

function writeFile(fileName, content) {
	fs.writeFileSync(path.resolve(fileName.split("?")[0]), content, "utf8")
}



