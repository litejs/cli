//-
//-  Usage
//-    lj static [input file]
//-
//-  Examples
//-    lj static --out=_site index.html
//-


var UI
, cli = require("..")
, path = require("path")
, build = require("./build.js")
, dom = require("@litejs/dom")
, parser = new dom.DOMParser()

module.exports = function(opts) {
	global.document = dom.document
	global.history = global.location = global.localStorage = global.navigator = { href: "" }

	try {
		var loc = path.resolve("node_modules/@litejs/ui")
		global.xhr = require(loc + "/load.js").xhr
		UI = require(loc)
	} catch(e) {
		console.error("@litejs/ui not found")
		throw e
	}

	cli.rmrf(opts.out)
	build({ _: [ opts._[0] || "index.html" ], out: opts.out + "/.tmp.html" })
	var fileName = opts.out + "/.tmp.html"
	, doc = parser.parseFromString(cli.readFile(fileName))
	, ui = UI.LiteJS({
		root: doc.body,
	})
	cli.rmrf(fileName)

	ui.prototype.scan = function(glob, name) {
		var view = this
		view.data = cli.ls(glob).map(function(file) {
			var post = parseFrontmatter(cli.readFile(file))
			post.file = file
			post.slug = view.r.replace(/\{[^}]+\}/, post.slug || file.replace(/^.*\/|\.[^.]+$/g, ""))
			return post
		})
		if (name) ui.$d[name] = view.data
	}

	doc.querySelectorAll("script[type=ui]").forEach(parseEl)

	// LiteJS router not started, try to find a script with content
	if (!UI.onpopstate) {
		var el = doc.querySelector("script[src]:not(:empty)")
		if (!el) return console.error("Router not started")
		if (el.innerHTML.trim()) parseEl(el)
	}
	if (!opts.script) {
		doc.querySelectorAll("script,noscript").forEach(UI.El.kill)
	}

	ui.show("")
	createFile("index.html")

	Object.keys(ui.views).forEach(function(route) {
		var view = ui.views[route]
		if (view.data) {
			view.data.forEach(function(post) {
				Object.assign(ui.$d, post)
				ui.show(post.slug)
				createFile(post.slug + "/index.html")
			})
		} else if (route[0] !== "#" && route.indexOf("{") < 0 && route !== ui.home) {
			ui.show(route)
			createFile(route + "/index.html")
		}
	})

	function createFile(outName) {
		var content = doc.toString(opts.min)
		cli.writeFile(opts.out + "/" + outName, content)
		console.log("Write", outName, content.length)
	}

	function parseEl(el) {
		ui.parse(el.parentNode.removeChild(el).innerHTML.trim() || el.src && cli.readFile(el.src))
	}
}

function parseFrontmatter(raw) {
	var post = { body: raw }
	, m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw)
	if (!m) return post
	post.body = raw.slice(m[0].length)
	m[1].split(/\r?\n/).forEach(function(line) {
		var pos = line.indexOf(":")
		if (pos < 1) return
		var key = line.slice(0, pos).trim()
		, val = line.slice(pos + 1).trim()
		try {
			post[key] = JSON.parse(val)
		} catch(e) {
			post[key] = val
		}
	})
	return post
}


