
describe("Clean", () => {
	let clean = require("../lib/build.js").clean

	test("-> {0}", [
		[ "@click 'save'", "@click'save'" ],
		[ ";if !user in pub && 'key' in user || $ in $$", ";if !user in pub&&'key'in user||$ in $$" ],
		[ ";t u + q && [ 'a', 1 ] || !x", ";t u+q&&['a',1]||!x" ],
		[ ";t:u + q && [ 'a', 1 ] || !x", ";t:u+q&&['a',1]||!x" ],
		[ ";t 1 - u", ";t 1-u" ],
		[ ";if item.area && !item.end && !item.recovered && model.acl('write', 'status')", ";if item.area&&!item.end&&!item.recovered&&model.acl('write','status')" ],

	], (src, min, assert) => {
		assert.equal(clean(src), min).end()
	})
})


