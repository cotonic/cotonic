.PHONY: all lib dist testlib clean test

GNUMAKE?= gmake

all:
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
