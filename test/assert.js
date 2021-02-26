

describe.it("should test types", function(assert) {
	var undef, tmp, len, i, j
	, count = 0
	, args = (function(){return arguments})(1, "2")
	, date = new Date()
	, date0 = new Date(0)
	, re = /re/
	, obj1 = {a:"A"}
	, obj2 = {a:"B"}
	, obj3 = {b:"A"}
	, circ1 = {a:"D"}
	, circ2 = {a:"D", circ: obj1}
	, types = [
		"string",    '"0"',                             "0",
		"string",    '"null"',                          "null",
		"string",    '"undefined"',                     String("undefined"),
		"string",    '"1"',                             String(1),
		"number",    '0',                               0,
		"number",    '1',                               1,
		"number",    '-1',                              -1,
		"number",    '3',                               Number(3),
		"number",    '4',                               Number("4"),
		"number",    'Infinity',                        Infinity,
		"number",    '-Infinity',                       -Infinity,
		"boolean",   'true',                            true,
		"boolean",   'false',                           false,
		"date",      '1970-01-01T00:00:00.000Z',        date0,
		"regexp",    '/re/',                            re,
		"null",      'null',                            null,
		"nan",       'NaN',                             +"a",
		"object",    '{}',                              {},
		"object",    '{a:1}',                           {a:1},
		"object",    'User{name:"test1"}',              new User("test1"),
		"object",    'Item{id:1}',                      new Item(1),
		"object",    'Model{id:2}',                     new Model(2),
		"array",     '[]',                              [],
		"array",     '[1]',                             [1],
		"array",     '[1,"2"]',                         [1,"2"],
		"array",     '[1970-01-01T00:00:00.000Z,/re/]', [date0, re],
		"undefined", 'undefined',                       undef,
		"undefined", 'undefined',                       undefined,
		"arguments", 'arguments[1,"2"]',                args,
		"object",    '{a:"D",circ:[Circular]}',         circ1,
		//"function",  'stringify(item, maxLen)',         assert,
		"function",  '()',                              function(){},
		"function",  '()',                              function  ()  {  },
		"function",  'kala()',                          function kala ()  {  },
		"string",    '""',                              ""
	]
	, equals = [
		"a", "a",
		0, 0,
		1, 1,
		null, null,
		NaN, NaN,
		undefined, undefined,
		[], [],
		[1, circ1], [1, circ1],
		{}, {},
		{a:1}, {a:1},
		date0, new Date(0),
		"", ""
	]
	, testSet = [
		0,
		"",
		"0",
		-1,
		1,
		false,
		true,
		null,
		undefined,
		{},
		{a:1},
		[],
		[1],
		date,
		date0,
		re,
		obj1,
		obj2,
		obj3,
		circ1,
		circ2
	]
	, notEquals = [
		0,         testSet.slice(1),
		"",        testSet.slice(2),
		"0",       testSet.slice(3),
		-1,        testSet.slice(4),
		1,         testSet.slice(5),
		false,     testSet.slice(6),
		true,      testSet.slice(7),
		null,      testSet.slice(9), // null == undefined
		undefined, testSet.slice(9),
		{},        testSet.slice(10),
		{a:1},     testSet.slice(11),
		[],        testSet.slice(12),
		[1],       testSet.slice(13),
		date,      testSet.slice(14),
		date0,     testSet.slice(15),
		re,        testSet.slice(16),
		obj1,      testSet.slice(17),
		obj2,      testSet.slice(18),
		obj3,      testSet.slice(19),
		circ1,     testSet.slice(20),
		circ2,     testSet.slice(21),
		"a", "b"
	]

	circ1.circ = circ1

	function User(name) {
		this.name = name
	}

	function Item(id) {
		this.data = {id: id}
	}

	Item.prototype.toJSON = function() {
		return this.data
	}

	function Model(id) {
		this.id = id
	}

	Model.prototype.toString = function() {
		return "Model<" + this.id + ">"
	}

	for (len = types.length, i = 0; i < len; i+=3) {
		assert.type(types[i+2], types[i], "Type test #" + (i/3))
		//equal(typeof describe.stringify(types[i+2]), "string", "Stringify type #" + (i/3))
		//equal(describe.stringify(types[i+2]), types[i+1], "Stringify test #" + (i/3))
	}

	//equal(describe.stringify([date0], 10), "[1970-0..]")

	for (len = equals.length, i = 0; i < len; i+=2) {
		assert.equal(equals[i+1], equals[i], "equals test #" + (i>>1))
	}

	for (len = notEquals.length, i = 0; i < len; i+=2) {
		tmp = notEquals[i + 1]
		for (j = tmp.length; j--;) {
			assert.notEqual(tmp[j], notEquals[i])
		}
	}

	obj1 = {a:1,b:2,c:{d:3,e:4}}
	tmp = JSON.stringify(obj1)

	assert.own(obj1, {a:1})
	assert.own(obj1, {c:{e:4}})
	assert.notOwn(obj1, obj1)
	assert.notOwn(obj1, {a:2})
	assert.notOwn(obj1, {c:1})
	assert.equal(JSON.stringify(obj1), tmp, "Does not mutate obj")

	assert.end()
})

