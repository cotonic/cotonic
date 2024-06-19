.PHONY: all dist release clean testlib

DIRS=dist
$(shell mkdir -p $(DIRS))

download = curl --create-dirs --location -f --output $(1) $(2)

## Things needed for testing.

testlib: test/lib/qunit.js test/lib/qunit.css test/lib/qunit.css test/lib/qunit-composite.css test/lib/qunit-composite.js

test/lib/qunit.css:
	$(call download, "$@", \
			"https://code.jquery.com/qunit/qunit-2.5.0.css")

test/lib/qunit.js:
	$(call download, "$@", \
			"https://code.jquery.com/qunit/qunit-2.5.0.js")

test/lib/qunit-composite.css:
	$(call download, "$@", \
			"https://raw.githubusercontent.com/JamesMGreene/qunit-composite/master/qunit-composite.css")

test/lib/qunit-composite.js:
	$(call download, "$@", \
			"https://raw.githubusercontent.com/JamesMGreene/qunit-composite/master/qunit-composite.js")

# Dist

dist/cotonic-bundle.js: $(wildcard src/*.js) $(wildcard idom-src/*.js)
	esbuild src/index-bundle.js --platform=browser --target=es2018 --bundle --outfile=dist/cotonic-bundle.js

dist/cotonic-worker-bundle.js: $(wildcard src/*.js) $(wildcard idom-src/*.js)
	esbuild src/index-worker-bundle.js --platform=browser --target=es2018 --bundle --outfile=dist/cotonic-worker-bundle.js

dist/cotonic-service-worker-bundle.js:
	cp src/cotonic.service-worker.js  dist/cotonic-service-worker-bundle.js

dist: dist/cotonic-bundle.js dist/cotonic-worker-bundle.js  dist/cotonic-service-worker-bundle.js

# Release

cotonic.js: dist/cotonic-bundle.js
	cp dist/cotonic-bundle.js cotonic.js

cotonic-worker.js: dist/cotonic-worker-bundle.js
	cp dist/cotonic-worker-bundle.js cotonic-worker.js

cotonic-service-worker.js: dist/cotonic-service-worker-bundle.js
	cp dist/cotonic-service-worker-bundle.js cotonic-service-worker.js

release: cotonic.js cotonic-worker.js cotonic-service-worker.js

# Cleanup

clean:
	rm -f dist/*
	rm -f test/lib/*

# Test

test: testlib
	./start_dev.sh

