#!/usr/bin/env node
//-
//-  Usage
//-    litejs [init|build|help]
//-
//-  build options
//-    --banner, -b    Add commented banner to output
//-    --input, -i     Input file
//-    --output, -o    Output file
//-    --readme, -r    Replase readme tags in file
//-
//-  Examples
//-    litejs build -r README.md -i ui/dev.html -o ui/index.html
//-

var fs = require("fs")
, path = require("path")
, child = require("child_process")
, opts = {}

global.Fn = require("../fn").Fn

exports.command = command
exports.cp = cp
exports.mkdirp = mkdirp
exports.readFile = readFile
exports.rmrf = rmrf
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


if (!module.parent) {
	var helpFile = __filename
	, subHelp = [
		"build"
	]
	switch (process.argv[2]) {
	case "build":
		require("./build").execute(process.argv, 3)
		break;
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
	case "help":
		if (subHelp.indexOf(process.argv[3]) > -1) {
			helpFile = path.join(path.dirname(__filename), process.argv[3] + ".js")
		}
	default:
		console.log(readFile(helpFile).match(/^\/\/-.*/gm).join("\n").replace(/^.../gm, ""))
	}
}

function command(name) {
	var cmd = process.platform === "win32" ? "where " : "command -v "
	try {
		return !!child.execSync(cmd + name)
	} catch (e) {
		return false
	}
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
		console.error("mkdir", dir)
		fs.mkdirSync(dir)
	}
}

function readFile(fileName) {
	return fs.readFileSync(path.resolve(fileName.split("?")[0]), "utf8")
}

// On windows unlinking an opened file will mark it for deletion and the file is still there until it is closed.
// With anti-virus software, renaming immediately after creation fails with EPERM error, as A/V locking up files for scanning time.

function rmrf(dir) {
	try {
		if (fs.lstatSync(dir).isDirectory()) {
			for (var arr = fs.readdirSync(dir), i = arr.length; i--; ) {
				rmrf(path.join(dir, arr[i]))
			}
			console.error("rmdir", dir)
			fs.rmdirSync(dir)
		} else {
			console.error("rm", dir)
			fs.unlinkSync(dir)
		}
	} catch (e) {
		if (e.code !== "ENOENT") throw e
	}
}

function writeFile(fileName, content) {
	fs.writeFileSync(path.resolve(fileName.split("?")[0]), content, "utf8")
}



