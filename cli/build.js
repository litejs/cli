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
//-    lj b --readme=README.md --out=ui/index.html ui/dev.html
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
, fs = require("fs")
, path = require("path")
, dom = require("@litejs/dom")
, parser = new dom.DOMParser()
, cli = require("..")
, now = new Date()
, lastStr = ""
, banner = {
	css: "/*! {0} */\n",
	html: "<!-- {0} -->\n",
	js: "/*! {0} */\n",
	view: "/{0}\n"
}
, fileHashes
, conf = {
	date: now.toISOString().split("T")[0]
}
, linked = module.filename.indexOf(process.cwd()) !== 0

try {
	Object.assign(conf, require(path.resolve("package.json")))
	console.error("# Build %s@%s with %s@%s", conf.name, conf.version, cli.name, cli.version)
} catch(e) {
	console.error(e)
}

if (linked) {
	module.paths = require("module")._nodeModulePaths(process.cwd())
	// module.paths.push(path.resolve(process.env.npm_config_prefix, "lib", "node_modules"))
	// module.paths.push(path.resolve(process.cwd(), "node_modules"))
}


module.exports = function(opts) {
	if (opts.ver) conf.version = opts.ver

	html(opts, function(output) {
		if (opts.readme !== false) {
			output = format(output)
		}
		if (opts.out) write(opts.outDir, opts.outFile+"?{h}", output)
		else process.stdout.write(output)

		if (opts.worker) {
			updateWorker(opts.worker, opts, {})
		}
		child.execSync("git add -u")
	})
}

function write(dir, name, content, el) {
	var hash, outFile = path.join(dir, name.split("?")[0])
	if (name.indexOf("{h}") > -1) {
		hash = child.execSync("git hash-object -w --stdin", { input: content }).toString("utf8")
		hash = child.execSync("git rev-parse --short=1 " + hash).toString("utf8").trim()
		outFile = outFile.replace("{h}", hash)
		name = name.replace("{h}", fileHashes[outFile] = hash)
	}
	if (el) el[el.src ? "src" : "href"] = name
	cli.writeFile(outFile, content)
}

function html(opts, next) {
	var doc = parser.parseFromString(cli.readFile(opts.args[0]))
	, httpRe = /^https?(?=:)/
	, out = opts.out || opts.args[0]
	, inDir = opts.inDir = opts.args[0].replace(/[^\/]+$/, "")
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

	readHashes(inDir)

	$$("[exclude]").forEach(remove)

	following("cat", function(el, siblings) {
		if (opts.cat === false) return console.error("CAT DISABLED", getSrc(el))
		setLastEl(el, el.cat.match(/[^,\s]+/g) || [], siblings)
		write(inDir, getSrc(el), el._txt, el)
	})

	following("min", function(el, siblings) {
		setLastEl(el, [el], siblings)
		el[el.src ? "src" : el.href ? "href" : "_min"] = el._min = getSrc(el.min || el)
	})

	$$("[src]:not([src^='data:']),[href]:not([href^='data:'])").forEach(function(el) {
		if (el._txt) return
		var name = getSrc(el)
		, cleanName = name.split("?")[0]
		, inName = path.join(inDir, cleanName)
		if (name.indexOf("{h}") > -1) {
			el[el.src ? "src" : "href"] = name.replace("{h}", fileHashes[inName] || now.getTime())
		}
		if (inDir !== outDir) {
			cli.cp(inName, path.join(outDir, cleanName))
		}
	})

	$$("[_min][type='litejs/view']").forEach(function(el) {
		el._txt = minimize(el, { input: el._txt })
		delete el._min
	})

	$$("[_min]:not([inline])").forEach(function(el) {
		write(outDir, el._min, minimize(el, { input: el._txt }), el)
		delete el._min
		delete el._txt
	})

	$$("[inline]").forEach(function(el) {
		if (el.defer === "" || el.if) throw "'defer' and 'if' can not combined with 'inline'"
		var newEl
		, content = el._txt || read.call(el)
		if (loadFilesRe.test(content)) {
			content = content.replace(loadFilesRe, "" + loadFiles.map(function(el) {
				return (el.if ? "(" + el.if + ")&&" : "") + JSON.stringify(getSrc(el))
			}))
			loadFiles.forEach(remove)
		}
		if (el.rewrite && loadRewriteRe.test(content)) {
			var rewriteMap = (el.rewrite.match(/[^,\s]+/g) || []).reduce(function(map, rule) {
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
			delete el.rewrite
		}
		if (el._min) content = minimize(el, { input: content })
		el.parentNode.insertBefore(newEl = doc.createElement(el.tagName === "SCRIPT" ? "script" : "style"), el).textContent = "\n" + content.trim() + "\n"
		if (el.type) newEl.type = el.type
		remove(el)
	})

	if (!cache.time && Object.keys(cache)[0]) {
		cache.time = +now
		write("", cacheFile, JSON.stringify(cache, null, 2), {})
	}

	next(doc.toString(true))

	function setLastEl(el, els, siblings) {
		var ext = getExt(el.min || el)
		, content = els.concat(siblings).map(read, el).join("\n")
		if ((el.min || el.inline === "" && el.min === "") && !el.if) {
			lastMinEl[ext] = el
		}
		el._txt = content
		if (ext === "js" || ext === "css" || ext === "view") {
			if (el.inline !== "" && el.defer !== "" && loadFiles.indexOf(el) < 0) loadFiles.push(el)
		}
	}

	function $$(sel) {
		return Array.from(doc.querySelectorAll(sel))
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
			if (el.previousSibling.nodeType === doc.TEXT_NODE) el.parentNode.removeChild(el.previousSibling)
			el.parentNode.removeChild(el)
		}
	}
	function getSrc(el) {
		return (el.src || el.href || el)
	}
	function getExt(el) {
		var ext = getSrc(el).split("?")[0].split(".").pop()
		//var ext = el.tagName === "SCRIPT" ? "js" : el.tagName === "STYLE" ? "css" : getSrc(el).split("?")[0].split(".").pop()
		return ext === "tpl" ? "view" : ext
	}
	function read(_name) {
		var el = this
		, name = getSrc(_name || el)
		if (name.nodeType) return name.parentNode ? name._txt || name.textContent : ""
		var fullPath = path.resolve(inDir, name.split("?")[0])
		, content = httpRe.test(name) ?
			cache[name] || (cache[name] = child.execSync("curl " + name + "|uglifyjs --beautify").toString("utf8")) :
			cli.readFile(name = fs.existsSync(fullPath) ? fullPath : require.resolve(defMap(name)))
		, ext = getExt(name)
		, extTo = getExt(el) || ext

		if (ext !== extTo) {
			if (extTo !== "js") throw "Can not transform to " + extTo
			if (ext === "view") {
				content = parseView(content, extTo, lastMinEl)
			} else if (ext === "css") {
				content = css2js(content)
			}
		}
		if (el.drop) content = content.replace(
			RegExp("\\/(\\*\\*+)\\s*(" + el.drop.replace(/[^\w.:]+/g, "|") + ")\\s*\\1\\/", "g"), "/$1 $2 $1"
		).replace(
			RegExp("/(?=\\*\\* (" + el.drop.replace(/[^\w.:]+/g, "|") + "))$", "mg"), ""
		)
		if (el.banner && banner[extTo]) {
			content = banner[extTo].replace(/\{0\}/g, el.banner) + content
			el.removeAttribute("banner")
		}
		return content
	}
	function minimize(el, _opts) {
		var content = (_opts.input || "") + (_opts.files || []).map(read, _opts).join("\n")
		, ext = getExt(el._min || el)
		if (ext === "json") {
			return JSON.stringify(JSON.parse(content))
		}
		if (ext === "css") {
			return cssMin(content, {inDir:inDir, outDir:outDir, inFile: el._min || el.href, outFile: el._min})
			//return child.execSync("csso", { input: content }).toString("utf8")
		}
		if (ext === "view") {
			return viewMin(parseView(content, ext, lastMinEl), {})
		}
		if (ext === "js") {
			var cmd = [
				"uglifyjs --warn --ie8 -c 'evaluate=false,properties=false'",
				"-m eval --comments '/^\\s*[@!]/'",
				"--beautify 'beautify=false,semicolons=false,keep_quoted_props=true' --"
			].concat(_opts.files || []).join(" ")
			return child.execSync(cmd, _opts).toString("utf8").replace(/\\x0B/g, "\\v")
		}
		throw "Invalid file ext " + ext
	}
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
	return content ? ";xhr.css('" + cssMin(content, {}).replace(/\n+/g, "").replace(/'/g, "\\'") + "');" : ""
}
function view2js(content) {
	return content ? ";El.tpl('" + viewMin(content, {}).replace(/\n+/g, "\x1f").replace(/'/g, "\\$&") + "');" : ""
}

function cssImport(str, attrs) {
	var match, out
	, lastIndex = 0
	, re = /@import\s+url\((['"]?)(?!data:)(.+?)\1\);*/ig
	, inDir = path.resolve(attrs.inDir || "", attrs.inFile || "").replace(/[^\/]+$/, "")
	, outDir = path.resolve(attrs.outDir || "", attrs.outFile || "inline").replace(/[^\/]+$/, "")

	if (inDir !== outDir) {
		str = str.replace(/\/\*(?!!)[^]*?\*\/|url\((['"]?)(?!data:)(.+?)\1\)/ig, function(_, q, name) {
			return name ?
			"url(\"" + path.relative(outDir, path.resolve(inDir + name)) + "\")" :
			_
		})
	}

	for (out = [ str ]; (match = re.exec(str)); ) {
		out.splice(-1, 1,
			str.slice(lastIndex, match.index),
			cssImport(cli.readFile(path.resolve(outDir, match[2])), {
				inDir: inDir,
				inFile: inDir + match[2],
				outDir: outDir,
				outFile: attrs.outFile
			}),
			str.slice(lastIndex = re.lastIndex)
		)
	}
	return out.filter(Boolean).join("")
}

function cssMin(str, attrs) {
	var out = cssImport(str, attrs)
	.replace(/\/\*(?!!)[^]*?\*\//g, "")
	.replace(/[\r\n]+/g, "\n")

	.replace(/(.*)\/\*!\s*([\w-]+)\s*([\w-.]*)\s*\*\//g, cmdFn)

	// Remove optional spaces and put each rule to separated line
	.replace(/(["'])((?:\\\1|.)*?)\1|[^"']+/g, clearFn)

	// Use CSS shorthands
	//.replace(/([^0-9])-?0(px|em|%|in|cm|mm|pc|pt|ex)/g, "$10")
	//.replace(/:0 0( 0 0)?(;|})/g, ":0$2")
	.replace(/url\("([\w\/_.-]*)"\)/g, "url($1)")
	.replace(/([ :,])0\.([0-9]+)/g, "$1.$2")

	return out
	return child.execSync("csso", {input:out}).toString("utf8")
	.replace(/.{10000}\}/g, "$&\n")

	function cmdFn(_, line, cmd, param) {
		switch (cmd) {
		case "data-uri":
			var enc = param || "base64"
			line = line.replace(/url\((['"]?)(.+?)\1\)/g, function(_, quote, fileName) {
				var str = fs.readFileSync(path.resolve(attrs.root + fileName), enc)
				return "url(\"data:image/" + fileName.split(".").pop() + ";" + enc + "," + str + "\")"
			})
			break;
		}
		return line
	}
	function clearFn(_, q, str) {
		if (q) return q == "'" && str.indexOf("\"") == -1 ? "\"" + str + "\"" : _
		return _.replace(/[\t\n]/g, " ")
		.replace(/ *([,;{}>~+]) */g, "$1")
		.replace(/^ +|;(?=})/g, "")
		.replace(/: +/g, ":")
		.replace(/ and\(/g, " and (")
		.replace(/}(?!})/g, "}\n")
	}
}

function parseView(content, extTo, lastMinEl) {
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
				i -= i - last
				last = -1
			}
		} else if (map.hasOwnProperty(line)) last = i - 1
	}

	var out = ""
	if ((line = map["%css"])) {
		if (lastMinEl.css) lastMinEl.css._txt += line
		else out += extTo === "js" ? css2js(line) : "%css " + line
	}
	if ((line = map["%js"])) {
		if (lastMinEl.js && extTo !== "js") lastMinEl.js._txt += line
		else out += extTo === "js" ? line : "%js " + line
	}
	if ((line = arr.join("\n"))) {
		if (lastMinEl.view && extTo !== "view") lastMinEl.view._txt += line
		else out += extTo === "js" ? view2js(line) : line
	}
	return out
}

function viewMin(str, attrs) {
	var out = [""]
	, templateRe = /([ \t]*)(%?)((?:("|')(?:\\\4|.)*?\4|[-\w:.#[\]]=?)*)[ \t]*([>^;@|\\\/]|!?=|)(([\])}]?).*?([[({]?))(?=\x1f|\n|$)+/g
	, parent = 0
	, stack = [-1]

	str
	.replace(/^([ \t]+)(;\w+:+)[ \t]+/gm, "$1$2")
	.replace(/^([ \t]+)(;.*)\n\1(;.*)/gm, "$1$2$3")
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
			out[parent] += " ".repeat(indent.length) + all.slice(indent.length) + "\n"
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
	, re = /(\s+VERSION\s*=\s*)("|').*?\2/
	, current = cli.readFile(opts.inDir + file)
	, log = "# Update worker: " + file

	readHashes(root)

	var updated = current
	.replace(re, function(_, a, q) {
		return a + q + now.toISOString() + q
	})
	.replace(/ FILES = (\[[^\]]+\])/, function(all, files) {
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
		return " FILES = " + JSON.stringify(files, null, "\t")
	})

	if (current != updated) {
		console.error(log)
		cli.writeFile(opts.outDir + file, updated)
	}
}

function isString(str) {
	return typeof str === "string"
}


