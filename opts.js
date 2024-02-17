

exports.opts = opts

function opts(defaults, argv) {
	var UNDEF, key, val, expect
	, i = 0
	, commands = {}
	, out = {_: [], _used: [], _unknown: []}
	, hasOwn = out.hasOwnProperty
	, isElectronBinary = process.versions.electron && !process.defaultApp

	if (!argv) argv = process.argv.slice(isElectronBinary ? 1 : 2)

	for (key in defaults) if (isObj(defaults[key])) {
		val = key.split(/[,_]/)
		commands[val[0]] = Object.assign({_cmd: val[0]}, defaults[key])
		for (i = val.length; --i; ) commands[val[i]] = commands[val[0]]
	} else {
		out[key] = defaults[key]
	}

	for (i = 0; i < argv.length; i++) {
		val = argv[i]
		if (val.charAt(0) !== "-") {
			if (isObj(commands[val])) {
				argv.splice(i, 1)
				defaults = Object.assign({}, Object.assign(out, commands[val]))
			}
			break
		}
	}

	for (i = 0; i < argv.length; i++) {
		val = argv[i].split(/=|--(no-)?/)
		if (val[0] === "") {
			key = val[2].replace(/\-([a-z])/g, camelFn)
			if (key === "") {
				argv.push.apply(out._, argv.splice(i).slice(1))
				break
			}
			if (hasOwn.call(out, key)) {
				expect = Array.isArray(out[key]) ? "array" : typeof out[key]
				val = val[1] ? 0 : val[4]
				out[key] = (
					expect === "boolean" ? val !== 0 && (val === UNDEF || val === "true" || val !== "false" && castError()) :
					expect === "array" ? (out[key] === defaults[key] ? [] : out[key]).concat(val ? val.split(",") : []) :
					expect === "string" ? val || "" :
					expect === "number" && val !== UNDEF ? +val :
					castError()
				)
				out._used.push(argv[i])
				argv.splice(i--, 1)
			} else {
				out._unknown.push(key)
			}
		} else {
			out._.push(argv[i])
			argv.splice(i--, 1)
		}
	}
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
}

