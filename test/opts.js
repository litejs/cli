
describe("opts", function() {
	var opts = require("../opts.js").opts

	it("should parse options: {0}", [
		[
			["--b1", "--no-b2", "--b3=true", "--b4=false", "r"],
			{ b1: false, b2: false, b3: false, b4: false },
			{ b1: true,  b2: false, b3: true, b4: false, _valid: ["--b1", "--no-b2", "--b3=true", "--b4=false"], _unknown: [], _: ["r"] }
		],
		[
			["--b5", "--no-b6", "--b7=true", "r", "--b8=false"],
			{ b5: true, b6: true,  b7: true, b8: true },
			{ b5: true, b6: false, b7: true, b8: false, _valid: ["--b5", "--no-b6", "--b7=true", "--b8=false"], _unknown: [], _: ["r"] }
		],
		[
			["r", "--no-a1", "--a2=", "--a3=foo,bar", "R"],
			{ a1: [ 1 ], a2: [ 2 ], a3: [ 3 ] },
			{ a1: [], a2: [], a3: ["foo", "bar"], _valid: ["--no-a1", "--a2=", "--a3=foo,bar"], _unknown: [], _: ["r", "R"] }
		],
		[
			["--ab=foo", "--ab=bar,qux", "=2"],
			{ ab: [ 1 ] },
			{ ab: [ "foo", "bar", "qux" ], _valid: ["--ab=foo", "--ab=bar,qux"], _unknown: [], _: ["=2"] }
		],
		[
			["--n1=12", "--n2=0", "--no-n3"],
			{ n1: 0, n2: 1, n3: 2 },
			{ n1: 12, n2: 0, n3: 0, _valid: ["--n1=12", "--n2=0", "--no-n3"], _unknown: [], _: [] }
		],
		[
			["--s1=", "--s2=1", "--s3=a", "--no-s4"],
			{s1:"a",s2:"",s3:"1",s4:"2"},
			{s1:"",s2:"1",s3:"a",s4:"", _valid: ["--s1=", "--s2=1", "--s3=a", "--no-s4"],_unknown:[],_:[]}
		],
		[
			["--s1=--a", "--s2=1--", "--s3=a--b"],
			{s1:"",s2:"",s3:""},
			{s1:"--a",s2:"1--",s3:"a--b", _valid: ["--s1=--a", "--s2=1--", "--s3=a--b"],_unknown:[],_:[]}
		],
		[
			["--s1=a b", "--http-port=81"],
			{s1:"", httpPort_h: 80}, {s1:"a b", httpPort: 81, _valid: ["--s1=a b", "--http-port=81"], _unknown:[],_:[]}
		],
		[
			["-abcd","-e", "f", "-g"],
			{a_a:false, b_b:false, c_c:"",e_e:"",g_g:"h"}, {a:true, b:true, c:"d", e:"f",g:"", _valid: ["--a", "--b","--c=d", "--e=f","--g="], _unknown:[],_:[]}
		],
		[ [], {print:false, to:"a", x:true}, {print:false, to:"a", x:true, _valid: [], _unknown:[],_:[]} ]
	], function(argv, defaults, expected, assert) {
		var result = opts(defaults, null, argv)
		assert
		.equal(result, expected)
		.end()
	})

	it("should collect unknown options: {0}", [
		[
			["--b1"],
			{ b2: false },
			{ b2: false, _valid: [],  _unknown: [ "--b1" ], _: [] }
		],
		[ ["--invalid", "--no-opt"], {}, {_valid: [], _unknown:["--invalid", "--no-opt"],_:[]} ],
	], function(argv, defaults, expected, assert) {
		var result = opts(defaults, null, argv)
		assert
		.equal(result, expected)
		.end()
	})

	it("should separate options with `--` {0}", [
		[
			["--", "--bee", "a"],
			{ a: false },
			{ a: false, _valid: [],  _unknown: [], _: ["--bee", "a"] }
		],
		[
			["--a", "--"],
			{ a: false },
			{ a: true, _valid: ["--a"],  _unknown: [], _: [] }
		],
		[
			["--a", "--", "--no-a"],
			{ a: false },
			{ a: true, _valid: ["--a"],  _unknown: [], _: ["--no-a"] }
		],
	], function(argv, defaults, expected, assert) {
		var result = opts(defaults, null, argv)
		assert
		.equal(result, expected)
		.end()
	})

	it("should collect files: {0}", [
		[
			["--b1", "a.txt", "b.txt"],
			{ b1: false },
			{ b1: true, _valid: ["--b1"],  _unknown: [], _: [ "a.txt", "b.txt" ] }
		],
		[
			["a.txt", "--b1", "b.txt"],
			{ b1: false },
			{ b1: true, _valid: ["--b1"],  _unknown: [], _: [ "a.txt", "b.txt" ] }
		],
	], function(argv, defaults, expected, assert) {
		var result = opts(defaults, null, argv)
		assert
		.equal(result, expected)
		.end()
	})

	it("should read defaults from file: {i}", [
		[
			[],
			{ build: true },
			"invalid.json,package.json#litejs,.github/litejs.json",
			{ build: false, _valid: [],  _unknown: [], _: [] }
		],
		[
			[],
			{ lj: "" },
			"package.json#bin,.github/litejs.json",
			{ lj: "./cli.js", _valid: [],  _unknown: [], _: [] }
		],
		[
			["--lj=foo"],
			{ lj: "" },
			"package.json#bin,.github/litejs.json",
			{ lj: "foo", _valid: ["--lj=foo"],  _unknown: [], _: [] }
		],
		[
			["b.txt"],
			{ lint_l: { jshint: "" }, color: true },
			"package.json#litejs,.github/litejs.json",
			{ color: true, _valid: [],  _unknown: [], _: ["b.txt"] }
		],
		[
			["lint"],
			{ lint_l: { jshint: "" }, color: true },
			"package.json#litejs,.github/litejs.json",
			{ color: true, jshint: ".github/jshint.json", _valid: [],  _unknown: [], _cmd: "lint", _: ["*.json",".github/*.json", "*.js", "lib/*.js"] }
		],
		[
			["lint", "--no-jshint"],
			{ lint: { jshint: "" }, color: true },
			[ "package.json#litejs", ".github/litejs.json" ],
			{ color: true, jshint: "", _valid: ["--no-jshint"],  _unknown: [], _cmd: "lint", _: ["*.json",".github/*.json", "*.js", "lib/*.js"] }
		],
		[
			[ "build" ],
			{ build: { run: true }, color: true },
			".github/litejs.json",
			{ color: true, build: false, _valid: [],  _unknown: [], _: [ "build" ] }
		],
	], function(argv, defaults, files, expected, assert) {
		var result = opts(defaults, files, argv)
		assert
		.equal(result, expected)
		.end()
	})

	it("should handle commands: {0}", [
		[
			["--no-a", "comm", "--b", "--c"],
			{ comm: { a: true }, other: { c: 1 }, b: false },
			{ a: false, b: true, _: [], _cmd: "comm", _valid: ["--no-a", "--b"],  _unknown: ["--c"] }
		],
		[
			["--no-a", "--b", "--c"],
			{ comm: { a: true }, other: { c: 1 }, b: false },
			{ b: true, _: [], _valid: ["--b"], _unknown: ["--no-a", "--c"] }
		],
		[
			["comm", "--comm", "--other"],
			{ comm: { comm: false, other: false }, other: { c: 1 }, b: false },
			{ b: false, comm: true, other: true, _: [], _cmd: "comm", _valid: ["--comm", "--other"],  _unknown: [] }
		],
		[
			["b", "--build"],
			{ build_b: { build: false }, bench: {} },
			{ build: true, _: [], _cmd: "build", _valid: ["--build"],  _unknown: [] }
		],
	], function(argv, defaults, expected, assert) {
		var result = opts(defaults, null, argv)
		assert
		.equal(result, expected)
		.end()
	})

	it("should work with Electron", function(assert, mock) {
		mock.swap(process, "argv", ["node", "--a", "--b"])
		mock.swap(process, "defaultApp", true)
		mock.swap(process.versions, "electron", "1")
		assert.equal(opts({a: false, b: false}), {_:[],_valid:["--b"],_unknown:[],a:false,b:true}).end()
	})

	it("should work with ElectronBinary", function(assert, mock) {
		mock.swap(process, "argv", ["node", "--a", "--b"])
		mock.swap(process, "defaultApp", false)
		mock.swap(process.versions, "electron", "1")
		assert.equal(opts({a: false, b: false}), {_:[],_valid:["--a","--b"],_unknown:[],a:true,b:true}).end()
	})

	it("should throw on invalid options: {0}", [
		[ ["--bool1=foo"], { bool1: true } ],
		[ ["--bool2="], { bool2: true } ],
		[ ["--num1"], { num1: 0 } ],
		[ ["--nan"], { nan: null } ],
	], function(argv, defaults, assert) {
		assert
		.throws(function() {
			opts(defaults, null, argv)
		})
		.end()
	})
})

