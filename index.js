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
, now = new Date()
, cli = Object.assign(exports, require("./package.json"), {
	cols: +process.env.COLUMNS || process.stdout.columns || 80,
	rows: +process.env.ROWS || process.stdout.rows || 24,
	command: command,
	conf: {
		date: now.toISOString().split("T")[0]
	},
	cp: cp,
	dom: require("@litejs/dom"),
	debounce: debounce,
	hold: hold,
	ls: ls,
	mkdirp: mkdirp,
	readFile: readFile,
	rmrf: rmrf,
	wait: wait,
	watch: watch,
	writeFile: writeFile,
	writePackage: writePackage
})
, defaults = {
	"bench": "lj bench ./test/bench/*.js",
	"build": "lj build --out=ui/index.html ui/dev.html",
	"commit": true,
	"launch": "node",
	"lcov": true,
	"status": 1,
	"tag": true,
	"test": "lj test ./test/index.js",
	"update": true
}
, hasOwn = {}.hasOwnProperty

try {
	var userPackage = require(path.resolve("package.json"))
	Object.assign(cli.conf, userPackage)
} /* c8 ignore next */ catch(e) {}


function readConf(opts) {
	var file = opts.shift()
	, key = opts.shift()
	if (file) try {
		var conf = require(path.resolve(file))
		if (key) conf = conf[key]
		if (conf) return Object.assign(defaults, conf)
	} /* c8 ignore next */ catch(e) {}
	if (opts[0]) readConf(opts)
}

if (!module.parent) {
	readConf([
		"package.json", "litejs",
		".github/litejs.json", null
	])
	execute(require("./opts.js").opts({
		bench: {},
		build_b: {
			out: ""
		},
		init: {},
		lint: {},
		release_r: {
			commit: true,
			tag: true,
		},
		test_t: {
			up: false,
			coverage: false,
			lcov: "",
			status: true,
			sources: "./*.js",
			threads: 1,
			watch: false
		},
		help: false,
		version: false
	}))
}

function execute(opts) {
	if (opts._unknown.length) throw "Unknown options: " + opts._unknown

	if (opts.version) console.log("%s v%s", cli.name, cli.version)

	if (opts.help || !opts._cmd) {
		console.log(readFile(
			opts._cmd ? path.resolve(module.filename, "..", "cli", opts._cmd + ".js") : module.filename
		).match(/^\/\/-.*/gm).join("\n").replace(/^.../gm, ""))
		process.exit()
	} else {
		require("./cli/" + opts._cmd + ".js")(opts)
	}
}

function run(opt, cmd, addOpts) {
	if (cmd) try {
		;(Array.isArray(cmd) ? cmd : [cmd]).forEach(function(cmd) {
			cmd += addOpts ? " " + addOpts : ""
			child.execSync(replaceVersion(cmd), { stdio: "inherit" })
		})
	} catch (e) {
		console.error("\n%s\nIgnore with --no-%s option.", e.message, opt)
		process.exit(1)
	}
}
function replaceVersion(cmd) {
	var re = /{v(\d)}/g
	, ver = (cli.conf.version || "0.0.0").split(".")
	return cmd.replace(re, function(all, num) {
		return ver[num]
	})
}

function command(name) {
	try {
		return !!child.execSync((process.platform === "win32" ? "where " : "command -v ") + name)
	} catch (e) {}
	return false
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

function rmrf(dir) {
	if (dir === "/") throw Error("Can not remove root")
	fs.rmSync(dir, { force: true, recursive: true })
}

function writeFile(fileName, content) {
	var name = path.resolve(fileName.split("?")[0])
	mkdirp(path.dirname(name))
	fs.writeFileSync(name, content, "utf8")
}

function writePackage(obj) {
	var undef
	Object.assign(obj.litejs || {}, { cmd:undef, name:undef })
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

function watch(paths, cb, delay) {
	var watchers = {}
	, changed = []
	, fn = debounce(function() {
		add(changed)
		changed.length = 0
		cb()
	}, delay)

	add(paths)

	return {
		add: add
	}
	function add(paths) {
		paths.forEach(watch)
	}
	function watch(file) {
		if (watchers[file]) return
		try {
			watchers[file] = fs.watch(file, function() {
				if (watchers[file]) {
					changed.push(file)
					watchers[file].close()
					watchers[file] = null
				}
				fn()
			})
		} catch (e) {}
	}
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

