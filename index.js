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

require("./cli/patch-node.js")

var fs = require("fs")
, child = require("child_process")
, path = require("path")
, conf = {}
, opts = {}
, hasOwn = opts.hasOwnProperty

try {
	conf = require(path.resolve("./package.json")).litejs || {}
} catch(e) {}

exports.command = command
exports.cp = cp
exports.hold = hold
exports.mkdirp = mkdirp
exports.readFile = readFile
exports.rmrf = rmrf
exports.wait = wait
exports.writeFile = writeFile

Array.prototype.pushUniq = function(item) {
	return this.indexOf(item) < 0 && this.push(item)
}

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
	var sub
	, helpFile = module.filename
	, shortcut = {
		b: "build",
		h: "help",
		r: "release",
		t: "test"
	}
	, subHelp = [
		"bench",
		"build",
		"release"
	]
	, cmd = shortcut[process.argv[2]] || process.argv[2]

	switch (cmd) {
	case "bench":
	case "build":
	case "release":
		require("./cli/" + cmd).execute(process.argv, 3)
		break;
	case "init":
		getopts(process.argv.slice(0), 2, opts)
		require("./cli/" + process.argv[2])(opts)
		break;
	case "init-app":
	case "init-ui":
		sub = process.argv[2].slice(5)
		cp(
			"./node_modules/litejs/lib/template/" + (conf.template || "default") + "/" + sub,
			"./" + (opts[sub] || sub)
		)
		break;
	case "test":
		sub = [ "-r", path.join(module.path, "test.js") ].concat(
			conf.test || "test",
			process.argv.slice(3)
		)
		child.spawn(process.argv[0], sub, {
			env: {
				NODE_PATH: process.argv[1].replace(/bin\/\w+$/, "lib/node_modules/")
			},
			stdio: "inherit"
		})
		break;
	case "help":
		sub = shortcut[process.argv[3]] || process.argv[3]
		if (subHelp.indexOf(sub) > -1) {
			helpFile = path.join(path.dirname(module.filename), "cli", sub + ".js")
		}
		/* falls through */
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
	if (fs.statSync(src).isDirectory()) {
		mkdirp(dest)
		fs.readdirSync(src).forEach(function(file) {
			cp(path.join(src, file), path.join(dest, file))
		})
	} else {
		console.error("cp", src, dest)
		fs.copyFileSync(src, dest)
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
	var name = path.resolve(fileName.split("?")[0])
	mkdirp(path.dirname(name))
	fs.writeFileSync(name, content, "utf8")
}


function wait(fn) {
	var pending = 1
	function resume() {
		if (!--pending && fn) fn.call(this)
	}
	resume.wait = function() {
		pending++
		return resume
	}
	return resume
}

function hold(ignore) {
	var k
	, obj = this
	, hooks = []
	, hooked = []
	, _resume = wait(resume)
	ignore = ignore || obj.syncMethods || []

	for (k in obj) if (typeof obj[k] == "function" && ignore.indexOf(k) < 0) !function(k) {
		hooked.push(k, hasOwn.call(obj, k) && obj[k])
		obj[k] = function() {
			hooks.push(k, arguments)
			return obj
		}
	}(k)

	/**
	 * `wait` is already in hooked array,
	 * so override hooked method
	 * that will be cleared on resume.
	 */
	obj.wait = _resume.wait

	return _resume

	function resume() {
		for (var v, scope = obj, i = hooked.length; i--; i--) {
			if (hooked[i]) obj[hooked[i-1]] = hooked[i]
			else delete obj[hooked[i-1]]
		}
		// i == -1 from previous loop
		for (; v = hooks[++i]; ) {
			scope = scope[v].apply(scope, hooks[++i]) || scope
		}
		hooks = hooked = null
	}
}

