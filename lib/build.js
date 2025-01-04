//-
//-  Usage
//-    lj build [input file]
//-
//-  build options
//-    --banner        Add commented banner to output
//-    --out           Output file
//-    --readme        Replace readme tags in file
//-    --worker        Replace readme tags in file
//-
//-  Examples
//-    lj b --out=ui/index.html ui/dev.html
//-
//
// $ git hash-object -w -- README.md
// 49f5e1141260555ba8819903b19f8960ae04bd46
// $ git rev-parse --short=1 49f5e1141260555ba8819903b19f8960ae04bd46
// 49f5e
//
//
// Node.js
//  - Arrow functions 4.0.0 (correct from 6)
//  - await 7.6.0

var child = require("child_process")
, crypto = require("crypto")
, fs = require("fs")
, path = require("path")
, cli = require("..")
, dom = require("@litejs/dom")
, CSSStyleSheet = dom.CSSStyleSheet
, parser = new dom.DOMParser()
, conf = cli.conf
, now = new Date()
, lastStr = ""
, banner = {
	css: "/*! {0} */\n",
	html: "<!-- {0} -->\n",
	js: "/*! {0} */\n",
	ui: "/{0}\n"
}
, httpRe = /^https?(?=:)/
, fileHashes
, linked = module.filename.indexOf(process.cwd()) !== 0

if (linked) {
	module.paths = require("module")._nodeModulePaths(process.cwd())
	// module.paths.push(path.resolve(process.env.npm_config_prefix, "lib", "node_modules"))
	// module.paths.push(path.resolve(process.cwd(), "node_modules"))
}


module.exports = function(opts) {
	if (opts.ver) conf.version = opts.ver

	var out = opts.min || opts.out
	, outDir = out.replace(/[^\/]+$/, "")
	, ext = getExt(out)


	if (ext === "html") {
		cli.mkdirp(outDir)
		readHashes(outDir)
		html(opts, writeResult)
	} else {
		console.log("Nothing to build, use --out=build/index.html")
	}

	function writeResult(output) {
		if (opts.readme !== false) {
			output = format(output)
		}
		if (opts.banner) {
			output = banner[ext].replace(/\{0\}/g, opts.banner) + output
		}
		out.split(",").forEach(function(out) {
			var outDir = out.replace(/[^\/]+$/, "")
			, outFile = out.replace(/.*\//, "")
			write(outDir, outFile+"?{h}", output)
		})

		if (opts.worker) {
			updateWorker(opts.worker, opts, {})
		}
		child.execSync("git add -u")
	}
}

function getSrc(el) {
	return (el.src || el.href || el)
}
function getExt(el) {
	var ext = getSrc(el).split("?")[0].split(".").pop()
	return ext === "tpl" || ext === "view" ? "ui" : ext
}
function drop(el, content) {
	var flags = el && el.getAttribute && el.getAttribute("drop")
	return flags ? content.replace(
		RegExp("\\/(\\*\\*+)\\s*(" + flags.replace(/[^\w.:]+/g, "|") + ")\\s*\\1\\/", "g"), "/$1 $2 $1"
	).replace(
		RegExp("/(?=\\*\\* (" + flags.replace(/[^\w.:]+/g, "|") + "))$", "mg"), ""
	) : content
}
function write(dir, name, content, el) {
	var hash, outFile = path.join(dir, name.split("?")[0])
	if (name.indexOf("{h}") > -1) {
		hash = child.execSync("git hash-object -w --stdin", { input: content }).toString("utf8")
		hash = child.execSync("git rev-parse --short=1 " + hash).toString("utf8").trim()
		outFile = outFile.replace("{h}", hash)
		name = name.replace("{h}", fileHashes[outFile] = hash)
	}
	if (el) {
		el[el.src ? "src" : "href"] = name
		if (el.hasAttribute("integrity")) {
			el.integrity = "sha256-" + crypto.createHash("sha256").update(content).digest("base64")
		}
	}
	cli.writeFile(outFile, content)
}

function html(opts, next) {
	var doc = parser.parseFromString(cli.readFile(opts._[0]))
	, $$ = sel => Array.from(doc.querySelectorAll(sel))
	, out = opts.out || opts._[0]
	, inDir = opts.inDir = opts._[0].replace(/[^\/]+$/, "")
	, outDir = opts.outDir = out.replace(/[^\/]+$/, "")
	, loadFiles = []
	, loadFilesRe = /\/[*\/]!{loadFiles}[*\/]*/
	, loadRewriteRe = /\/[*\/]!{loadRewrite}[*\/]*/
	, cacheFile = path.resolve(".cache.json")
	, cache = {}
	, lastMinEl = {}


	opts.outFile = out.replace(/.*\//, "")

	try {
		if (!opts.fetch) {
			cache = require(cacheFile)
			if (now - cache.time > 36000000) console.error("Cache is old, consider using --fetch")
		}
	} catch(e) {}


	$$("[exclude]").forEach(remove)

	following("cat", function(el, siblings) {
		if (opts.cat === false) {
			el.removeAttribute("banner")
			return console.error("CAT DISABLED", getSrc(el))
		}
		setLastEl(el, el.getAttribute("cat").match(/[^,\s]+/g) || [], siblings)
		write(inDir, getSrc(el), el._txt, el)
		cpOut(el)
	})

	following("min", function(el, siblings) {
		setLastEl(el, [el], siblings)
		el.setAttribute("_min", el[el.src ? "src" : el.href ? "href" : "_min"] = el._min = getSrc(el.getAttribute("min") || el))
	})

	$$("[src]:not([src^='data:']),[href]:not(a,base,[href^='data:'])").forEach(function(el) {
		if (el._txt) return
		cpOut(el)
	})

	$$("[_min]:not([inline])").forEach(function(el) {
		write(outDir, el._min, minimize(el, { input: el._txt }), el)
		el.removeAttribute("_min")
		delete el._txt
		if (el.textContent.trim()) {
			el._txt = el.textContent
			el.setAttribute("inline", "ui")
		}
	})

	$$("[inline],[min]").forEach(function(el) {
		if (el.hasAttribute("defer") || el.hasAttribute("if")) throw "'defer' and 'if' can not be 'inline'"
		var newEl
		, content = el._txt || read.call(el)
		if (loadFilesRe.test(content)) {
			content = content.replace(loadFilesRe, "" + loadFiles.map(function(el) {
				var elIf = el.getAttribute("if")
				return (elIf ? "(" + elIf + ")&&" : "") + JSON.stringify(getSrc(el))
			}))
			loadFiles.forEach(remove)
		}
		if (el.hasAttribute("rewrite") && loadRewriteRe.test(content)) {
			var rewriteMap = (el.getAttribute("rewrite").match(/[^,\s]+/g) || []).reduce(function(map, rule) {
				var junks = rule.split(":")
				cli.ls(path.join(inDir, junks[0])).forEach(function(file) {
					var inName = defMap(path.relative(inDir, file))
					, outName = defMap(junks[1]).replace("{h}", fileHashes[file] || now.getTime())
					if (inDir !== outDir || outName.indexOf(inName) !== 0) {
						var content = minimize(inName, { src: file, files: [inName] })
						cli.writeFile(path.join(outDir, outName.split("?")[0]), content)
					}
					map[inName] = outName
				})
				return map
			}, {})
			content = content.replace(loadRewriteRe, JSON.stringify(rewriteMap).slice(1, -1))
			el.removeAttribute("rewrite")
		}
		if ((el._min || el.getAttribute("min") === "") && el.tagName === "SCRIPT") content = minimize(el, { input: content })
		el.parentNode.insertBefore(newEl = doc.createElement(el.tagName === "SCRIPT" ? "script" : "style"), el).textContent = "\n" + content.trim() + "\n"
		if (el.getAttribute("inline") === "ui") newEl.src = el.src
		if (el.type) newEl.type = el.type
		remove(el)
	})

	$$("[_src]").forEach(function(el) {
		el.src = el.getAttribute("_src")
		el.removeAttribute("_src")
	})

	$$("[integrity]").forEach(function(el) {
		var src = getSrc(el)
		if (httpRe.test(src)) {
			curl(src, el)
		}
	})

	if (!cache.time && Object.keys(cache)[0]) {
		cache.time = +now
		write("", cacheFile, JSON.stringify(cache, null, 2))
	}

	next(doc.toString({
		css:{
			root: inDir,
			import:true
		}}
	))

	function cpOut(el) {
		var name = getSrc(el)
		, cleanName = name.split("?")[0]
		, inName = path.join(inDir, cleanName)
		if (name.indexOf("{h}") > -1) {
			el[el.src ? "src" : "href"] = name.replace("{h}", fileHashes[inName] || now.getTime())
		}
		if (inDir !== outDir && !httpRe.test(name) && !el.matches("[inline],[min]")) {
			cli.cp(inName, path.join(outDir, cleanName))
		}
	}
	function setLastEl(el, els, siblings) {
		var min = el.getAttribute("min")
		, ext = getExt(min || el)
		, content = els.concat(siblings).map(read, el).join("\n")
		if ((min || el.hasAttribute("inline") && min === "") && !el.getAttribute("if")) {
			lastMinEl[ext] = el
		}
		if (el.hasAttribute("banner") && banner[ext]) {
			content = banner[ext].replace(/\{0\}/g, el.getAttribute("banner")) + content
			el.removeAttribute("banner")
		}
		el._txt = content
		if (ext === "js" || ext === "css" || ext === "ui") {
			if (!el.hasAttribute("inline") && !el.hasAttribute("defer") && loadFiles.indexOf(el) < 0) loadFiles.push(el)
		}
	}

	function following(attr, fn) {
		$$("[%]:not([%='']),[%=''][inline]".replace(/%/g, attr)).forEach(function(el) {
			for (
				var pos = el, siblings = [], sel = "[" + attr + "='']:not([inline])";
				(pos = pos.nextElementSibling) && pos.matches(sel);
				siblings.push(pos)
			);
			fn(el, siblings)
			siblings.forEach(remove)
			;[attr, "drop"].forEach(el.removeAttribute, el)
		})
	}
	function remove(el) {
		if (el.parentNode) {
			if (el.previousSibling.nodeType === doc.TEXT_NODE) remove(el.previousSibling)
			el.parentNode.removeChild(el)
		}
	}
	function curl(name, el) {
		var data = cache[name] || (cache[name] = {})
		if (!data.body) {
			data.body = child.execSync("curl " + name + "|uglifyjs --beautify").toString("utf8")
		}
		data.sha256 = crypto.createHash("sha256").update(data.body).digest("base64")

		if (el && el.hasAttribute("integrity")) {
			el.integrity = "sha256-" + data.sha256
		}
		return data.body
	}
	function read(_name) {
		var el = this
		, name = getSrc(_name || el)
		if (name.nodeType) return name.parentNode ? name._txt || name.textContent : ""
		var fullPath = path.resolve(inDir, name.split("?")[0])
		, content = httpRe.test(name) ?
			curl(name, el) :
			cli.readFile(name = fs.existsSync(fullPath) ? fullPath : require.resolve(defMap(name)))
		, ext = getExt(name)
		, extTo = getExt(el) || ext

		if (ext !== extTo) {
			if (extTo !== "js") throw "Can not transform to " + extTo
			if (ext === "ui") {
				content = parseView(content, extTo, lastMinEl)
			} else if (ext === "css") {
				content = css2js(content)
			}
		}
		return drop(_name, drop(el, content))
	}
	function minimize(el, _opts) {
		var content = (_opts.input || "") + (_opts.files || []).map(read, _opts).join("\n")
		, ext = (
			el.type === "ui" || el.getAttribute("inline") === "ui" ? "ui" :
			!el.hasAttribute("min") ? getExt(el._min || el) :
			"js"
		)
		if (ext === "json") {
			return JSON.stringify(JSON.parse(content))
		}
		if (ext === "ui") {
			return viewMin(parseView(content, ext, lastMinEl), {})
		}
		if (ext === "js") {
			return jsMin(_opts)
		}
		throw "Invalid file ext " + ext
	}
}

function jsMin(opts) {
	var cmd = [
		"uglifyjs --warn --ie8 -c 'evaluate=false,passes=2,properties=false'",
		"-m eval --comments '/^\\s*[@!]/'",
		"--beautify 'beautify=false,semicolons=false,keep_quoted_props=true' --"
	].concat(opts.files || []).join(" ")
	return child.execSync(cmd, opts).toString("utf8").replace(/\\x0B/g, "\\v")
}

function defMap(str) {
	var chr = str.charAt(0)
	, slice = str.slice(1)
	return chr == "+" ? lastStr + slice :
	chr == "%" ? ((chr = lastStr.lastIndexOf(slice.charAt(0))), (chr > 0 ? lastStr.slice(0, chr) : lastStr)) + slice :
	(lastStr = str)
}

function readHashes(root) {
	if (fileHashes) return
	fileHashes = {}
	child.execSync((root ? "cd " + root + ";" : "") + "git add -u;git ls-files -sz --abbrev=1")
	.toString("utf8").split("\0").map(function(line) {
		line = line.split(/\s+/)
		if (line[1]) fileHashes[root + line[3]] = line[1]
	})
}

function css2js(content) {
	return content ? ";xhr.css('" + cssMin(content).replace(/\n+/g, "").replace(/['\\]/g, "\\$&") + "');" : ""
}
function view2js(content) {
	return content ? ";xhr.ui('" + viewMin(content, {}).replace(/\n+/g, "\x1f").replace(/['\\]/g, "\\$&") + "');" : ""
}

function cssMin(str) {
	var sheet = new CSSStyleSheet({min:{ import: true }})
	sheet.replaceSync(str)
	return sheet.toString()
}

function parseView(content, extTo) {
	var line
	, arr = content.split(/[\n\x1f]/)
	, i = 0
	, l = arr.length
	, map = { "%css": "", "%js": "" }
	, last = -1

	for (; i < l; ) {
		line = arr[i++]
		if (line === "") {
			if (last > -1) {
				map[arr[last]] += arr.splice(last, i - last).slice(1).join("\n")
				i -= (i - last)
				last = -1
			}
		} else if (map.hasOwnProperty(line)) last = i - 1
	}

	var out = ""
	if ((line = map["%css"])) {
		//if (lastMinEl.css) lastMinEl.css._txt += line
		out += extTo === "js" ? css2js(line) : "%css\n " + cssMin(line).split("\n").join("\n ")
	}
	if ((line = arr.join("\n"))) {
		//if (lastMinEl.ui && extTo !== "ui") lastMinEl.ui._txt += line
		out += extTo === "js" ? view2js(line) : line
	}
	if ((line = map["%js"])) {
		//if (lastMinEl.js && extTo !== "js") lastMinEl.js._txt += line
		out += extTo === "js" ? line : "%js\n " + jsMin({input:line}).split("\n").join("\n ")
	}
	return out
}

function viewMin(str, attrs) {
	var out = [""]
	, templateRe = /([ \t]*)(%?)((?:("|')(?:\\\4|.)*?\4|[-\w:.#[\]]=?)*)[ \t]*([>^;@|\\\/]|!?=|)(([\])}]?).*?([[({]?))(?=\x1f|\n|$)+/g
	, parent = 0
	, stack = [-1]

	str
	.replace(/^([ \t]+)(;.*)\n\1(;.*)/gm, "$1$2$3")
	.replace(/^([ \t]+)([\S]+)\n\1\s+(;.*)/gm, "$1$2 $3")
	.replace(templateRe, work).trim()

	//return out.join("\n")
	return out.join("\n")//.replace(/^[\s\x1f]+|[\s\x1f]+$/g, "").replace(/\n+/g, "\\n")

	function work(all, indent, plugin, name, q, op, text, mapEnd, mapStart, offset) {
		if (offset && all === indent) return

		for (q = indent.length; q <= stack[0]; ) {
			if (!isString(out[parent])) {
				parent = out.push("") - 1
			}
			stack.shift()
		}

		if (!isString(out[parent])) {
			out[parent]._j += all + "\n"
		} else if (plugin && (name === "todo def")) {
			out[parent] += all
			parent = out.push({
				inFile: attrs.inFile, outFile: attrs.outFile, inDir: attrs.inDir, outDir: attrs.inDir,
				_j: "", _e: name, _p: " ".repeat(indent.length + 1),
				toString: function() {
					return this._p + this._j.split("\n").join("\n" + this._p)
				}
			}) - 1
			stack.unshift(q)
		} else {
			if (op === "/") return
			all = all.slice(indent.length)
			if (op === ";" || op === "@") all = all.replace(/("|')(?:\\\1|.)*?\1|\s*[\],;]\s*|\[\s+/g, function(all) {
				return all.trim()
			})
			out[parent] += " ".repeat(indent.length) + all + "\n"
		}
	}
}

function format(str) {
	return str.replace(/([\s\*\/]*@(version|date|author)\s+).*/, function(all, match, tag) {
		return conf[tag] ? match + conf[tag] : all
	})
}

function updateWorker(file, opts, hashes) {
	var root = opts.inDir + file.replace(/[^\/]+$/, "")
	, re = /(\b(?:VERSION|BUILD)\s*=\s*)("|').*?\2/
	, current = cli.readFile(opts.inDir + file)
	, log = "# Update worker: " + file

	var updated = current
	.replace(re, function(_, a, q) {
		return a + q + now.toISOString() + q
	})
	.replace(/(\t*), FILES = (\[[^\]]+\])/, function(all, indent, files) {
		files = JSON.parse(files)
		.map(function(line) {
			var name = line.replace(/\?.*/, "")
			, full = root + name
			if (!fileHashes[full]) {
				log += "\n'" + full + "' not commited?"
			} else if (name !== line) {
				hashes[name] = fileHashes[full]
				return name + "?" + fileHashes[full]
			}
			return line
		})
		return indent + ", FILES = " + JSON.stringify(files, null, "\t").replace(/\n/g, "\n" + indent)
	})

	if (current != updated) {
		console.error(log)
		cli.writeFile(opts.inDir + file, updated)
		if (opts.inDir !== opts.outDir) {
			cli.cp(opts.inDir + file, path.join(opts.outDir, file))
		}
	}
}

function isString(str) {
	return typeof str === "string"
}


