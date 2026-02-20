
exports.command = command
exports.cp = cp
exports.debounce = debounce
exports.deepAssign = deepAssign
exports.dom = require("@litejs/dom")
exports.hold = hold
exports.isObj = isObj
exports.ls = ls
exports.mkdirp = mkdirp
exports.readFile = readFile
exports.rmrf = rmrf
exports.wait = wait
exports.watch = watch
exports.writeFile = writeFile
exports.writePackage = writePackage

exports.cols = +process.env.COLUMNS || process.stdout.columns || 80
exports.rows = +process.env.ROWS || process.stdout.rows || 24


if (parseInt(process.version.slice(1), 10) < 15) require("./lib/shim.js")


var child = require("child_process")
, fs = require("fs")
, path = require("path")
, hasOwn = {}.hasOwnProperty


function command(name) {
	try {
		return !!child.execSync((process.platform === "win32" ? "where " : "command -v ") + name)
	} catch (e) {}
	return false
}

function cp(src, dest, msg) {
	if (fs.statSync(src).isDirectory()) {
		mkdirp(dest)
		fs.readdirSync(src).forEach(function(file) {
			if (msg !== null) console.error(msg || "cp " + src + " " + dest)
			cp(path.join(src, file), path.join(dest, file))
		})
	} else {
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

function deepAssign(to) {
	if (to !== Object.prototype) for (var key, from, a = arguments, i = 1, len = a.length; i < len; ) {
		if ((from = a[i++])) for (key in from) if (hasOwn.call(from, key)) {
			if (from[key] === null) delete to[key]
			else to[key] = (
				isObj(from[key]) ?
				deepAssign(isObj(to[key]) ? to[key] : {}, from[key]) :
				from[key]
			)
		}
	}
	return to
}

function flat(arr) {
	var out = []
	return out.concat.apply(out, arr)
}

function isObj(obj) {
	return !!obj && obj.constructor === Object
}

function ls() {
	var key, dirRe, outRe, tmp, tmp2
	, arr = flat(arguments)
	, i = arr.length
	, out = []
	, paths = {}
	, reEscRe = /[*.+^=:${}()|\/\\]/g
	, opts = { absolute: false, cwd: process.cwd(), dir: true, dot: false, file: true, root: "", stat: false }
	for (; i > 0; ) {
		key = arr[--i]
		if (isObj(key)) Object.assign(opts, key)
		else if (typeof key === "string") {
			tmp = path.resolve(opts.cwd, tmp2 = key.replace(/[^\/]*\*.*/, ""))
			tmp = paths[tmp] || (paths[tmp] = [])
			if (key !== tmp2) tmp.push(key.slice(tmp2.length))
		}
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
		try {
			var stat = fs.statSync(name)
			if (outRe.test(name)) {
				if (stat.isDirectory() ? opts.dir : opts.file) out.push(
					opts.stat ? Object.assign(stat, { name: opts.absolute ? name : opts.root + path.relative(opts.cwd, name) }) :
					opts.absolute ? name :
					opts.root + path.relative(opts.cwd, name)
				)
			}
			if (stat.isDirectory() && dirRe.test(name)) {
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
		return (opts.dot || s.charAt(0) === "." ? "" : "(?!\\.)") +
		s
		.replace(reEscRe, "\\$&")
		.replace(/\?/g, "[^\/]")
		.replace(/\\\*\\\*(\\\/)?/g, "(.+$1)?")
		.replace(/\\(?=\*)/g, "[^\/]")
	}
}

function mkdirp(dir) {
	fs.mkdirSync(dir, { recursive: true })
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
	fs.writeFileSync(name, content)
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

	// `wait` is already in hooked array, overrided method will be cleared on resume
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

