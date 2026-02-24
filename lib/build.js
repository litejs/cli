//-
//-  Usage
//-    lj build [input file]
//-
//-  build options
//-    --banner        Add commented banner to output
//-    --cat           Build src files (default: true)
//-    --assets        URL template for assets eg "assets/{h}.{ext}"
//-    --fetch         Fetch remote resources (default: true)
//-    --jsmin         JS minification command (default: uglifyjs)
//-    --min           Minified output file
//-    --out           Output file
//-    --readme        Replace readme tags in file
//-    --ver           Override version string
//-    --worker        Update worker file
//-
//-  Examples
//-    lj b --out=ui/index.html ui/dev.html
//-

var child = require("child_process")
, crypto = require("crypto")
, fs = require("fs")
, path = require("path")
, cli = require("..")
, { CSS, CSSStyleSheet, DOMParser } = require("@litejs/dom")
, parser = new DOMParser()
, now = new Date()
, conf = Object.assign({ date: now.toISOString().split("T")[0] }, require(path.resolve("package.json")))
, lastStr = ""
, banner = {
	css: "/*! {0} */\n",
	html: "<!-- {0} -->\n",
	js: "/*! {0} */\n",
	ui: "/{0}\n"
}
, httpRe = /^https?(?=:)/
, jsMinCmd
, fileHashes
, linked = module.filename.indexOf(process.cwd()) !== 0

if (linked) {
	module.paths = require("module")._nodeModulePaths(process.cwd())
}

module.exports = build

function build(opts) {
	if (opts.jsmin) jsMinCmd = opts.jsmin
	if (opts.ver) conf.version = opts.ver

	var out = opts.min || opts.out
	, outDir = out.replace(/[^\/]+$/, "")
	, ext = getExt(out)

	if (ext !== "html" && ext !== "js" && ext !== "ui") {
		return console.log("Nothing to build, use --out=build/index.html")
	}

	cli.mkdirp(outDir)
	readHashes(outDir)

	if (ext === "html") {
		html(opts, writeResult)
	} else {
		var min = !!opts.min
		var input = opts._.map(defMap).map(function(f) {
			var file = path.resolve(f)
			, content = cli.readFile(fs.existsSync(file) ? file : require.resolve(f))
			, fExt = getExt(f)
			if (fExt === "ui") return parseView(content, ext, {}, null)
			if (fExt === "css") return ext === "ui" ? "%css\n " + cssMin(content).split("\n").join("\n ") + "\n" : css2js(content)
			if (ext === "ui" && fExt === "js") return "%js\n " + (min ? jsMin({ input: content }) : content).trim().split(/\s*\n+/).join("\n ") + "\n"
			return content
		}).join("")
		writeResult(ext === "ui" ? (min ? viewMin(input, {}) : input.trimEnd()) + "\n" : jsMin({ input: input }).replace(/(["'])\),?\s*xhr\.css\(\1/g, ""))
	}

	function writeResult(output) {
		if (opts.readme !== false) {
			output = format(output)
		}
		if (opts.banner) {
			output = banner[ext].replace(/\{0\}/g, opts.banner) + output
		}
		var outFile = write(outDir, out.replace(/.*\//, ""), output)
		console.log("# Build %s %s", path.basename(outFile), output.length)

		if (opts.worker) {
			updateWorker(opts.worker, opts, {})
		}
		child.execSync("git add -u")
		if (opts._bytes) console.log("# Total %s bytes", opts._bytes + output.length)
	}
}

build.clean = clean
build.drop = drop
build.defMap = defMap
build.cssMin = cssMin
build.parseView = parseView

function clean(str) {
	return str.replace(/([$\w] [!$\w])|(["'`\/])(?:\\.|(?!\2).)*\2|\s/gi, (match, p, q) => {
		return p || q ? match : ""
	})
}

function getSrc(el) {
	return el.src || el.href || el
}

function getExt(el) {
	var ext = getSrc(el).split("?")[0].split(".").pop()
	return ext === "tpl" || ext === "view" ? "ui" : ext
}

function drop(el, content, attr) {
	var flags = el && el.getAttribute && el.getAttribute(attr || "drop")
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
		name = name.replace("{h}", fileHashes[path.resolve(outFile)] = hash)
	}
	if (el) {
		el[el.src ? "src" : "href"] = name
		if (el.hasAttribute("integrity")) {
			el.integrity = "sha256-" + crypto.createHash("sha256").update(content).digest("base64")
		}
	}
	cli.writeFile(outFile, content)
	return outFile
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
	, dropAttr = "drop"
	, pendingWrites = []
	, urlFn = inDir !== outDir ? assetUrl : null

	if (inDir !== outDir) readHashes(inDir)
	doc.baseURI = inDir

	opts.outFile = out.replace(/.*\//, "")

	try {
		if (!opts.fetch) {
			cache = require(cacheFile)
			if (now - cache.time > 36000000) console.error("Cache is old, consider using --fetch")
		}
	} catch(e) {}

	$$("[exclude]").forEach(remove)

	following("cat", "cat-drop", function(el, siblings) {
		if (opts.cat === false) {
			el.removeAttribute("banner")
			return console.error("CAT DISABLED", getSrc(el))
		}
		dropAttr = "cat-drop"
		setLastEl(el, el.getAttribute("cat").match(/[^,\s]+/g) || [], siblings)
		dropAttr = "drop"
		var bytes = write(inDir, getSrc(el), el._txt, el)
		console.log("# Cat %s %s", getSrc(el), bytes)
		cpOut(el)
	})

	following("min", "drop", function(el, siblings) {
		setLastEl(el, [el], siblings)
		el.setAttribute("_min", el[el.src ? "src" : el.href ? "href" : "_min"] = el._min = getSrc(el.getAttribute("min") || el))
	})

	loadFiles = loadFiles.filter(function(el) { return el.parentNode })

	$$("[_min]:not([inline])").forEach(function(el) {
		pendingWrites.push({ dir: outDir, name: el._min, content: minimize(el, { input: el._txt }), el: el })
		el.removeAttribute("_min")
		if (el.textContent.trim()) {
			el._txt = el.textContent
			el.setAttribute("inline", "ui")
		}
	})

	opts._bytes = 0
	pendingWrites.forEach(function(w) {
		var outFile = write(w.dir, w.name, w.content, w.el)
		console.log("# Write %s %s", path.basename(outFile), w.content.length)
		opts._bytes += w.content.length
	})

	$$("[inline],[min]").forEach(function(el) {
		if (el.hasAttribute("defer") || el.hasAttribute("if")) throw "'defer' and 'if' can not be 'inline'"
		var newEl
		, content = el._txt || read.call(el)
		, type = el.tagName === "SCRIPT" ? "js" : "css"
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
					, outName = defMap(junks[1]).replace("{h}", fileHashes[path.resolve(file)] || now.getTime())
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
		if (lastMinEl[type] === el) lastMinEl[type] = newEl
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

	$$("[src]:not([src^='data:']),[href]:not(a,base,[href^='data:'])").forEach(function(el) {
		if (el._txt) return
		cpOut(el)
	})

	next(doc.toString({
		css: {
			color: true,
			root: inDir,
			import: true,
			url: urlFn
		}
	}))

	function assetUrl(u) {
		if (/^['"]?(\w+:|#)/.test(u)) return u
		u = u.replace(/^['"]|['"]$/g, "")
		var parts = u.split("#")
		, src = path.resolve(inDir, parts[0])
		, hash = fileHashes[src] || hashFile(src)
		, ext = parts[0].split(".").pop()
		, name = path.basename(parts[0], "." + ext)
		, out = (opts.assets || "{h}.{ext}")
			.replace("{h}", hash || name)
			.replace("{ext}", ext)
			.replace("{name}", name)
		cli.cp(src, path.join(outDir, out), null)
		console.log("# Asset %s -> %s", parts[0], out)
		return out + (parts[1] ? "#" + parts[1] : "")
	}
	function cpOut(el) {
		var name = getSrc(el)
		, cleanName = name.split("?")[0]
		if (name.indexOf("{h}") > -1) {
			el[el.src ? "src" : "href"] = name.replace("{h}", fileHashes[path.resolve(inDir, cleanName)] || now.getTime())
		}
		if (urlFn && !httpRe.test(name) && !el.matches("[inline],[min]")) {
			el[el.src ? "src" : "href"] = urlFn(cleanName)
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

	function following(attr, dropName, fn) {
		$$("[%]:not([%='']),[%=''][inline]".replace(/%/g, attr)).forEach(function(el) {
			for (
				var pos = el, siblings = [], sel = "[" + attr + "='']:not([inline])";
				(pos = pos.nextElementSibling) && pos.matches(sel);
				siblings.push(pos)
			);
			fn(el, siblings)
			siblings.forEach(remove)
			;[attr, dropName].forEach(el.removeAttribute, el)
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
		name = defMap(name)
		var fullPath = path.resolve(inDir, name.split("?")[0])
		, content = httpRe.test(name) ?
			curl(name, el) :
			cli.readFile(name = fs.existsSync(fullPath) ? fullPath : require.resolve(name))
		, ext = getExt(name)
		, extTo = getExt(el) || ext

		if (ext !== extTo) {
			if (extTo !== "js") throw "Can not transform to " + extTo
			if (ext === "ui") {
				content = parseView(content, extTo, lastMinEl, urlFn)
			} else if (ext === "css") {
				content = css2js(content)
			}
		}
		return drop(_name, drop(el, content, dropAttr), dropAttr)
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
			return viewMin(parseView(content, ext, lastMinEl, urlFn), {})
		}
		if (ext === "js") {
			return jsMin(_opts)
		}
		throw "Invalid file ext " + ext
	}
}

function jsMin(opts) {
	var cmd = (jsMinCmd || [
		"uglifyjs --warn --ie8 -c 'evaluate=false,passes=2,properties=false'",
		"-m eval --comments '/^\\s*[@!]/'",
		"--beautify 'beautify=false,semicolons=false,keep_quoted_props=true'"
	].join(" ")) + (opts.files ? " " + opts.files.join(" ") : jsMinCmd ? "" : " --")
	return child.execSync(cmd, opts).toString("utf8").replace(/\\x0B/g, "\\v")
}

function defMap(str) {
	var chr = str.charAt(0)
	, rest = str.slice(1)
	if (chr === "+") return lastStr + rest
	if (chr === "%") {
		var pos = lastStr.lastIndexOf(rest.charAt(0))
		return (pos > 0 ? lastStr.slice(0, pos) : lastStr) + rest
	}
	return (lastStr = str)
}

function readHashes(root) {
	if (!fileHashes) fileHashes = {}
	child.execSync((root ? "cd " + root + ";" : "") + "git add -u;git ls-files -sz --abbrev=1")
	.toString("utf8").split("\0").forEach(function(line) {
		line = line.split(/\s+/)
		if (line[1]) fileHashes[path.resolve(root, line[3])] = line[1]
	})
}

function hashFile(file) {
	try {
		var hash = child.execSync("git hash-object -- " + file).toString("utf8")
		return (fileHashes[file] = child.execSync("git rev-parse --short=1 " + hash).toString("utf8").trim())
	} catch(e) {
		return ""
	}
}

function css2js(content) {
	return content ? ";xhr.css('" + cssMin(content).replace(/\n+/g, "").replace(/['\\]/g, "\\$&") + "');" : ""
}

function view2js(content) {
	return content ? ";xhr.ui('" + viewMin(content, {}).replace(/\n+/g, "\x1f").replace(/['\\]/g, "\\$&") + "');" : ""
}

function cssMin(str, urlFn) {
	var sheet = new CSSStyleSheet()
	sheet.replaceSync(str)
	return CSS.minify(sheet, { import: true, url: urlFn })
}

function parseView(content, extTo, lastMinEl, urlFn) {
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
				i = last
				last = -1
			}
		} else if (map.hasOwnProperty(line)) last = i - 1
	}

	var out = ""
	if ((line = map["%css"])) {
		if (lastMinEl.css) {
			if (lastMinEl.css._txt != null) lastMinEl.css._txt += line
			else lastMinEl.css.textContent += line
		} else out += extTo === "js" ? css2js(line) : "%css\n " + cssMin(line).split("\n").join("\n ") + "\n"
	}
	if ((line = arr.join("\n"))) {
		if (urlFn) line = line.replace(/\[src=(['"]?)([^"'\]\s]+)\1\]/g, function(all, q, val) {
			return "[src=" + q + urlFn(val) + q + "]"
		})
		if (lastMinEl.ui && extTo !== "ui") {
			if (lastMinEl.ui._txt != null) lastMinEl.ui._txt += line
			else lastMinEl.ui.textContent += line
		}
		else out += extTo === "js" ? view2js(line) : line
	}
	if ((line = map["%js"])) {
		if (lastMinEl.js && extTo !== "js") lastMinEl.js._txt += line
		else out += extTo === "js" ? line : "%js\n " + jsMin({ input: line }).split("\n").join("\n ")
	}
	return out
}

function viewMin(str, attrs) {
	var out = [""]
	, templateRe = /([ \t]*)(%?)((?:("|')(?:\\\4|.)*?\4|[-\w:.#[\]]=?)*)[ \t]*([>^;@|\\\/]|!?=|)(([\])}]?).*?([[({]?))(?=\x1f|\n|$)+/g
	, parent = 0
	, stack = [-1]
	, joinBindingsRe = /(\n +)([;^][^\n]+)\1(?=[;^])/g
	, joinSelectorRe = /(\n +)([\w:.#[](?:[^"' \n]|("|')(?:\\\3|(?!\3).)*?\3)*)\1 (?=[;^])/g

	str.replace(templateRe, work)

	return out.join("\n")
	.replace(joinBindingsRe, "$1$2")
	.replace(joinBindingsRe, "$1$2")
	.replace(joinBindingsRe, "$1$2")
	.replace(joinSelectorRe, "$1$2 ")
	.trim()

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
			if (op === ";" || op === "^" || op === "@") all = clean(all)
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
			if (!fileHashes[path.resolve(full)]) {
				log += "\n'" + full + "' not commited?"
			} else if (name !== line) {
				hashes[name] = fileHashes[path.resolve(full)]
				return name + "?" + fileHashes[path.resolve(full)]
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
