
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
			// multiple flags
			el = mockEl("ie8 demo")
			input = "/*** ie8 ***/\ncode1\n/**/\n/*** demo ***/\ncode2\n/**/"
			expected = "/*** ie8 ***\ncode1\n/**/\n/*** demo ***\ncode2\n/**/"
			assert.equal(build.drop(el, input), expected)
			// non-matching flag left unchanged
			assert.equal(build.drop(mockEl("ie8"), "/*** demo ***/\ncode\n/**/"), "/*** demo ***/\ncode\n/**/")
			assert.end()
		})

		test("uses custom attr name", function(assert) {
			var el = mockEl("ie8", "cat-drop")
			assert.equal(build.drop(el, "/*** ie8 ***/\ncode\n/**/"), "/*** ie8 ***/\ncode\n/**/")
			assert.equal(build.drop(el, "/*** ie8 ***/\ncode\n/**/", "cat-drop"), "/*** ie8 ***\ncode\n/**/")
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

	describe("parseView", function() {
		function testUrlFn(u) {
			return "out/" + u
		}
		var noMinEl = {}

		test("rewrites [src] with urlFn", function(assert) {
			var result = build.parseView("img[src=icon.png]", "ui", noMinEl, testUrlFn)
			assert.ok(result.indexOf("[src=out/icon.png]") > -1)
			// preserves fragment
			result = build.parseView("use[src=icons.svg#star]", "ui", noMinEl, testUrlFn)
			assert.ok(result.indexOf("[src=out/icons.svg#star]") > -1)
			// does not touch [href]
			result = build.parseView("a[href=style.css]", "ui", noMinEl, testUrlFn)
			assert.ok(result.indexOf("[href=style.css]") > -1)
			// skips without urlFn
			result = build.parseView("img[src=icon.png]", "ui", noMinEl, null)
			assert.ok(result.indexOf("[src=icon.png]") > -1)
			assert.end()
		})

		test("extracts %css section", function(assert) {
			var result = build.parseView("%css\n.a { color: red }\n\ndiv Hello", "ui", noMinEl, null)
			assert.ok(result.indexOf("%css") > -1)
			assert.ok(result.indexOf("color") > -1)
			assert.ok(result.indexOf("div Hello") > -1)
			// appends to lastMinEl.css.textContent when set
			var mockCss = { textContent: "" }
			build.parseView("%css\n.a { color: red }\n\ndiv Hello", "ui", { css: mockCss }, null)
			assert.ok(mockCss.textContent.indexOf("color") > -1)
			assert.end()
		})

		test("appends %css to _txt when available", function(assert) {
			// When lastMinEl.css has _txt, %css must go to _txt (not textContent)
			// because inline loop uses _txt for content
			var mockCss = { _txt: ".existing{}", textContent: "" }
			build.parseView("%css\n.added { color: red }\n\ndiv Hello", "js", { css: mockCss }, null)
			assert.ok(mockCss._txt.indexOf(".added") > -1)
			assert.ok(mockCss._txt.indexOf(".existing") > -1)
			assert.equal(mockCss.textContent, "")
			assert.end()
		})

		test("extracts %js section", function(assert) {
			var result = build.parseView("%js\nvar x = 1\n\ndiv Hello", "js", noMinEl, null)
			assert.ok(result.indexOf("var x = 1") > -1)
			// appends to lastMinEl.js when set
			var mockJs = { _txt: "" }
			build.parseView("%js\nvar x = 1\n\ndiv Hello", "ui", { js: mockJs }, null)
			assert.ok(mockJs._txt.indexOf("var x = 1") > -1)
			assert.end()
		})

		test("converts to js with extTo=js", function(assert) {
			var result = build.parseView("div Hello", "js", noMinEl, null)
			assert.ok(result.indexOf("xhr.ui(") > -1)
			result = build.parseView("%css\n.a { color: red }\n\n", "js", noMinEl, null)
			assert.ok(result.indexOf("xhr.css(") > -1)
			assert.end()
		})
	})

	describe("cssMin", function() {
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
			var result = build.cssMin(".a {\n\ttop: 1px;\n}\n")
			assert.ok(result.indexOf(".a") > -1)
			assert.ok(result.indexOf("top") > -1)
			// preserves url() without callback
			result = build.cssMin(".a { background: url(img/bg.png); }")
			assert.ok(result.indexOf("img/bg.png") > -1)
			assert.end()
		})
	})
})
