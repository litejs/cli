
/* litejs.com/MIT-LICENSE.txt */

exports.opts = function opts(defaults, files, argv) {
	var expect, i, key, val
	, path = require("path")
	, camelRe = /\-([a-z])/g
	, short = {}
	, hasOwn = short.hasOwnProperty
	, defs = {}
	, out = {_: [], _valid: [], _unknown: []}
	, isElectronBinary = process.versions.electron && !process.defaultApp

	if (!argv) argv = process.argv.slice(isElectronBinary ? 1 : 2)

	// Override defaults from file
	if (files) for (files = ("" + files).split(","), i = 0; (key = files[i++]); ) try {
		key = key.split("#")
		val = require(path.resolve(key[0]))
		if (key[1]) val = val[key[1]]
		if (val) {
			assignOpts(defaults, val)
			break
		}
	} catch(e) {}

	// Find command
	for (i = -1; (val = argv[++i]); ) if (val[0] !== "-") {
		for (key in defaults) if (isObj(defaults[key])) {
			expect = key.split("_")
			if (expect[0] === val || expect[1] === val) {
				out._cmd = expect[0]
				argv.splice(i, 1)
				defaults = Object.assign({}, defaults, defaults[key])
				break
			}
		}
		break
	}

	for (key in defaults) if (!isObj(defaults[key])) {
		val = key.split("_")
		if (val[0]) defs[val[0]] = out[val[0]] = defaults[key]
		if (val[1]) short[val[1]] = val[0]
		if (val[2]) short[val[2]] = "no-" + val[0]
	}

	for (i = 0; i < argv.length; i++) {
		val = argv[i].split(/=|--(no-)?|(^-)/)
		if (val[0] === "" && argv[i][0] !== "=") {

			// Expand short options
			if ((key = val[2] && short[val[3][0]])) {
				expect = "boolean" === typeof out[key.replace(/^no\-/, "").replace(camelRe, camelFn)]
				val = val[3].slice(1)

				// Extract first boolean from combined options: -abc -> --aa -bc
				if (expect && val) {
					argv.splice(i--, 1, "--" + key, "-" + val)
				} else {
					argv.splice(i--, 1, "--" + (expect ? key : key + "=" + (val || argv.splice(i + 2, 1))))
				}
				continue
			}

			key = val[3].replace(camelRe, camelFn)
			if (key === "") {
				argv.push.apply(out._, argv.slice(i + 1))
				break
			}
			if (hasOwn.call(out, key)) {
				expect = Array.isArray(out[key]) ? "array" : typeof out[key]
				val = val[1] ? 0 : val[6] != null && argv[i].slice(val[3].length + 3)
				out[key] = (
					expect === "boolean" ? val !== 0 && (val === false || val === "true" || val !== "false" && castError()) :
					expect === "array" ? (out[key] === defs[key] ? [] : out[key]).concat(val ? val.split(",") : []) :
					expect === "string" ? val || "" :
					expect === "number" && val !== false && val !== "" && isFinite(val -= 0) ? val :
					castError()
				)
				out._valid.push(argv[i])
			} else {
				out._unknown.push(argv[i])
			}
		} else {
			out._.push(argv[i])
		}
	}
	if (defaults._ && !out._[0]) out._ = defaults._.slice(0)
	return out

	function camelFn(_, chr) {
		return chr.toUpperCase()
	}
	function castError() {
		throw "Invalid value for option '" + key + "' - expected " + expect
	}
	function isObj(obj) {
		return obj && obj.constructor === Object
	}
	function assignOpts(to, from) {
		var key, val, tmp
		for (key in to) if (hasOwn.call(to, key)) {
			tmp = key.split("_")
			val = hasOwn.call(from, tmp[0]) ? from[tmp[0]] : null
			if (val !== null) to[key] = isObj(val) ? assignOpts(to[key], val) : isObj(to[key]) ? to[key] : val
		}
		if (from._) to._ = from._
		return to
	}
}
