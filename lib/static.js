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
, dom = require("@litejs/dom")
, parser = new dom.DOMParser()

module.exports = function(opts) {

	cli.rmrf(opts.out)

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

	start(opts)
}

function start(opts) {
	var fileName = opts._[0] || "index.html"
	, doc = parser.parseFromString(cli.readFile(fileName))
	, ui = UI.LiteJS({
		root: doc.body,
	})

	cli.rmrf(opts.out)

	if (opts.base) {
		//doc.querySelector("base").href = opts.base
		//rewrite links?
	}
	doc.querySelectorAll("script[type=ui]").forEach(parseEl)

	// LiteJS router not started, try to find script with content
	if (!UI.onhashchange) {
		var el = doc.querySelector("script[src][cat],script[src][min]")
		if (el.innerHTML.trim()) parseEl(el)
	}
	if (!opts.script) {
		doc.querySelectorAll("script,noscript").forEach(UI.El.kill)
	}

	ui.show("")
	createFile("index.html")

	Object.keys(ui.views).forEach(function(view) {
		if (view.charAt(0) === "#" || view.indexOf("{") > -1 || view === ui.home) return
		ui.show(view)
		var outName = view + "/index.html"
		createFile(outName)
	})

	cli.ls("site/**.md").forEach(function(file) {
		var slug = "blog/" + file.slice(5, -3)
		var outName = slug + "/index.html"

		ui.$d.content = cli.readFile(file)
		ui.show(slug)
		createFile(outName)
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



