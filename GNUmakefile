.PHONY: all dist release lib clean testlib

DIRS=dist
$(shell mkdir -p $(DIRS))

LIBS := $(wildcard lib/*)


download = curl --create-dirs --location -f --output $(1) $(2)

## Build cotonic for Zotonic - includes variant for deprecated wird ui

ifeq (1,$(ZOTONIC_LIB))

.PHONY: zotonic-lib

all: release lib zotonic-lib

zotonic-lib: dist dist/zotonic-wired-bundle.js
	mkdir -p ../../lib/cotonic/.
	cp lib/* ../../lib/cotonic/.
	cp dist/* ../../lib/cotonic/.
	cp src/* ../../lib/cotonic/.

dist/zotonic-wired-bundle.js: lib
	cat lib/incremental-dom-min.js \
		src/empty.js \
		polyfill/*.js \
		src/cotonic.js \
		src/cotonic.ui.js \
		src/cotonic.tokenizer.js \
		src/cotonic.mqtt.js \
		src/cotonic.broker.js \
		src/cotonic.mqtt_packet.js \
		src/cotonic.mqtt_transport.ws.js \
		src/cotonic.mqtt_session.js  \
		src/cotonic.mqtt_bridge.js \
		src/cotonic.model.*.js \
		src/cotonic.keyserver.js \
		src/cotonic.idom.js \
		src/cotonic.event.js \
		| grep -v '^//# sourceMappingURL=' \
		 > dist/zotonic-wired-bundle.js
else

all: lib

endif

## Deps

lib: lib/incremental-dom.js lib/incremental-dom.js.map lib/incremental-dom-min.js lib/incremental-dom-min.js.map

lib/incremental-dom.js:
	$(call download, "$@", \
		"https://ajax.googleapis.com/ajax/libs/incrementaldom/0.5.1/incremental-dom.js")
lib/incremental-dom.js.map:
	$(call download, "$@", \
		"https://ajax.googleapis.com/ajax/libs/incrementaldom/0.5.1/incremental-dom.js.map")

lib/incremental-dom-min.js:
	$(call download, "$@", \
		"https://ajax.googleapis.com/ajax/libs/incrementaldom/0.5.1/incremental-dom-min.js")
lib/incremental-dom-min.js.map:
	$(call download, "$@", \
		"https://ajax.googleapis.com/ajax/libs/incrementaldom/0.5.1/incremental-dom-min.js.map")

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


dist/cotonic-bundle.js: lib
	cat lib/incremental-dom-min.js \
		src/empty.js \
		polyfill/*.js \
		src/cotonic.js \
		src/cotonic.idom.js \
		src/cotonic.tokenizer.js \
		src/cotonic.ui.js \
		src/cotonic.mqtt.js \
		src/cotonic.broker.js \
		src/cotonic.mqtt_packet.js \
		src/cotonic.mqtt_transport.ws.js \
		src/cotonic.mqtt_session.js  \
		src/cotonic.mqtt_bridge.js \
		src/cotonic.model.*.js \
		src/cotonic.keyserver.js \
		src/cotonic.event.js \
		| grep -v '^//# sourceMappingURL=' \
		> dist/cotonic-bundle.js

dist/cotonic-worker-bundle.js: lib
	cat polyfill/*.js \
		src/cotonic.mqtt.js \
		src/cotonic.worker.js \
		> dist/cotonic-worker-bundle.js

dist/cotonic-service-worker-bundle.js: lib
	cat src/cotonic.service-worker.js \
		> dist/cotonic-service-worker-bundle.js

dist: dist/cotonic-bundle.js \
	  dist/cotonic-worker-bundle.js \
	  dist/cotonic-service-worker-bundle.js

# Release

cotonic.js: dist/cotonic-bundle.js
	cp dist/cotonic-bundle.js cotonic.js

cotonic-worker.js: dist/cotonic-worker-bundle.js
	cp dist/cotonic-worker-bundle.js cotonic-worker.js

cotonic-service-worker.js: dist/cotonic-service-worker-bundle.js
	cp dist/cotonic-service-worker-bundle.js cotonic-service-worker.js

release: cotonic.js cotonic-worker.js cotonic-service-worker.js

clean:
	rm -f dist/*
	rm -f lib/*
	rm -f test/lib/*

test: lib testlib
	./start_dev.sh
