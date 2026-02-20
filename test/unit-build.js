
describe("build unit", function() {
	var build = require("../lib/build.js")

	describe("clean", function() {
		test("removes whitespace", function(assert) {
			assert.equal(build.clean("a + b"), "a+b")
			assert.equal(build.clean("a  b"), "ab")
			assert.end()
		})
		test("preserves strings", function(assert) {
			assert.equal(build.clean('"a b"'), '"a b"')
			assert.equal(build.clean("'a b'"), "'a b'")
			assert.end()
		})
		test("preserves operator spacing", function(assert) {
			assert.equal(build.clean("a !b"), "a !b")
			assert.end()
		})
	})

	describe("drop", function() {
		var mockEl = function(flags, attr) {
			return {
				getAttribute: function(name) {
					return name === (attr || "drop") ? flags : null
				}
			}
		}

		test("returns content unchanged without flags", function(assert) {
			assert.equal(build.drop(null, "hello"), "hello")
			assert.equal(build.drop({}, "hello"), "hello")
			assert.end()
		})

		test("flips toggleable comment", function(assert) {
			var el = mockEl("ie8")
			, input = "/*** ie8 ***/\nfunction a(){}\n/*/\nfunction a(){}\n/**/"
			, expected = "/*** ie8 ***\nfunction a(){}\n/*/\nfunction a(){}\n/**/"
			assert.equal(build.drop(el, input), expected)
			assert.end()
		})

		test("flips multiple flags", function(assert) {
			var el = mockEl("ie8 demo")
			, input = "/*** ie8 ***/\ncode1\n/**/\n/*** demo ***/\ncode2\n/**/"
			, expected = "/*** ie8 ***\ncode1\n/**/\n/*** demo ***\ncode2\n/**/"
			assert.equal(build.drop(el, input), expected)
			assert.end()
		})

		test("uses custom attr name", function(assert) {
			var el = mockEl("ie8", "cat-drop")
			assert.equal(build.drop(el, "/*** ie8 ***/\ncode\n/**/"), "/*** ie8 ***/\ncode\n/**/")
			assert.equal(build.drop(el, "/*** ie8 ***/\ncode\n/**/", "cat-drop"), "/*** ie8 ***\ncode\n/**/")
			assert.end()
		})

		test("does not flip when attr does not match", function(assert) {
			var el = mockEl("ie8")
			, input = "/*** demo ***/\ncode\n/**/"
			assert.equal(build.drop(el, input), input)
			assert.end()
		})
	})

	describe("defMap", function() {
		test("returns string as-is for plain paths", function(assert) {
			assert.equal(build.defMap("foo/bar.js"), "foo/bar.js")
			assert.end()
		})

		test("+ appends to last string", function(assert) {
			build.defMap("foo/bar.js")
			assert.equal(build.defMap("+.min.js"), "foo/bar.js.min.js")
			assert.end()
		})

		test("% replaces from last occurrence of char", function(assert) {
			build.defMap("foo/bar.js")
			assert.equal(build.defMap("%.css"), "foo/bar.css")
			assert.end()
		})
	})

	describe("parseView urlFn", function() {
		function testUrlFn(u) {
			return "out/" + u
		}
		var noMinEl = {}

		test("rewrites [src=file.png]", function(assert) {
			var result = build.parseView("img[src=icon.png]", "ui", noMinEl, testUrlFn)
			assert.ok(result.indexOf("[src=out/icon.png]") > -1)
			assert.end()
		})

		test("preserves fragment [src=icons.svg#star]", function(assert) {
			var result = build.parseView("use[src=icons.svg#star]", "ui", noMinEl, testUrlFn)
			assert.ok(result.indexOf("[src=out/icons.svg#star]") > -1)
			assert.end()
		})

		test("does not touch [href]", function(assert) {
			var result = build.parseView("a[href=style.css]", "ui", noMinEl, testUrlFn)
			assert.ok(result.indexOf("[href=style.css]") > -1)
			result = build.parseView("a[href=#info]", "ui", noMinEl, testUrlFn)
			assert.ok(result.indexOf("[href=#info]") > -1)
			result = build.parseView('a[href="mailto:info@example.com"]', "ui", noMinEl, testUrlFn)
			assert.ok(result.indexOf("mailto:info@example.com") > -1)
			assert.end()
		})

		test("skips without urlFn", function(assert) {
			var result = build.parseView("img[src=icon.png]", "ui", noMinEl, null)
			assert.ok(result.indexOf("[src=icon.png]") > -1)
			assert.end()
		})
	})

	describe("cssMin", function() {
		test("minifies css", function(assert) {
			var result = build.cssMin(".a {\n\ttop: 1px;\n}\n")
			assert.ok(result.indexOf(".a") > -1)
			assert.ok(result.indexOf("top") > -1)
			assert.end()
		})

		test("accepts url callback", function(assert) {
			var called = []
			, css = ".a { background: url(img/bg.png); }"
			, result = build.cssMin(css, function(u) {
				called.push(u)
				return "../assets/" + u
			})
			assert.equal(called, ["img/bg.png"])
			assert.ok(result.indexOf("../assets/img/bg.png") > -1)
			assert.end()
		})

		test("works without url callback", function(assert) {
			var css = ".a { background: url(img/bg.png); }"
			, result = build.cssMin(css)
			assert.ok(result.indexOf("img/bg.png") > -1)
			assert.end()
		})
	})
})
