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

var key
, child = require("child_process")
, fs = require("fs")
, path = require("path")
, cli = require("..")
, now = new Date()
, lastStr = ""
, htmlMap = {
	lt: "<", gt: ">", quot: "\"", amp: "&",
	"#x60": "`"
}
, escRe = /([&"<>`])/g
, unescRe = /&(\w+|#(x|)([\da-f]+));/ig
, adapter = {
	view: view2js
}
, alias = {
	tpl: "view"
}
, banner = {
	css: "/*! {0} */\n",
	html: "<!-- {0} -->\n",
	js: "/*! {0} */\n",
	tpl: "/{0}\n"
}
, commands = {
	css: cssMin,
	js: "uglifyjs --warn --ie8 -c 'evaluate=false,properties=false' -m eval --comments '/^\s*[@!]/' --beautify 'beautify=false,semicolons=false,keep_quoted_props=true'",
	//js: "uglifyjs",
	json: function(attrs) {
		return JSON.stringify(JSON.parse(attrs._j))
	},
	tpl: tplMin,
	view: tplMin
}
, fileHashes = {}
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

for (key in htmlMap) htmlMap[htmlMap[key]] = "&" + key + ";"

module.exports = function(opts) {
	if (opts.ver) conf.version = opts.ver

	var out = opts.out || opts.args[0]
	, attrs = {
		_i: opts.args[0].replace(/[^\/]+$/, ""),   // Input dir
		_s: opts.args[0].replace(/.*\//, ""),      // Input file
		_o: out.replace(/[^\/]+$/, ""),            // Output dir
		_m: out.replace(/.*\//, ""),               // Output file
		_j: cli.readFile(opts.args[0])
	}
	, output = html(attrs)
	if (opts.readme !== false) {
		output = format(output)
	}
	cli.writeFile(out, output)

	if (opts.worker) {
		updateWorker(opts.worker, attrs, {})
	}
	child.execSync("git add -u")
}

function html(opts) {
	var attr, attrs, arr, ext
	, min = {}
	, tagRe = /<(!--([\s\S]*?)--|!\[[\s\S]*?\]|[?!][\s\S]*?|((\/|)[^\s\/>]+)([^>]*?)\/?)>|[^<]+/g
	, attrRe = /\b([-.:\w]+)\b(?:\s*=\s*(?:("|')((?:\\\2|(?!\2)[\s\S])*?)\2|(\S+)))?/g
	, dropRe = /^(banner|cat|drop|if|inline|min)$/
	, out = []
	, loadFiles = []
	, minList = []
	, hashMap = {}

	for (; (match = tagRe.exec(opts._j)); ) {
		if (match[4] === "" && match[5]) {   // start with attributes
			ext = match[3] === "script" ? "js" : "css"
			arr = []
			for (attrs = {_l: out.length, _i: opts._i, _o: opts._o, _j: ""}; (attr = attrRe.exec(match[5])); ) {
				attrs[attr[1]] = (attr[3] || attr[4] || "").replace(unescRe, htmlReplace).replace(/\s+/g, " ").trim()
				if (!dropRe.test(attr[1])) {
					arr.push(attr[1] + "=\"" + attrs[attr[1]].replace(escRe, htmlReplace) + "\"")
				}
			}
			if (match[3] === "script" || match[3] === "style") {
				for (; (attr = tagRe.exec(opts._j)) && attr[3] !== "/" + match[3]; attrs._j += attr[0]);
			}
			if (attrs.exclude === "") continue
			if (attr = attrs._s = attrs.src || attrs.href) {
				if (attr.indexOf("{") > -1) hashMap[opts._o + attr.split("?")[0]] = attrs
				attr = opts._i + attr.split("?")[0]
				ext = attr.split(".").pop()
				if (alias[ext]) ext = alias[ext]
				if (typeof attrs.cat === "string") {
					if (typeof attrs.min !== "string") minList.push(attrs)
					attrs._j = attrs.cat ? attrs.cat.match(/[^,\s]+/g).map(cat).join("\n") : ""
					if (attrs.type !== "build") {
						cli.writeFile(opts._i + attrs._s, drop(attrs))
					}
				} else if (attrs.inline === "" || typeof attrs.min === "string") {
					attrs._j = cli.readFile(attr)
				} else if (opts._i !== opts._o) {
					cli.cp(opts._i + attrs._s, opts._o + attrs._s)
				}
			}

			attrs._e = ext
			attrs._t = ext == "css" ? "style" : match[3]
			if (typeof attrs.min === "string") {
				if (attrs.min === "" && adapter[ext]) {
					attr = adapter[ext](attrs)
					if (min.css) min.css._j += attr.css
					else if (attr.css) attr.js += ";xhr.css('" + attr.css.replace(/\n/g, "").replace(/'/g, "\\'") + "')"
					if (min.view) min.view._j += attr.view
					else if (attr.view) attr.js += ";El.tpl('" + attr.view.replace(/\n+/g, "\x1f").replace(/'/g, "\\$&") + "')"
					if (min.js) min.js._j += attr.js
					else if (attr.js) throw "Should create a new script tag"
					continue
				}
				if (attrs.min || !min[ext]) {
					attrs._m = attrs.min || attrs.inline !== "" && minList.length.toString(32) + "." + ext + "?{h}" || ""
					if (attrs._m.indexOf("{") > -1) hashMap[opts._o + attrs._m.split("?")[0]] = attrs
					minList.push(min[ext] = attrs)
					if (ext == "css" || ext == "js" || ext == "view" || ext == "tpl") {
						if (min[ext].inline !== "") loadFiles.push(attrs)
						out.push("")
					} else {
						min[ext] = null
					}
				} else {
					min[ext]._j += "\n" + attrs._j.trim()
				}
				if (min[ext]) continue
			} else if (attrs.inline === "") {
				minList.push(min[ext] = attrs)
				continue
			}
			arr = arr[0] ? " " + arr.join(" ").replace(/="([-.:\w]+)"/g, "=$1") + ">" : ">"
		} else if (arr !== ">") arr = ">"
		attr = (
			match[3] ? "<" + match[3] + arr :            // start or close tag
			match[2] ? "" :                              // comment
			match[1] ? match[0].replace(/\s+/g, " ") :   // doctype
			match[0].trim()                              // text
		)
		if (attr !== "") out.push(attr)
	}
	for (attr = 0; attrs = minList[attr++]; ) {
		if (attrs.drop) attrs._j = drop(attrs)
		if (opts.readme !== false) attrs._j = format(attrs._j)
		if (attrs.type === "build") {
			cli.writeFile(opts._i + attrs._s, attrs._j.trim())
		}
		if (attrs.inline !== "") {
			ext = run(attrs)
			if (attrs.banner && banner[attrs._e]) ext = banner[attrs._e].replace(/\{0\}/g, attrs.banner) + ext
			if (attrs._m) {
				cli.writeFile(opts._o + attrs._m, ext)
			}
		}
	}

	readHashes(opts._o)

	Object.keys(hashMap).forEach(function(file) {
		if (!fileHashes[file]) return console.log("WARN: %s not commited?", file)
		var attrs = hashMap[file]
		, res = JSON.stringify(rep(attrs._m || attrs._s, {h:fileHashes[file]})).replace(/="([-.:\w]+)"/g, "=$1")
		out[attrs._l] = out[attrs._l].replace(/\b(src|href)=[^ >]+/, "$1=" + res)
	})

	loadFiles = "" + loadFiles.map(function(attrs) {
		return (attrs.if ? "(" + attrs.if + ")&&" : "") + JSON.stringify(rep(attrs._m, {h:fileHashes[opts._o + attrs._m.split("?")[0]]}))
	})
	for (attr = 0; attrs = minList[attr++]; ) {
		if (attrs.inline === "") {
			attrs._j = attrs._j.replace(/\/[*\/]!{loadFiles}[*\/]*/, loadFiles).trim()
			if (typeof attrs._m === "string") attrs._j = run(attrs)
			out[attrs._l] += rep("<{_t}>\n{_j}\n</{_t}>", attrs)
		}
	}

	return out.join("")

	function cat(name) {
		var fullPath = path.resolve(opts._i + name)
		return cli.readFile(fs.existsSync(fullPath) ? fullPath : require.resolve(defMap(name))).trim()
	}
}
function htmlReplace(ent, name, hex, num) {
	return (
		typeof hex === "string" ? String.fromCharCode(parseInt(num, hex ? 16 : 10)) :
		typeof htmlMap[name] == "string" ? htmlMap[name] :
		ent
	)
}
function drop(attrs) {
	return attrs.drop ? attrs._j.replace(
		RegExp("\\/(\\*\\*+)\\s*(" + attrs.drop.replace(/[^\w.:]+/g, "|") + ")\\s*\\1\\/", "g"),
		"/$1 $2 $1"
	) : attrs._j
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
		typeof attrs._m !== "string" ? attrs._j :
		typeof cmd === "string" ?
		child.execSync(cmd, {input:attrs._j}).toString("utf8").replace(/.{10000}\}/g, "$&\n") :
		typeof cmd === "function" ? cmd(attrs) :
		attrs._j
	)
	.replace(/\\x0B/ig, "\\v")
	.trim()
}
function rep(str, map) {
	return str.replace(/\{(.+?)}/g, function(match, expr) {
		var junk = expr.split(";")
		return Array.isArray(map[junk[0]]) ? map[junk[0]].join(junk[1]) : map[junk[0]] || now.getTime()
	})
}
function readHashes(root) {
	child.execSync("cd " + root + ";git add -u;git ls-files -sz --abbrev=1")
	.toString("utf8").split("\0").map(function(line) {
		line = line.split(/\s+/)
		if (line[1]) fileHashes[root + line[3]] = line[1]
	})
}


function view2js(attrs) {
	var line
	, arr = attrs._j.split(/[\n\x1f]/)
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
		view: tplMin({_j:arr.join("\n")})
	}
}

function cssImport(attrs) {
	var match, out
	, str = attrs._j
	, lastIndex = 0
	, re = /@import\s+url\((['"]?)(?!data:)(.+?)\1\);*/ig
	, inDir = path.resolve(attrs._i, attrs._s || "").replace(/[^\/]+$/, "")
	, outDir = path.resolve(attrs._o, attrs._m || "inline").replace(/[^\/]+$/, "")

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
				_i: inDir,
				_s: inDir + match[2],
				_o: outDir,
				_m: attrs._m,
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
	.replace(/(["'])((?:\\?.)*?)\1|[^"']+/g, clearFn)

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
			line = line.replace(/url\((['"]?)(.+?)\1\)/g, function(_, quote, fileName) {
				var str = fs.readFileSync(path.resolve(opts.root + fileName), "base64")
				return "url(\"data:image/" + fileName.split(".").pop() + ";base64," + str + "\")"
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

function tplMin(attrs) {
	var out = [""]
	//, templateRe = /^([ \t]*)(%?)((?:("|')(?:\\?.)*?\4|[-\w:.#[\]]=?)*)[ \t]*([>^;@|\\\/]|!?=|)(([\])}]?).*?([[({]?))$/gm
	, templateRe = /([ \t]*)(%?)((?:("|')(?:\\?.)*?\4|[-\w:.#[\]]=?)*)[ \t]*([>^;@|\\\/]|!?=|)(([\])}]?).*?([[({]?))(?=\x1f|\n|$)+/g
	, parent = 0
	, stack = [-1]

	attrs._j.replace(templateRe, work)

	//return out.join("\n")
	return out.join("\n")//.replace(/^[\s\x1f]+|[\s\x1f]+$/g, "").replace(/\n+/g, "\\n")

	function work(all, indent, plugin, name, q, op, text, mapEnd, mapStart, offset) {
		if (offset && all === indent) return

		for (q = indent.length; q <= stack[0]; ) {
			if (typeof out[parent] !== "string") {
				parent = out.push("") - 1
			}
			stack.shift()
		}

		if (typeof out[parent] !== "string") {
			out[parent]._j += all + "\n"
		} else if (plugin && (name === "js" || name === "css")) {
			out[parent] += all
			parent = out.push({
				_s: attrs._s, _m: attrs._m, _i: attrs._i, _o: attrs._i,
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
	var root = opts._i + file.replace(/[^\/]+$/, "")
	, re = /(\s+VERSION\s*=\s*)("|').*?\2/
	, current = cli.readFile(opts._i + file)
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
		cli.writeFile(opts._o + file, updated)
	}
}


