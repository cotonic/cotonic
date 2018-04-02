.PHONY: dist lib testlib

DIRS=dist
$(shell mkdir -p $(DIRS))

LIBS := $(wildcard lib/*)


download = curl --create-dirs --location -f --output $(1) $(2)

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
	    	"https://cdn.rawgit.com/jquery/qunit-composite/master/qunit-composite.css")

test/lib/qunit-composite.js:
	$(call download, "$@", \
	    	"https://cdn.rawgit.com/jquery/qunit-composite/master/qunit-composite.js")


dist/cotonic.js: lib
	cat src/cotonic.js src/cotonic.idom.js src/cotonic.tokenizer.js src/cotonic.ui.js \
src/cotonic.mqtt.js src/cotonic.mqtt_session.js src/cotonic.mqtt_packet.js src/cotonic.mqtt_transport.ws.js \
src/cotonic.broker.js > dist/cotonic.js

dist/cotonic_worker.js: lib
	cat src/cotonic.mqtt.js src/cotonic.worker.js > dist/cotonic_worker.js

dist: dist/cotonic.js dist/cotonic_worker.js

test: lib testlib
	./start_dev.sh
