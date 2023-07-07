

exports.opts = opts

function opts(defaults, argv) {
	var UNDEF, key, val, expect
	, i = 0
	, commands = {}
	, out = {_: [], _unknown: []}
	, hasOwn = out.hasOwnProperty
	, isElectronBinary = process.versions.electron && !process.defaultApp

	if (!argv) argv = process.argv.slice(isElectronBinary ? 1 : 2)

	for (key in defaults) if (isObj(defaults[key])) {
		commands[key.replace("_", "")] = commands[key.replace(/_.+/, "")] = Object.assign({_cmd: key.replace("_", "")}, defaults[key])
	} else {
		out[key] = defaults[key]
	}

	for (; i < argv.length; i++) {
		val = argv[i]
		if (val.charAt(0) !== "-") {
			if (isObj(commands[val])) {
				argv.splice(i, 1)
				Object.assign(out, commands[val])
				defaults = Object.assign({}, out)
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
			} else if (hasOwn.call(defaults, key)) {
				expect = Array.isArray(defaults[key]) ? "array" : typeof defaults[key]
				val = val[1] ? 0 : val[4]
				out[key] = (
					expect === "boolean" ? val !== 0 && (val === UNDEF || val === "true" || val !== "false" && castError()) :
					expect === "array" ? (out[key] === defaults[key] ? [] : out[key]).concat(val ? val.split(",") : []) :
					expect === "string" ? val || "" :
					val === 0 ? castError() :
					expect === "number" ? +val :
					castError()
				)
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
		return !!obj && obj.constructor === Object
	}
}

