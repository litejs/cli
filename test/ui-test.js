
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

	it("should use all css rules", function(assert) {
		assert.assertCssUsage().end()
	})
})
