
describe("opts", function() {
	var opts = require("../opts.js").opts

	it("should parse options: {0}", [
		[
			["--b1", "--no-b2", "--b3=true", "--b4=false"],
			{ b1: false, b2: false, b3: false, b4: false },
			{ b1: true,  b2: false, b3: true, b4: false, _used: ["--b1", "--no-b2", "--b3=true", "--b4=false"], _unknown: [], _: [] }, []
		],
		[
			["--b5", "--no-b6", "--b7=true", "--b8=false"],
			{ b5: true, b6: true,  b7: true, b8: true },
			{ b5: true, b6: false, b7: true, b8: false, _used: ["--b5", "--no-b6", "--b7=true", "--b8=false"], _unknown: [], _: [] }, []
		],
		[
			["--no-a1", "--a2=", "--a3=foo,bar" ],
			{ a1: [ 1 ], a2: [ 2 ], a3: [ 3 ] },
			{ a1: [], a2: [], a3: ["foo", "bar"], _used: ["--no-a1", "--a2=", "--a3=foo,bar"], _unknown: [], _: [] }, []
		],
		[
			["--ab=foo", "--ab=bar,qux" ],
			{ ab: [ 1 ] },
			{ ab: [ "foo", "bar", "qux" ], _used: ["--ab=foo", "--ab=bar,qux"], _unknown: [], _: [] }, []
		],
		[
			["--n1=12", "--n2=0", "--no-n3"],
			{ n1: 0, n2: 1, n3: 2 },
			{ n1: 12, n2: 0, n3: 0, _used: ["--n1=12", "--n2=0", "--no-n3"], _unknown: [], _: [] }, []
		],
		[
			["--s1=", "--s2=1", "--s3=a", "--no-s4"],
			{s1:"a",s2:"",s3:"1",s4:"2"},
			{s1:"",s2:"1",s3:"a",s4:"", _used: ["--s1=", "--s2=1", "--s3=a", "--no-s4"],_unknown:[],_:[]}, []
		],
		[
			["--s1=a b", "--http-port=81"],
			{s1:"", httpPort: 80}, {s1:"a b", httpPort: 81, _used: ["--s1=a b", "--http-port=81"], _unknown:[],_:[]}, []
		],
		[ [], {print:false, to:"a", x:true}, {print:false, to:"a", x:true, _used: [], _unknown:[],_:[]}, [] ]
	], function(argv, defaults, expected, remain, assert) {
		var result = opts(defaults, argv)
		assert
		.equal(result, expected)
		.equal(argv, remain)
		.end()
	})

	it("should collect unknown options: {0}", [
		[
			["--b1"],
			{ b2: false },
			{ b2: false, _used: [],  _unknown: [ "b1" ], _: [] }, ["--b1"]
		],
		[ ["--invalid", "--no-opt"], {}, {_used: [], _unknown:["invalid", "opt"],_:[]}, ["--invalid", "--no-opt"] ],
	], function(argv, defaults, expected, remain, assert) {
		var result = opts(defaults, argv)
		assert
		.equal(result, expected)
		.equal(argv, remain)
		.end()
	})

	it("should separate options with `--` {0}", [
		[
			["--", "--bee", "a"],
			{ a: false },
			{ a: false, _used: [],  _unknown: [], _: ["--bee", "a"] }, []
		],
		[
			["--a", "--"],
			{ a: false },
			{ a: true, _used: ["--a"],  _unknown: [], _: [] }, []
		],
		[
			["--a", "--", "--no-a"],
			{ a: false },
			{ a: true, _used: ["--a"],  _unknown: [], _: ["--no-a"] }, []
		],
	], function(argv, defaults, expected, remain, assert) {
		var result = opts(defaults, argv)
		assert
		.equal(result, expected)
		.equal(argv, remain)
		.end()
	})

	it("should collect files: {0}", [
		[
			["--b1", "a.txt", "b.txt"],
			{ b1: false },
			{ b1: true, _used: ["--b1"],  _unknown: [], _: [ "a.txt", "b.txt" ] }, []
		],
		[
			["a.txt", "--b1", "b.txt"],
			{ b1: false },
			{ b1: true, _used: ["--b1"],  _unknown: [], _: [ "a.txt", "b.txt" ] }, []
		],
	], function(argv, defaults, expected, remain, assert) {
		var result = opts(defaults, argv)
		assert
		.equal(result, expected)
		.equal(argv, remain)
		.end()
	})

	it("should handle commands: {0}", [
		[
			["--no-a", "comm", "--b", "--c"],
			{ comm: { a: true }, other: { c: 1 }, b: false },
			{ a: false, b: true, _: [], _cmd: "comm", _used: ["--no-a", "--b"],  _unknown: ["c"] }, ["--c"]
		],
		[
			["--no-a", "--b", "--c"],
			{ comm: { a: true }, other: { c: 1 }, b: false },
			{ b: true, _: [], _used: ["--b"], _unknown: ["a", "c"] }, ["--no-a", "--c"]
		],
		[
			["comm", "--comm", "--other"],
			{ comm: { comm: false, other: false }, other: { c: 1 }, b: false },
			{ b: false, comm: true, other: true, _: [], _cmd: "comm", _used: ["--comm", "--other"],  _unknown: [] }, []
		],
		[
			["b", "--build"],
			{ build_b: { build: false }, bench: {} },
			{ build: true, _: [], _cmd: "build", _used: ["--build"],  _unknown: [] }, []
		],
	], function(argv, defaults, expected, remain, assert) {
		var result = opts(defaults, argv)
		assert
		.equal(result, expected)
		.equal(argv, remain)
		.end()
	})
	it("should throw on invalid options: {0}", [
		[ ["--bool1=foo"], { bool1: true } ],
		[ ["--bool2="], { bool2: true } ],
		[ ["--num1"], { num1: 0 } ],
		[ ["--nan"], { nan: null } ],
	], function(argv, defaults, assert) {
		assert
		.throws(function() {
			opts(defaults, argv)
		})
		.end()
	})
})

