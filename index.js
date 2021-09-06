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
	debounce: debounce,
	hold: hold,
	ls: ls,
	mkdirp: mkdirp,
	readFile: readFile,
	rmrf: rmrf,
	wait: wait,
	writeFile: writeFile,
	writePackage: writePackage
})
, defaults = {
	"bench": "./test/bench/*.js",
	"build": "--out=ui/index.html ui/dev.html",
	"launch": "node",
	"template": "default",
	"test": "./test/index.js",
	"threads": 0
}
, shortcut = {
	b: "build",
	h: "help",
	r: "release",
	t: "test"
}
, commands = {
	build: 1,
	init: 1,
	bench: 1,
	release: 1,
	test: 1
}
, hasOwn = commands.hasOwnProperty
, intArgs = /^(samples|sample-time|warmup)$/
, nodeArgs = /^(allow-natives-syntax)$/

try {
	Object.assign(defaults, require(path.resolve("./package.json")).litejs)
} catch(e) {}


function getopts(str) {
	var argv = process.argv.slice(2)
	, opts = Object.assign({}, defaults, {args: argv, opts: [], nodeArgs: []})
	if (str) argv.push.apply(argv, str.split(/\s+/))
	for (var arg, i = argv.length; i; ) {
		arg = argv[--i].split(/^--(no-)?|=/)
		if (arg[0] === "") {
			opts[nodeArgs.test(arg[2]) ? "nodeArgs" : "opts"].push(argv[i])
			opts[arg[2]] = intArgs.test(opts[arg[2]]) ? 0|(arg[4] || !arg[1]) : arg[4] || !arg[1]
			argv.splice(i, 1)
		}
	}
	opts.cmd = argv.shift()
	return opts
}

if (!module.parent) {
	execute()
}

function execute(str) {
	var sub
	, opts = getopts(str)
	, cmd = shortcut[opts.cmd] || opts.cmd
	, helpFile = module.filename

	if (opts.version) console.log("%s v%s", cli.name, cli.version)

	if (!opts.version || cmd) switch (cmd) {
	case "bench":
	case "build":
	case "test":
		if (opts.args.length < 1 && opts[cmd] && !str) {
			return (Array.isArray(opts[cmd]) ? opts[cmd] : [opts[cmd]]).forEach(execute)
		}
		/* falls through */
	case "init":
	case "release":
		require("./cli/" + cmd)(opts)
		break;
	case "lint":
		if (opts[cmd]) try {
			child.execSync(opts[cmd], { stdio: "inherit" })
		} catch (e) {
			return console.error("\n%s\nIgnore with --no-%s option.", e.message, cmd)
		}
		break;
	case "help":
		sub = shortcut[opts.args[0]] || opts.args[0]
		if (hasOwn.call(commands, sub)) {
			helpFile = path.join(path.dirname(module.filename), "cli", sub + ".js")
		}
		/* falls through */
	default:
		console.log(readFile(helpFile).match(/^\/\/-.*/gm).join("\n").replace(/^.../gm, ""))
	}
}

function command(name) {
	try {
		return !!child.execSync((process.platform === "win32" ? "where " : "command -v ") + name)
	} catch (e) {}
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

function debounce(fn, time) {
	var timer
	return function() {
		clearTimeout(timer)
		timer = setTimeout(exec, time || 300, this, arguments)
	}
	function exec(scope, args) {
		fn.apply(scope, args)
	}
}

function flat(arr) {
	var out = []
	return out.concat.apply(out, arr)
}

function ls() {
	var key, dirRe, outRe, tmp, tmp2
	, arr = flat(arguments)
	, i = arr.length
	, out = []
	, paths = {}
	, reEscRe = /[*.+^=:${}()|\/\\]/g
	for (; i > 0; ) {
		key = arr[--i]
		if (typeof key !== "string") continue
		tmp = path.resolve(tmp2 = key.replace(/[^\/]*\*.*/, ""))
		tmp = paths[tmp] || (paths[tmp] = [])
		if (key !== tmp2) tmp.push(key.slice(tmp2.length))
	}
	for (key in paths) {
		outRe = RegExp("^" + esc(key) + (
			paths[key][0] ? "\\/(" + paths[key].map(esc).join("|") + ")$" : "$"
		))
		tmp = paths[key].map(dirname).filter(Boolean)
		dirRe = RegExp("^" + esc(key) + (
			tmp[0] ? "(?:\\/(" + tmp.map(esc).join("|") + ")|)$" : "$"
		))
		scan(key)
	}
	return out.sort()
	function scan(name) {
		if (outRe.test(name)) {
			out.push(path.relative(process.cwd(), name))
		} else if (dirRe.test(name)) try {
			var stat = fs.statSync(name)
			if (stat.isDirectory()) {
				fs.readdirSync(name).forEach(function(file) {
					scan(path.resolve(name, file))
				})
			}
		} catch(e) {}
	}
	function dirname(s) {
		return s.indexOf("/") > -1 && path.dirname(s)
	}
	function esc(s) {
		return (s.charAt(0) === "." ? "" : "(?!\\.)") +
		s
		.replace(reEscRe, "\\$&")
		.replace(/\?/g, "[^\/]")
		.replace(/\\\*\\\*(\\\/)?/g, "(.+$1)?")
		.replace(/\\(?=\*)/g, "[^\/]")
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
		if (dir === "/") throw Error("can not remove root")
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

