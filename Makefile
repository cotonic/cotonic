.PHONY: all w lib dist testlib clean test release

GNUMAKE?= gmake

all:
	${GNUMAKE} all

w:
	${GNUMAKE} all

lib:
	${GNUMAKE} lib

dist:
	${GNUMAKE} dist

testlib:
	${GNUMAKE} testlib

clean:
	${GNUMAKE} clean

test:
	${GNUMAKE} test

release:
	${GNUMAKE} release 
