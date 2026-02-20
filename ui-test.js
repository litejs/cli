
/* jshint browser:true */
/* global El, LiteJS */

!function(describe) {
	var assert = describe.assert
	, selectorsUsage
	, viewsUsage = {}

	assert.wait = function() {
		var k
		, obj = this
		, hooks = []
		, hooked = []

		for (k in obj) if (typeof obj[k] === "function") swap(k)
		function swap(k) {
			hooked.push(k, obj[k])
			obj[k] = function() {
				hooks.push(k, arguments)
				return obj
			}
		}

		return function() {
			if (!hooks) return
			for (var v, scope = obj, i = hooked.length; i--; i--) {
				obj[hooked[i-1]] = hooked[i]
			}
			// i == -1 from previous loop
			for (; (v = hooks[++i]); ) {
				scope = scope[v].apply(scope, hooks[++i]) || scope
			}
			hooks = hooked = null
		}
	}
	assert.open = function(url, replace) {
		LiteJS.go(url, replace)
		return this
	}
	assert.resizeTo = function(width, height) {
		El.css({ width: width, height: height })
		LiteJS.ui.emit("resize")
		return this
	}
	assert.waitFor = function(fn, options) {
		var result
		, testCase = this
		, count = 0 | ((options && options.timeout || describe.conf.timeout) / 50)
		, resume = testCase.wait()

		test()
		return testCase

		function test() {
			result = fn()
			if (!result && count--) return setTimeout(test, 50)
			testCase(result)
			resume()
		}
	}
	assert.waitView = function(route, options) {
		return this.waitFor(function() {
			return LiteJS.ui.route === route
		}, options || "View " + route + " should be open")
	}
	assert.waitSelector = function(sel, options) {
		return this.waitFor(function() {
			return LiteJS.ui.$(sel)
		}, options || "Selector " + sel + " should be in dom")
	}
	assert.hasElements = function(sel, expected, options) {
		return this.waitFor(function() {
			var nodes = LiteJS.ui.$$(sel)
			return nodes && nodes.length === expected
		}, options || sel + " should have " + expected + " elements")
	}
	assert.hasText = function(sel, expected, options) {
		return this.waitFor(function() {
			var node = LiteJS.ui.$(sel)
			, txt = node && (node.tagName == "INPUT" ? node.value : node.textContent).trim()
			return txt === expected
		}, options || sel + " should have text: " + expected)
	}
	assert.fill = function(sel, value, options) {
		return this.waitFor(function() {
			var node = LiteJS.ui.$(sel)
			return node && (node.value = value) === value
		}, options || sel + " should have value " + value)
	}
	assert.click = function(sel, options) {
		return this.waitFor(function() {
			var node = LiteJS.ui.$(sel)
			if (node) {
				node.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))
			}
			return !!node
		}, options || sel + " should be clickable")
	}
	assert.collectCssUsage = function(options) {
		options = options || {}
		var ignoreFiles = options.ignoreFiles
		, ignoreSelectors = options.ignoreSelectors
		, cleanRe = /:(?:focus|active|hover|unknown|:[-\w]+)\b/g
		, i = document.styleSheets.length

		selectorsUsage = {}

		while (i--) parseSheet(document.styleSheets[i])

		function parseSheet(sheet) {
			var rule
			, rules = sheet.cssRules
			, len = rules.length
			, file = sheet.href || "inline"

			if (ignoreFiles && ignoreFiles.indexOf(file) > -1) return

			while (len--) {
				rule = rules[len]
				if (rule.styleSheet) {
					parseSheet(rule.styleSheet)
				} else if (rule.selectorText) {
					addSelectors(rule.selectorText, file, len)
				}
			}
		}
		function addSelectors(text, file, len) {
			text.split(/\s*,\s*/).forEach(function(sel) {
				sel = sel.replace(cleanRe, "").toLowerCase()
				if (!sel || ignoreSelectors && ignoreSelectors.indexOf(sel) > -1) return
				selectorsUsage[sel] = selectorsUsage[sel] || {files: [], count: 0}
				if (selectorsUsage[sel].files.indexOf(file + ":" + len) == -1) {
					selectorsUsage[sel].files.unshift(file + ":" + len)
				}
			})
		}
		LiteJS.ui.on("show", function() {
			var sel
			, arr = Object.keys(selectorsUsage)
			, len = arr.length
			for (; (sel = arr[--len]); ) {
				selectorsUsage[sel].count += document.querySelectorAll(sel).length
			}
		})
		return this
	}
	describe.unusedCss = function() {
		return Object.keys(selectorsUsage).filter(function(sel) {
			return !selectorsUsage[sel].count
		})
	}
	assert.assertCssUsage = function() {
		var unused = describe.unusedCss()
		return this(unused.length === 0, "Unused CSS rules: " + unused, unused.length, 0)
	}
	assert.collectViewsUsage = function() {
		LiteJS.ui.on("show", function(route) {
			for (var view = LiteJS.ui.views[route]; route; route = (view = view.parent || {}).route) {
				viewsUsage[route] = (viewsUsage[route] || 0) + 1
			}
		})
		return this
	}
	describe.unusedViews = function() {
		return Object.keys(LiteJS.ui.views).filter(function(route) {
			return !viewsUsage[route]
		})
	}
	assert.assertViewsUsage = function() {
		var unused = describe.unusedViews()
		return this(unused.length === 0, "Unused views: " + unused, unused.length, 0)
	}
	assert.isVisible = function(el) {
		return this.ok(el.offsetWidth > 0 && el.offsetHeight > 0)
	}

}(describe) // jshint ignore:line

