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
, commands = {
	css: cssMin,
	js: "uglifyjs --warn --ie8 -c 'evaluate=false,properties=false' -m eval --comments '/^\\s*[@!]/' --beautify 'beautify=false,semicolons=false,keep_quoted_props=true'",
	//esbuild --minify --target=es5 load.js
	json: function(attrs) {
		return JSON.stringify(JSON.parse(attrs._j))
	},
	view: viewMin
}
, fileHashes
, conf = {
	date: now.toISOString().split("T")[0]
}
, linked = module.filename.indexOf(process.cwd()) !== 0

try {
	Object.assign(conf, require(path.resolve("package.json")))
	console.log("# Build %s@%s with %s@%s", conf.name, conf.version, cli.name, cli.version)
} catch(e) {
	console.log(e)
}

if (linked) {
	module.paths = require("module")._nodeModulePaths(process.cwd())
	// module.paths.push(path.resolve(process.env.npm_config_prefix, "lib", "node_modules"))
	// module.paths.push(path.resolve(process.cwd(), "node_modules"))
}


module.exports = function(opts) {
	if (opts.ver) conf.version = opts.ver

	var out = opts.out || opts.args[0]
	, attrs = {
		inDir: opts.args[0].replace(/[^\/]+$/, ""),   // Input dir
		inFile: opts.args[0].replace(/.*\//, ""),      // Input file
		outDir: out.replace(/[^\/]+$/, ""),            // Output dir
		outFile: out.replace(/.*\//, ""),               // Output file
		_j: cli.readFile(opts.args[0])
	}
	html(attrs, function(output) {
		if (opts.readme !== false) {
			output = format(output)
		}
		if (opts.out) cli.writeFile(out, output)
		else process.stdout.write(output)

		if (opts.worker) {
			updateWorker(opts.worker, attrs, {})
		}
		child.execSync("git add -u")
	})
}

function html(opts, next) {
	var doc = parser.parseFromString(opts._j)
	, httpRe = /^https?(?=:)/
	, inDir = opts.inDir
	, inFile = path.resolve(inDir + opts.inFile)
	, outDir = opts.outDir
	, loadFiles = []
	, loadFilesRe = /\/[*\/]!{loadFiles}[*\/]*/
	, cacheFile = inFile + ".cache.json"
	, cache = {}
	, written = {}
	, lastMinEl = {}

	try {
		var age = (now - Date.parse(fs.statSync(cacheFile).mtime))
		if (age < 36000000) cache = require(cacheFile)
	} catch(e) {}

	readHashes(inDir)

	$$("[exclude]").forEach(remove)

	following("cat", function(el, siblings) {
		setLastEl(el, el.cat.match(/[^,\s]+/g) || [], siblings)
		write(inDir, getSrc(el), el._txt, el)
	})

	following("min", function(el, siblings) {
		setLastEl(el, [el], siblings)
		el[el.src ? "src" : el.href ? "href" : "_min"] = el._min = getSrc(el.min || el)
	})


	//*
	$$("[src]:not([src^='data:']),[href]:not([href^='data:'])").forEach(function(el) {
		if (el._txt) return
		var name = getSrc(el)
		, name2 = name.split("?")[0]
		if (name.indexOf("{h}") > -1) {
			el[el.src ? "src" : "href"] = name.replace("{h}", fileHashes[name2] || now.getTime())
		}
		if (inDir !== outDir) {
			cli.cp(path.resolve(inDir, name2), path.resolve(outDir, name2))
		}
	})
	//*/

	$$("[_min]:not([inline])").forEach(function(el) {
		write(outDir, el._min, minimize(el, { input: el._txt }), el)
		delete el._min
		delete el._txt
	})

	$$("[inline]").forEach(function(el) {
		if (el.defer === "") throw "Defered can not be inline"
		if (el.if) throw "Conditional load can not be inline"
		var content = el._txt
		if (loadFilesRe.test(content)) {
			content = content.replace(loadFilesRe, "" + loadFiles.map(function(el) {
				return (el.if ? "(" + el.if + ")&&" : "") + JSON.stringify(getSrc(el))
			}))
			loadFiles.forEach(remove)
		}
		if (el._min) content = minimize(el, { input: content })
		el.parentNode.insertBefore(doc.createElement(el.tagName === "SCRIPT" ? "script" : "style"), el).textContent = "\n" + content.trim() + "\n"
		remove(el)
	})

	if (Object.keys(cache)[0]) write(inDir, cacheFile, JSON.stringify(cache, null, 2), {})

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
		$$("[%]:not([%='']),[%=''][inline='']".replace(/%/g, attr)).forEach(function(el) {
			for (
				var pos = el, siblings = [], sel = "[" + attr + "='']:not([inline])";
				(pos = pos.nextElementSibling) && pos.matches(sel);
				siblings.push(pos)
			);
			fn(el, siblings)
			siblings.forEach(remove)
			removeAttrs(el, [attr])
		})
	}
	function remove(el) {
		if (el.parentNode) {
			if (el.previousSibling.nodeType === doc.TEXT_NODE) el.parentNode.removeChild(el.previousSibling)
			el.parentNode.removeChild(el)
		}
	}
	function removeAttrs(el, attrs) {
		if (el.removeAttribute) attrs.forEach(el.removeAttribute, el)
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
		var name = getSrc(_name)
		if (name.nodeType) return name.parentNode ? name._txt || name.textContent : ""
		var fullPath = path.resolve(inDir, name.split("?")[0])
		, content = httpRe.test(name) ?
			cache[name] || (cache[name] = child.execSync("curl " + name + "|uglifyjs --beautify").toString("utf8")) :
			cli.readFile(name = fs.existsSync(fullPath) ? fullPath : require.resolve(defMap(name)))
		, ext = getExt(name)
		, extTo = getExt(this) || ext

		if (ext !== extTo) {
			if (extTo !== "js") throw "Can not transform to " + extTo
			if (ext === "view") {
				var map = parseView(content)
				content = ""
				if (lastMinEl.css) lastMinEl.css._txt += map.css
				else content += css2js(map.css)
				if (lastMinEl.view) lastMinEl.view._txt += map.view
				else content += view2js(map.view)
				if (lastMinEl.js) lastMinEl.js._txt += map.js
				else content += map.js
			} else if (ext === "css") {
				content = css2js(content)
			}
		}
		return content
	}
	function contentHash(content) {
		var hash = child.execSync("git hash-object -w --stdin", { input: content }).toString("utf8")
		return child.execSync("git rev-parse --short=1 " + hash).toString("utf8").trim()
	}
	function write(dir, name, content, el) {
		var ext = getExt(name)
		if (el.drop) content = content.replace(
			RegExp("\\/(\\*\\*+)\\s*(" + el.drop.replace(/[^\w.:]+/g, "|") + ")\\s*\\1\\/", "g"), "/$1 $2 $1"
		)
		if (el.banner && banner[ext]) {
			content = banner[ext].replace(/\{0\}/g, el.banner) + content
		}
		if (name.indexOf("{h}") > -1) {
			name = name.replace("{h}", contentHash(content))
		}
		el[el.src ? "src" : "href"] = name
		name = path.resolve(dir, name.split("?")[0])
		cli.writeFile(name, written[name] = content)
		removeAttrs(el, ["banner", "drop"])
		return name
	}
	function minimize(el, _opts) {
		var content = (_opts.input || "") + (_opts.files || []).map(read, _opts).join("\n")
		, ext = getExt(el.min || el)
		if (ext === "json") {
			return JSON.stringify(JSON.parse(content))
		}
		if (ext === "css") {
			return cssMin({_j: _opts.input, inDir:inDir, outDir:outDir, inFile: el.min || el.href, outFile: el.min})
			//return child.execSync("csso", { input: content }).toString("utf8")
		}
		if (ext === "view") {
			var map = parseView(content)
			content = ""
			if (lastMinEl.css) lastMinEl.css._txt += map.css
			else content += "%css " + map.css
			if (lastMinEl.js) lastMinEl.js._txt += map.js
			else content += "%js " + map.js
			content += map.view
			return viewMin({_j: content})
		}
		if (ext === "js") {
			var cmd = [
				"uglifyjs --warn --ie8 -c 'evaluate=false,properties=false'",
				"-m eval --comments '/^\\s*[@!]/'",
				"--beautify 'beautify=false,semicolons=false,keep_quoted_props=true' --"
			].concat(_opts.files || []).join(" ")
			return child.execSync(cmd, _opts).toString("utf8")
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

function run(attrs) {
	var cmd = commands[attrs._e]
	return (
		!isString(attrs.outFile) ? attrs._j :
		isString(cmd) ?
		child.execSync(cmd, {input:attrs._j}).toString("utf8").replace(/.{10000}\}/g, "$&\n") :
		typeof cmd === "function" ? cmd(attrs) :
		attrs._j
	)
	.replace(/\\x0B/ig, "\\v")
	.trim()
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
	return content ? ";xhr.css('" + content.replace(/\n/g, "").replace(/'/g, "\\'") + "')" : ""
}
function view2js(content) {
	return content ? ";El.tpl('" + content.replace(/\n+/g, "\x1f").replace(/'/g, "\\$&") + "')" : ""
}

function cssImport(attrs) {
	var match, out
	, str = attrs._j
	, lastIndex = 0
	, re = /@import\s+url\((['"]?)(?!data:)(.+?)\1\);*/ig
	, inDir = path.resolve(attrs.inDir, attrs.inFile || "").replace(/[^\/]+$/, "")
	, outDir = path.resolve(attrs.outDir, attrs.outFile || "inline").replace(/[^\/]+$/, "")

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
			cssImport({
				inDir: inDir,
				inFile: inDir + match[2],
				outDir: outDir,
				outFile: attrs.outFile,
				_j: cli.readFile(path.resolve(outDir, match[2]))
			}),
			str.slice(lastIndex = re.lastIndex)
		)
	}
	return out.filter(Boolean).join("")
}

function cssMin(attrs) {
	var out = cssImport(attrs)
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

function parseView(content) {
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

	return {
		css: map["%css"],
		js: map["%js"] ? ";!function(){" + map["%js"] + "}()" : "",
		view: viewMin({_j:arr.join("\n")})
	}
}

function viewMin(attrs) {
	var out = [""]
	//, templateRe = /^([ \t]*)(%?)((?:("|')(?:\\?.)*?\4|[-\w:.#[\]]=?)*)[ \t]*([>^;@|\\\/]|!?=|)(([\])}]?).*?([[({]?))$/gm
	, templateRe = /([ \t]*)(%?)((?:("|')(?:\\\4|.)*?\4|[-\w:.#[\]]=?)*)[ \t]*([>^;@|\\\/]|!?=|)(([\])}]?).*?([[({]?))(?=\x1f|\n|$)+/g
	, parent = 0
	, stack = [-1]

	attrs._j.replace(templateRe, work)

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
		} else if (plugin && (name === "js" || name === "css")) {
			out[parent] += all
			parent = out.push({
				inFile: attrs.inFile, outFile: attrs.outFile, inDir: attrs.inDir, outDir: attrs.inDir,
				_j: "", _e: name, _p: " ".repeat(indent.length + 1),
				toString: function() {
					return this._p + run(this).split("\n").join("\n" + this._p)
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
		console.log(log)
		cli.writeFile(opts.outDir + file, updated)
	}
}

function isString(str) {
	return typeof str === "string"
}


