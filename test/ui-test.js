
describe("ui-test.js", function() {

	it("should set up css tracking", function(assert) {
		assert.collectCssUsage({
			ignoreSelectors: ["*:before", "*:after"]
		})
		assert.end()
	})

	it("should render home view", function(assert) {
		assert
		.open("")
		.waitView("home")
		.hasText("h2", "Welcome")
		.hasRole("heading", { name: "Welcome" })
		.hasRole("link", { name: "About" })
		.hasRole("link", { name: /Counter/ })
		.end()
	})

	it("should navigate to about", function(assert) {
		assert
		.click('a[href="#about"]')
		.waitView("about")
		.hasText("h2", "About")
		.hasElements("ul > li", 3)
		.end()
	})

	it("should navigate to counter", function(assert) {
		assert
		.click('a[href="#counter"]')
		.waitView("counter")
		.hasText(".count", "Count: 0")
		.click("#btn-inc")
		.hasText(".count", "Count: 1")
		.click("#btn-inc")
		.hasText(".count", "Count: 2")
		.hasRole("button", { name: "Increment" })
		.end()
	})

	it("should navigate back home", function(assert) {
		assert
		.click('a[href="#"]')
		.waitView("home")
		.hasText("h2", "Welcome")
		.end()
	})

	it("should navigate via open", function(assert) {
		assert
		.open("about")
		.waitView("about")
		.hasText("h2", "About")
		.end()
	})

	it("should find elements by role with getByRole", function(assert) {
		assert
		.open("about")
		.waitView("about")
		.waitFor(function() {
			var items = describe.getByRole("listitem")
			return items.length === 3
		})
		.waitFor(function() {
			var links = describe.getByRole("link", { name: "Home" })
			return links.length === 1
		})
		.end()
	})

	it("should use all css rules", function(assert) {
		assert.assertCssUsage().end()
	})
})
