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
, cli = Object.assign(exports, require("./package.json"), {
	command: command,
	cp: cp,
	execute: execute,
	hold: hold,
	mkdirp: mkdirp,
	readFile: readFile,
	rmrf: rmrf,
	wait: wait,
	writeFile: writeFile,
	writePackage: writePackage
})
, opts = {
	"template": "default",
	"build": [
		"-i ui/dev.html -o ui/index.html"
	]
}
, shortcut = {
	b: "build",
	h: "help",
	r: "release",
	t: "test"
}
, hasOwn = opts.hasOwnProperty

try {
	Object.assign(opts, require(path.resolve("./package.json")).litejs)
} catch(e) {}


Array.prototype.pushUniq = function(item) {
	return this.indexOf(item) < 0 && this.push(item)
}

function getopts(argv, opts) {
	for (var arg, i = argv.length; i--; ) {
		arg = argv[i].split(/^--(no-)?|=/)
		if (arg[0] === "") {
			opts[arg[2]] = arg[4] || !arg[1]
			argv.splice(i, 1)
		}
	}
	arg = argv.shift()
	opts.cmd = shortcut[arg] || arg
	opts.name = argv
}

if (!module.parent) {
	getopts(process.argv.slice(2), opts)
	if (opts.version) console.log("%s v%s", cli.name, cli.version)
	execute(opts.cmd, opts)
}

function execute(cmd, opts) {
	var sub
	, helpFile = module.filename
	, subHelp = [
		"bench",
		"build",
		"release"
	]

	if (!opts.version || cmd) switch (cmd) {
	case "bench":
	case "build":
		require("./cli/" + cmd).execute(process.argv, 3)
		break;
	case "lint":
		if (opts.lint) try {
			child.execSync(opts.lint, { stdio: "inherit" })
		} catch (e) {
			return console.log("\nfatal: code does not comply to rules! Ignore with --no-lint option.")
		}
		break;
	case "init":
	case "release":
		require("./cli/" + cmd)(opts)
		break;
	case "test":
		sub = [ "-r", path.resolve(module.filename, "../test.js") ].concat(
			opts.test || "test",
			process.argv.slice(3)
		)
		child.spawn(process.argv[0], sub, {
			env: {
				NODE_PATH: process.argv[1].replace(/bin\/\w+$/, "lib/node_modules/")
			},
			stdio: "inherit"
		}).on("close", function(code) { process.exitCode = code })
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

function writePackage(obj) {
	var undef
	obj.litejs = Object.assign(obj.litejs || {}, { cmd:undef, name:undef })
	writeFile("package.json", JSON.stringify(obj, null, "  ") + "\n")
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

	for (k in obj) if (typeof obj[k] == "function" && ignore.indexOf(k) < 0) swap(k)
	function swap(k) {
		hooked.push(k, hasOwn.call(obj, k) && obj[k])
		obj[k] = function() {
			hooks.push(k, arguments)
			return obj
		}
	}

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
		for (; (v = hooks[++i]); ) {
			scope = scope[v].apply(scope, hooks[++i]) || scope
		}
		hooks = hooked = null
	}
}

