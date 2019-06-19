//-
//-  Usage
//-    litejs build
//-
//-  build options
//-    --banner, -b    Add commented banner to output
//-    --input, -i     Input file
//-    --output, -o    Output file
//-    --readme, -r    Replase readme tags in file
//-
//-  Examples
//-    litejs build -r README.md -i ui/dev.html -o ui/index.html
//-


var undef, conf
, PAC = require("../../package.json")
, fs = require("fs")
, child = require("child_process")
, spawn = child.spawn
, now = new Date()
, path = require("../path")
, events = require("../events")
, cli = require("./")
, Fn = require("../fn.js").Fn
, files = {}
, fileHashes = {}
, hasOwn = files.hasOwnProperty
, adapters = File.adapters = {
	css: {
		split: cssSplit, min: cssMin, banner: "/*! {0} */\n"
	},
	html: {
		split: htmlSplit, sep: "", banner: "<!-- {0} -->\n",
		transpilers: {
			js: jsToHtml, css: cssToHtml
		}
	},
	js: {
		min: jsMin, banner: "/*! {0} */\n",
		transpilers: {
			tpl: tplToJs, view: tplToJs
		}
	},
	tpl: {
		min: tplMin, banner: "/{0}\n"
	}
}
, translate = {
	// http://nodejs.org/api/documentation.html
	stability: "0 - Deprecated,1 - Experimental,2 - Unstable,3 - Stable,4 - API Frozen,5 - Locked".split(","),
	date: now.toISOString().split("T")[0]
}
, linked = __dirname.indexOf(process.cwd()) !== 0

adapters.view = adapters.tpl

try {
	conf = require(path.resolve("package.json"))
	console.log("Build %s@%s with %s@%s", conf.name, conf.version, PAC.name, PAC.version)
} catch(e) {
	console.error(e)
	conf = {}
}

if (linked) {
	module.paths = require("module")._nodeModulePaths(process.cwd())
	// module.paths.push(path.resolve(process.env.npm_config_prefix, "lib", "node_modules"))
	// module.paths.push(path.resolve(process.cwd(), "node_modules"))
}

function File(_name, _opts) {
	var file = this
	, name = _name === "-" ? _name : path.resolve(_name.split("?")[0])

	if (_name && files[name]) {
		return files[name]
	}
	if (!(file instanceof File)) {
		return new File(_name, _opts)
	}

	var opts = file.opts = _opts || {}
	, ext = file.ext = opts.ext || (
		name === "-" ?
		"" + opts.input :
		name
	).split(".").pop()

	files[name] = file
	file._depends = []
	file.write = file.write.bind(file)

	if (!("root" in opts)) {
		opts.root = name.replace(/[^\/]*$/, "")
	}
	file.name = opts.name = name//.slice(opts.root.length)

	if (typeof opts.input == "string") {
		opts.input = [ opts.input ]
	}
	if (!opts.warnings) opts.warnings = []

	if (opts.sourceMap === true) {
		opts.sourceMap = name.replace(/\?|$/, ".map$&").slice(opts.root.length)
	}
	if (opts.drop) {
		if (!opts.replace) {
			opts.replace = []
		}
		opts.replace.push(
			[ new RegExp("\\/\\/(?=\\*\\*\\s+(?:" + opts.drop.replace(/[\s,]+/g, "|") + "))", "g"), "/"],
			[ new RegExp("\\/(\\*{2,})\\s+(?:" + opts.drop.replace(/[^\w]+/g, "|") + ")\\s+\\1\\/", "g"), "$&/*"]
		)
	}

	file.reset()

	setImmediate(file.wait())

	file.build()

	return file
}

File.prototype = {
	wait: Fn.hold,
	syncMethods: ["on", "toString"],
	depends: function(child) {
		var file = this
		child.on("change", file.write)
	},
	reset: function() {
		var file = this

		file._depends.forEach(function() {
			child.off("change", file.write)
		})
		file._depends.length = 0
		file.content = []
	},
	build: function() {
		var file = this
		, opts = file.opts
		, resume = file.wait()
		, adapter = adapters[file.ext] || {}
		, buildResume = Fn.wait(min)

		if (opts.input) {
			file.content = opts.input.map(function(fileName, i, arr) {
				var child = fileName
				if (!(fileName instanceof File)) {
					if (!fs.existsSync(path.resolve(fileName))) {
						fileName = arr[i] = require.resolve(fileName)
					}
					child = File(fileName, {
						root: opts.root,
						warnings: opts.warnings
					})
				}
				child.then(buildResume.wait())
				file.depends(child)
				return child
			})
			file.write()
		} else {
			if (!opts.mem) {
				var source = cli.readFile(file.name)
				file.content = adapter.split ? adapter.split(source, opts) : [ source ]
			}
			file.content.forEach(function(junk, i, arr) {
				if (junk instanceof File) {
					file.depends(junk)
					junk.then(buildResume.wait())
				}
			})
		}

		setImmediate(buildResume)

		function min() {
			file.src = file.content
			.filter(Boolean)
			.map(function(f) {
				if (
					typeof f === "string" ||
					adapters[file.ext] === adapters[f.ext] ||
					!adapters[file.ext].transpilers ||
					!adapters[file.ext].transpilers[f.ext]
				) return f
				return adapters[file.ext].transpilers[f.ext](f.toString())
			})
			.join("sep" in adapter ? adapter.sep : "\n")

			if (opts.replace) {
				opts.replace.forEach(function(arr) {
					file.src = file.src.replace(arr[0], arr[1] || "")
				})
			}

			if (adapter.min && opts.min) {
				var map = file.content.reduce(function(map, f) {
					var str = f instanceof File ? f.src : f
					if (opts.replace) opts.replace.forEach(function(arr) {
						str = str.replace(arr[0], arr[1])
					})
					map[f.name] = (
						typeof f !== "string" &&
						adapters[file.ext] !== adapters[f.ext] &&
						adapters[file.ext].transpilers &&
						adapters[file.ext].transpilers[f.ext] ?
						adapters[file.ext].transpilers[f.ext](f.toString()) :
						str
					)
					return map
				}, {})
				adapter.min(map, opts, function(err, res) {
					file.min = res
					resume()
				})
			} else {
				resume()
			}
		}
	},
	write: function(by) {
		var file = this
		if (file.name === "-") {
			process.stdout.write(file.toString())
		} else if (!file.opts.mem) {
			cli.writeFile(file.name, file.toString())
			if (fileHashes[file.name]) {
				// git rev-parse --short=4 $(git hash-object app/net/ssdp.js)
				var fullHash = child.execSync("git hash-object " + file.name).toString("utf8")
				fileHashes[file.name] = child.execSync("git rev-parse --short=4 " + fullHash).toString("utf8")
			}
		}
		if (file.opts.warnings.length) {
			console.error("WARNINGS:\n - " + file.opts.warnings.join("\n - "))
		}
	},
	then: function(next, scope) {
		if (typeof next == "function") {
			next.call(scope || this)
		}
		return this
	},
	toString: function() {
		var file = this
		, opts = file.opts
		, adapter = adapters[file.ext] || {}
		, banner = opts.banner && adapter.banner && adapter.banner.replace(/\{0\}/g, opts.banner)
		, str = adapter.min && opts.min ? file.min : format(file.src)
		, out = (
			(banner ? format(banner) : "") +
			str.trim() +
			(opts.sourceMap ? "\n//# sourceMappingURL=" + opts.sourceMap + "\n" : "")
		)

		if (opts.outPrefix) {
			out = opts.outPrefix + out.split("\n").join("\n" + opts.outPrefix)
		}

		return out
	}
}

events.asEmitter(File.prototype)

function defMap(str) {
	var chr = str.charAt(0)
	, slice = str.slice(1)
	return chr == "+" ? lastStr + slice :
	chr == "%" ? ((chr = lastStr.lastIndexOf(slice.charAt(0))), (chr > 0 ? lastStr.slice(0, chr) : lastStr)) + slice :
	(chr == "." && this.root ? this.root : "") + (lastStr = str)
}

function htmlQuote(val) {
	// a valid unquoted attribute value in HTML is
	// a not empty string that doesn’t contain spaces, tabs, line feeds, form feeds, carriage returns, "'`=<>
	return (
		/^[^\s'"`<>=]+$/.test(val) ? '"' + val + '"' :
		val
	)
}

function htmlSplit(str, opts) {
	var newOpts, pos, file, ext, file2, match, match2, match3, out, min, replace, tmp, haveInlineJS
	, mined = []
	, lastIndex = 0
	, re = /<link[^>]+href="([^"]*?)"[^>]*?>|<(script)[^>]+src="([^>]*?)"[^>]*><\/\2>/ig
	, banner, bannerRe   = /\sbanner=(("|')([^]+?)\2|[^\s]+)/i
	, inline, inlineRe = /\sinline\b/i
	, drop, dropRe   = /\sdrop=(("|')([^]*?)\2|[^\s]+)/i
	, minRe = /\smin\b(?:=["']?(.+?)["'])?/i
	, requireRe   = /\srequire=(("|')([^]*?)\2|[^\s]+)/i
	, excludeRe = /\sexclude\b/i
	, loadFiles = []
	, hashes = {}

	str = str
	.replace(/<!--(?!\[if)[^]*?-->/g, "")

	for (out = [ str ]; match = re.exec(str); ) {
		file = opts.root + (match[1] || match[3])
		ext = file.split(".").pop()
		pos = out.length
		out.splice(-1, 1,
			str.slice(lastIndex, match.index), "",
			str.slice(lastIndex = re.lastIndex)
		)

		banner = bannerRe.exec(match[0])
		inline = inlineRe.test(match[0])
		drop = dropRe.exec(match[0])

		if (match2 = requireRe.exec(match[0])) {
			lastStr = opts.root
			tmp = (match2[2] ? match2[3] : match2[1]).match(/[^,\s]+/g)
			match2 = File(file, {
				input: tmp ? tmp.map(defMap, opts) : [],
				drop: drop ? drop[3] || drop[1] : ""
			})
			if (!tmp) {
				match2._requireNext = true
			}
		}

		if (excludeRe.test(match[0])) {
			continue
		}

		newOpts = {
			min: 1,
			replace: inline && [
				["/*!{loadFiles}*/", loadFiles],
				["/*!{loadHashes}*/", JSON.stringify(hashes).slice(1, -1)]
			],
			banner: banner ? banner[3] || banner[1] : "",
			drop: drop ? drop[3] || drop[1] : ""
		}

		if (match3 = minRe.exec(match[0])) {
			lastStr = file.slice(opts.root.length)
			file2 = (
				match3[1] ? path.resolve(opts.root, defMap.call(opts, match3[1])) :
				min && (
					adapters[min.ext] === adapters[ext] ||
					(adapters[min.ext].transpilers||[])[ext]
				) ? min.name :
				opts.root + mined.length.toString(32) + "." + ext
			)
			if (!min || min.name !== file2) {
				newOpts.input = []
				min = File(file2, newOpts)
				mined.push(min.wait())
			}
			min.opts.input.push(match2 || file.replace(/\?.*/, ""))
			if (match2 && match2._requireNext) {
				min = match2
			}
			if (min.isLoaded) {
				continue
			}
			min.isLoaded = 1
			file = file2
		}
		var dataIf = /\sif="([^"?]+)/.exec(match[0])
		if (inline) {
			if (match2 && !match3) {
				newOpts.input = [match2]
				newOpts.mem = true
				file = "mem:" + file
			}
			tmp = File(file, newOpts)
			if (match[2]) haveInlineJS = true
			mined.push(tmp.wait())
			out[pos] = tmp
		} else if ((haveInlineJS && match[2]) || dataIf) {
			loadFiles.push(
				(dataIf ? "(" + dataIf[1] + ")&&'" : "'") +
				replacePath(path.relative(opts.root, file), opts) + "'"
			)
		} else {
			tmp = match[0]
			if (match3) {
				tmp = tmp
				.replace(minRe, "")
				.replace(requireRe, "")
				.replace(bannerRe, "")
				.replace(match[1] || match[3], path.relative(opts.root, file))
			}
			out[pos] = tmp
		}
	}
	mined.forEach(function(fn) { fn() })
	return out.filter(Boolean).map(htmlMin, opts)
}

function htmlMin(str) {
	var opts = this
	return typeof str !== "string" ? str : str
	.replace(/[\r\n][\r\n\s]*[\r\n]/g, "\n")
	.replace(/\t/g, " ")
	.replace(/\s+(?=<|\/?>|$)/g, "")
	.replace(/\b(href|src)="(?!data:)(.+?)"/gi, function(_, tag, file) {
		return tag + '="' + replacePath(file, opts) + '"'
	})
}

function jsToHtml(str) {
	return '<script>' + str + '</script>'

}
function cssToHtml(str) {
	return '<style>' + str + '</style>'
}

function cssSplit(str, opts) {
	var match, out
	, lastIndex = 0
	, re = /@import\s+url\((['"]?)(?!data:)(.+?)\1\);*/ig

	if (opts.root !== opts.name.replace(/[^\/]*$/, "")) {
		str = str.replace(/\/\*(?!!)[^]*?\*\/|url\((['"]?)(?!data:)(.+?)\1\)/ig, function(_, q, name) {
			return name ?
			'url("' + replacePath(path.relative(opts.root, path.resolve(opts.name.replace(/[^\/]*$/, name))), opts) + '")' :
			_
		})
	}

	for (out = [ str ]; match = re.exec(str); ) {
		out.splice(-1, 1,
			str.slice(lastIndex, match.index),
			File(path.resolve(opts.root, match[2]), opts),
			str.slice(lastIndex = re.lastIndex)
		)
	}
	return out.filter(Boolean)
}

function cssMin(map, opts, next) {
	var name
	, out = ""
	for (name in map) if (hasOwn.call(map, name)) {
		out += typeof map[name] !== "string" ? map[name] : map[name]
		.replace(/\/\*(?!!)[^]*?\*\//g, "")
		.replace(/[\r\n]+/g, "\n")

		.replace(/(.*)\/\*!\s*([\w-]+)\s*([\w-.]*)\s*\*\//g, function(_, line, cmd, param) {
			switch (cmd) {
			case "data-uri":
				line = line.replace(/url\((['"]?)(.+?)\1\)/g, function(_, quote, fileName) {
					var str = fs.readFileSync(path.resolve(opts.root + fileName), "base64")
					return 'url("data:image/' + fileName.split(".").pop() + ";base64," + str + '")'
				})
				break;
			}
			return line
		})

		// Remove optional spaces and put each rule to separated line
		.replace(/(["'])((?:\\?.)*?)\1|[^"']+/g, function(_, q, str) {
			if (q) return q == "'" && str.indexOf('"') == -1 ? '"' + str + '"' : _
			return _.replace(/[\t\n]/g, " ")
			.replace(/ *([,;{}>~+]) */g, "$1")
			.replace(/^ +|;(?=})/g, "")
			.replace(/: +/g, ":")
			.replace(/ and\(/g, " and (")
			.replace(/}(?!})/g, "}\n")
		})

		// Use CSS shorthands
		//.replace(/([^0-9])-?0(px|em|%|in|cm|mm|pc|pt|ex)/g, "$10")
		//.replace(/:0 0( 0 0)?(;|})/g, ":0$2")
		.replace(/url\("([\w\/_.-]*)"\)/g, "url($1)")
		.replace(/([ :,])0\.([0-9]+)/g, "$1.$2")
	}
	next(null, out)
}

var npmChild

function jsMin(map, opts, next) {
	if (!cli.command("uglifyjs")) {
		console.error("Error: uglify-js not found, run: npm i -g uglify-js\n")
		process.exit(1)
	}
	var name
	, result = ""
	, child = spawn("uglifyjs", [
		"--warn",
		"--compress", "evaluate=false,properties=false",
		"--mangle",
		"--beautify", "beautify=false,semicolons=false,keep_quoted_props=true"
	])

	child.stderr.on("data", function onError(data) {
		data = data.toString().trim()
		if (data !== "") opts.warnings.push(data)
	})
	child.stdout.on("data", function(data) {
		result += data.toString()
	})
	child.on("close", function(code) {
		if (code !== 0) {
			console.error(opts.warnings)
			throw Error("uglifyjs exited with " + code)
		}
		next(null, result)
	})
	for (name in map) if (hasOwn.call(map, name)) {
		child.stdin.write(map[name])
	}
	child.stdin.end()
}

function tplMin(map, opts, next) {
	var out = Object.keys(map)
	, pos = 0

	min()

	function min() {
		var i = pos++
		if (i < out.length) {
			_tplSplit(map[out[i]], opts, function(err, str) {
				out[i] = str
				min()
			})
		} else {
			next(null, out.join("\n"))
		}
	}
}

function _tplSplit(str, opts, next) {
	var templateRe = /^([ \t]*)(@?)((?:("|')(?:\\?.)*?\4|[-\w:.#[\]=])*)[ \t]*(([\])}]?).*?([[({]?))$/gm
	, out = [""]
	, parent = 0
	, stack = [-1]
	, resume = Fn.wait(function() {
		next(null, out.join("\n"))
	})

	str.replace(templateRe, work)

	resume()

	function work(all, indent, plugin, name, q, text, mapEnd, mapStart, offset) {
		if (offset && all === indent) return

		for (q = indent.length; q <= stack[0]; ) {
			if (typeof out[parent] !== "string") {
				parent = out.push("") - 1
			}
			stack.shift()
		}

		if (typeof out[parent] !== "string") {
			if (!out[parent].content.length) out[parent].content.push(all)
			else out[parent].content[0] += all + "\n"
		} else if (plugin && (name === "js" || name === "css")) {
			out[parent] += all
			parent = out.push(
				File("", {mem:1, min:1, ext:name, outPrefix: indent + " "}).then(resume.wait())
			) - 1
			stack.unshift(q)
		} else {
			if (text && text.charAt(0) === "/") return
			out[parent] += all + "\n"
		}
	}
}

function tplToJs(input) {
	var i = input.length
	, singles = 0
	, doubles = 0
	for (; i--; ) {
		if (input.charCodeAt(i) === 34) doubles++
		else if (input.charCodeAt(i) === 39) singles++
	}
	input = input.replace(/\n+/g, "\\n")
	return(
		singles > doubles ?
		'El.tpl("' + input.replace(/"/g, '\\"') + '")' :
		"El.tpl('" + input.replace(/'/g, "\\'") + "')"
	)
}

function readFileHashes(next) {
	var leftover = ""
	, cwd = process.cwd() + "/"
	, git = spawn("git", ["ls-files", "-sz", "--abbrev=1"])

	git.stdout.on("data", onData).on("end", onEnd)
	git.stderr.pipe(process.stderr)

	function onData(data) {
		var lines = (leftover + data).split("\0")
		// keep the last partial line buffered
		leftover = lines.pop()
		lines.forEach(onLine)
	}

	function onEnd() {
		onLine(leftover)
		next()
	}

	function onLine(line) {
		if (line !== "") {
			fileHashes[cwd + line.slice(1 + line.indexOf("\t"))] = line.split(" ")[1]
		}
	}

	// $ git ls-tree -r --abbrev=1 HEAD
	// 100644 blob 1f537	public/robots.txt
	// 100644 blob 0230	public/templates/devices.haml
	// $ git cat-file -p 1f537
}

function execute(args, i) {
	var arg, banner, input, output

	for (; arg = args[i++]; ) {
		switch (arg) {
		case "-b":
		case "--banner":
			banner = args[i++]
			break;
		case "-i":
		case "--input":
			if (!input) input = []
			input.push(args[i++])
			break;
		case "-o":
		case "--output":
			output = args[i++]
			break;
		case "-w":
		case "--worker":
			var opts = { warnings: [] }
			updateWorker(args[i++], opts, {})
			break;
		case "-r":
		case "--readme":
			updateReadme(args[i++])
			break;
		case "-v":
		case "--version":
			var opts = { warnings: [] }
			updateVersion(args[i++])
			break;
		default:
			if (arg.charAt(0) == "-") {
				args.splice.apply(
					args,
					[i, 0].concat(arg.replace(/\w(?!$)/g,"$& " + args[i] + " -").split(" "))
				)
			}
		}
		if (input && output) {
			File(output, {
				banner: banner,
				input: input,
				min: 1
			})
			banner = input = output = ""
		}
	}
}

if (module.parent) {
	// Used as module
	exports.File = File
	exports.updateReadme = updateReadme
	exports.execute = function(args, i) {
		readFileHashes(function() {
			exports.execute = execute
			if (args.length > i) execute(args, i)
			else if (conf.litejs && Array.isArray(conf.litejs.build)) {
				conf.litejs.build.forEach(function(row) {
					execute(row.split(/\s+/), 0)
				})
			}
		})
	}
}

function replacePath(_p, opts) {
	var p = path.normalize(_p)
	if (p.indexOf("{hash}") > -1) {
		var full = path.resolve(opts.root, p.split("?")[0])
		p = p.replace(/{hash}/g, fileHashes[full] || +now)
		if (!fileHashes[full]) {
			opts.warnings.pushUniq("'" + full + "' not commited?")
		}
	}
	return p
}

function format(str) {
	return str.replace(/([\s\*\/]*@(version|date|author|stability)\s+).*/g, function(all, match, tag) {
		tag = translate[tag] ? translate[tag][conf[tag]] || translate[tag] : conf[tag]
		return tag ? match + tag : all
	})
}

function updateReadme(file) {
	var current = cli.readFile(file)
	, updated = format(current)

	if (current != updated) {
		console.error("# Update readme: " + file)
		cli.writeFile(file, updated)
	}
}

function updateVersion(file) {
	var re = /(\s+VERSION\s*=\s*)("|').*?\2/
	, current = cli.readFile(file)
	, updated = current.replace(re, function(_, a, q) {
		return a + q + now.toISOString() + q
	})
	if (current !== updated) {
		console.error("# Update version: " + file)
		cli.writeFile(file, updated)
	}
}

function updateWorker(file, opts, hashes) {
	var root = file.replace(/[^\/]+$/, "")
	, re = /(\s+VERSION\s*=\s*)("|').*?\2/
	, current = cli.readFile(file)
	, updated = current
	.replace(re, function(_, a, q) {
		return a + q + now.toISOString() + q
	})
	.replace(/ FILES = (\[[^\]]+?\])/, function(all, files) {
		files = JSON.parse(files)
		.map(function(line) {
			var name = line.replace(/\?.*/, "")
			, full = path.resolve(root, name)
			if (!fileHashes[full]) {
				opts.warnings.pushUniq("'" + full + "' not commited?")
			} else if (name !== line) {
				hashes[name] = fileHashes[full]
				return name + "?" + fileHashes[full]
			}
			return line
		})
		return " FILES = " + JSON.stringify(files, null, "\t")
	})

	if (current != updated) {
		console.error("# Update worker: " + file)
		cli.writeFile(file, updated)
	}
}


