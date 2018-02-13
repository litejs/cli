#! /usr/bin/env node


var undef, fileHashes, conf, CONF_FILE
, spawn = require("child_process").spawn
, path = require("path")
, util = require("util")
, events = require("events")
, fs = require("fs")
, cli = require("./")
, Fn = require("../fn.js").Fn
, files = {}
, hasOwn = files.hasOwnProperty
, adapters = File.adapters = {
	css: { split: cssSplit, sep: "\n", banner: "/*! {0} */\n" },
	html: { split: htmlSplit, sep: "", banner: "<!-- {0} -->\n" },
	js: { min: jsMin, sep: "\n", banner: "/*! {0} */\n" }
}
, translate = {
	// http://nodejs.org/api/documentation.html
	stability: "0 - Deprecated,1 - Experimental,2 - Unstable,3 - Stable,4 - API Frozen,5 - Locked".split(","),
	date: new Date().toISOString().split("T")[0]
}
, linked = __dirname.indexOf(process.cwd()) !== 0

try {
	CONF_FILE = path.resolve("package.json")
	conf = require(CONF_FILE)
} catch(e) {
	conf = {}
}

if (linked) {
	module.paths = require("module")._nodeModulePaths(process.cwd())
	// module.paths.push(path.resolve(process.env.npm_config_prefix, "lib", "node_modules"))
	// module.paths.push(path.resolve(process.cwd(), "node_modules"))
}

function File(_name, _opts) {
	var file = this
	, name = path.resolve(_name.split("?")[0])

	if (files[name]) {
		return files[name]
	}
	if (!(file instanceof File)) {
		return new File(name, _opts)
	}

	events.call(file)

	var opts = file.opts = _opts || {}
	, ext = file.ext = name.split(".").pop()

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
	if (opts.toggle) {
		if (!opts.replace) {
			opts.replace = []
		}
		opts.replace.push([
			new RegExp("\\/\\/(?=\\*\\*\\s+(?:" + opts.toggle + "))", "g"),
			"/*"
		])
	}

	file.reset()

	setImmediate(file.wait())
	readFileHashes(opts, file.wait())

	file.build()

	return file
}

File.prototype = {
	wait: Fn.hold,
	syncMethods: ["on", "toString"],
	depends: function(child) {
		var file = this
		child.on("change", file.write)
		return file
	},
	reset: function() {
		var file = this

		file._depends.forEach(function() {
			child.off("change", file.write)
		})
		file._depends.length = 0
		file.content = []
		return file
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
			var source = cli.readFile(file.name)

			file.content = adapter.split ? adapter.split(source, opts) : [ source ]
			file.content.forEach(function(junk, i, arr) {
				if (junk instanceof File) {
					file.depends(junk)
					junk.then(buildResume.wait())
				}
			})
		}

		setImmediate(buildResume)

		function min() {
			file.src = file.content.filter(Boolean).join("sep" in adapter ? adapter.sep : "\n")

			if (opts.replace) {
				opts.replace.forEach(function(arr) {
					file.src = file.src.replace(arr[0], arr[1] || "")
				})
			}

			if (adapter.min && opts.min) {
				var map = file.content.reduce(function(map, file) {
					var str = file instanceof File ? file.src : file
					if (opts.replace) opts.replace.forEach(function(arr) {
						str = str.replace(arr[0], arr[1])
					})
					map[file.name] = str
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
		if (!file.opts.mem) {
			cli.writeFile(file.name, file.toString())
		}
		if (file.opts.warnings.length) {
			console.log("WARNINGS:\n - " + file.opts.warnings.join("\n - "))
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

		return (
			(banner ? format(banner) : "") +
			str.trim() +
			(opts.sourceMap ? "\n//# sourceMappingURL=" + opts.sourceMap + "\n" : "")
		)
	}
}

util.inherits(File, events)


function defMap(str) {
	var chr = str.charAt(0)
	, slice = str.slice(1)
	return chr == "+" ? lastStr + slice :
	chr == "%" ? ((chr = lastStr.lastIndexOf(slice.charAt(0))), (chr > 0 ? lastStr.slice(0, chr) : lastStr)) + slice :
	(chr == "." && this.root ? this.root : "") + (lastStr = str)
}

function htmlSplit(str, opts) {
	var newOpts, pos, file, ext, file2, match, match2, match3, out, min, replace, tmp, haveInlineJS
	, mined = []
	, lastIndex = 0
	, re = /<link[^>]+href="([^>]*?)".*?>|<(script)[^>]+src="([^>]*?)"[^>]*><\/\2>/ig
	, banner, bannerRe   = /\sbanner=(("|')([^]+?)\2|[^\s]+)/i
	, inline, inlineRe = /\sinline\b/i
	, toggle, toggleRe   = /\stoggle=(("|')([^]*?)\2|[^\s]+)/i
	, minRe = /\smin\b(?:=["']?(.+?)["'])?/i
	, requireRe   = /\srequire=(("|')([^]*?)\2|[^\s]+)/i
	, excludeRe = /\sexclude\b/i
	, loadFiles = []
	, hashes = {}

	str = str
	.replace(/<!((?:--)+)[^]*?\1>/g, "")
	.replace(/\sdata-manifest=("|')?(.+?)\1/, function(match, q, file) {
		updateManifest(opts.root + file, opts, hashes)
		return " data=" + file
	})

	for (out = [ str ]; match = re.exec(str); ) {
		file = opts.root + (match[1] || match[3])
		ext = match[2] ? "js" : "css"
		pos = out.length
		out.splice(-1, 1,
			str.slice(lastIndex, match.index), "",
			str.slice(lastIndex = re.lastIndex)
		)

		banner = bannerRe.exec(match[0])
		inline = inlineRe.test(match[0])
		toggle = toggleRe.exec(match[0])

		if (match2 = requireRe.exec(match[0])) {
			lastStr = opts.root
			tmp = (match2[2] ? match2[3] : match2[1]).match(/[^,\s]+/g)
			match2 = File(file, {
				input: tmp ? tmp.map(defMap, opts) : [],
				toggle: toggle ? toggle[3] || toggle[1] : ""
			})
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
			toggle: toggle ? toggle[3] || toggle[1] : ""
		}

		if (match3 = minRe.exec(match[0])) {
			lastStr = file.slice(opts.root.length)
			file2 = (
				match3[1] ? opts.root + defMap(match3[1]) :
				min && min.ext == ext ? min.name :
				opts.root + mined.length.toString(32) + "." + ext
			)
			if (!min || min.name !== file2) {
				newOpts.input = []
				min = File(file2, newOpts)
				mined.push(min.wait())
			}
			if (match2) {
				min.opts.input.push(match2)
				min = match2
			} else {
				min.opts.input.push(file.replace(/\?.*/, ""))
				if (min.isLoaded) {
					continue
				}
			}
			min.isLoaded = 1
			file = file2
		}
		var dataIf = /\sif="([^"?]+)/.exec(match[0])
		if (inline) {
			tmp = File(file, newOpts)
			if (match[2]) haveInlineJS = true
			mined.push(tmp.wait())
			out.splice(-2, 1,
				match[2] ? "<script>" : "<style>",
				tmp,
				match[2] ? "</script>" : "</style>"
			)
		} else if ((haveInlineJS && match[2]) || dataIf) {
			loadFiles.push(
				(dataIf ? "(" + dataIf[1] + ")&&'" : "'") +
				normalizePath(file.slice(opts.root.length), opts) + "'"
			)
		} else {
			tmp = match[0]
			if (match3) {
				tmp = tmp
				.replace(minRe, "")
				.replace(requireRe, "")
				.replace(bannerRe, "")
				.replace(match[1] || match[3], file.slice(opts.root.length))
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
	.replace(/[\r\n]+/g, "\n")
	.replace(/\n\s*\n/g, "\n")
	.replace(/\t/g, " ")
	.replace(/\s+(?=<|\/?>|$)/g, "")
	.replace(/\b(href|src)="(?!data:)(.+?)"/gi, function(_, tag, file) {
		return tag + '="' + normalizePath(file, opts) + '"'
	})
}

function cssSplit(str, opts) {
	var match, out
	, lastIndex = 0
	, re = /@import\s+url\((['"]?)(?!data:)(.+?)\1\);*/ig

	if (opts.root !== opts.name.replace(/[^\/]*$/, "")) {
		str = str.replace(/\/\*(?!!)[^]*?\*\/|url\((['"]?)(?!data:)(.+?)\1\)/ig, function(_, q, name) {
			return name ?
			'url("' + normalizePath(path.relative(opts.root, path.resolve(opts.name.replace(/[^\/]*$/, name))), opts) + '")' :
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
	return out.filter(Boolean).map(cssMin, opts)
}

function cssMin(str) {
	var opts = this
	return typeof str !== "string" ? str : str
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
		.replace(/ *([,;{}]) */g, "$1")
		.replace(/^ +|;(?=})/g, "")
		.replace(/: +/g, ":")
		.replace(/ and\(/g, " and (")
		.replace(/}(?!})/g, "}\n")
	})

	// Use CSS shorthands
	.replace(/([^0-9])-?0(px|em|%|in|cm|mm|pc|pt|ex)/g, "$10")
	.replace(/:0 0( 0 0)?(;|})/g, ":0$2")
	.replace(/url\("([\w\/_.-]*)"\)/g, "url($1)")
	.replace(/([ :,])0\.([0-9]+)/g, "$1.$2")
}

var npmChild


function jsMin(str, opts, next, afterInstall) {
	var expectVersion = require("../../package.json").devDependencies["uglify-js"]
	try {
		delete require.cache[require.resolve("uglify-js/package.json")]
		if (require("uglify-js/package.json").version !== expectVersion) {
			throw Error("Wrong uglify-js version")
		}
		var res = require("uglify-js").minify(str, {
			warnings: true,
			compress: {
				// evaluate will drop `ie678 = !+"\v1"` as side-effect-free code
				evaluate: false,
				properties: false
			},
			output: {
				semicolons: false,
				keep_quoted_props: true
			}
		})
		if (res.warnings) opts.warnings.push.apply(opts.warnings, res.warnings)
		if (res.error) throw res.error
		next(null, res.code)
	} catch(e) {
		if (!afterInstall && (
			e.message == "Cannot find module 'uglify-js/package.json'" ||
			e.message == "Wrong uglify-js version"
			)) {
			if (!npmChild) {
				console.error(e.message, "Trying to Install .. " + expectVersion)
				npmChild = spawn("npm", [ "install", "--no-save", "uglify-js@" + expectVersion ])
				npmChild.stdout.pipe(process.stdout)
				npmChild.stderr.pipe(process.stderr)
				npmChild.stdin.end()
			}
			npmChild.on("close", function() {
				npmChild = null
				jsMin(str, opts, next, true)
			})
		} else {
			var line = e.line || e.lineNumber
			, source = str[e.filename] || str
			if (line > -1) {
				console.error("Line: " + line + "\n---\n" + source.split("\n").slice(line - 2, line + 3).join("\n"))
			}
			throw e
		}
	}
}

function readFileHashes(opts, next) {
	if (fileHashes) return next()
	fileHashes = {}
	// $ git ls-tree -r --abbrev=1 HEAD
	// 100644 blob 1f537	public/robots.txt
	// 100644 blob 0230	public/templates/devices.haml
	// $ git cat-file -p 1f537
	var data = ""
	, git = spawn("git", ["ls-files", "-sz", "--abbrev=1"])
	, cwd = process.cwd() + "/"

	git.stdout.on("data", function (_data) {
		data += _data
	})
	git.stderr.pipe(process.stderr)

	git.on("close", function (code) {
		data.split("\0").reduceRight(function(map, line, index) {
			if (line) {
				index = line.indexOf("\t")
				map[cwd + line.slice(1 + index)] = line.split(" ")[1]
			}
			return map
		}, fileHashes)
		next()
	})
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
		case "-r":
		case "--readme":
			updateReadme(args[i++])
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
	exports.execute = execute
} else {
	// executed as standalone
	execute(process.argv, 2)
	if (conf.readmeFilename) {
		updateReadme(conf.readmeFilename)
	}
	if (conf.buildman) {
		Object.keys(conf.buildman).forEach(function(key) {
			var opts = conf.buildman[key]
			opts.min = 1
			File(key, opts)
		})
	}
}

function normalizePath(p, opts) {
	for (; p != (p = p.replace(/[^/]*[^.]\/\.\.\/|(^|[^.])\.\/|(.)\/(?=\/)/, "$1$2")); );
	if (p.indexOf("{hash}")) {
		var full = path.resolve(opts.root, p.split("?")[0])
		if (fileHashes[full]) {
			p = p.replace(/{hash}/g, fileHashes[full] || "")
		} else {
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
		console.log("# Update readme: " + file)
		cli.writeFile(file, updated)
	}
}

function updateManifest(file, opts, hashes) {
	var root = file.replace(/[^\/]+$/, "")
	, current = cli.readFile(file)
	, updated = current
	.replace(/^(?![#*]|CACHE MANIFEST|\w+:)[^\n\r]+/gm, function(line) {
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

	if (current != updated) {
		console.log("# Update manifest: " + file)
		cli.writeFile(file, updated.replace(/#.+$/m, "# " + new Date().toISOString()))
	}
}


