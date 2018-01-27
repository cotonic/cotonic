#!/bin/bash

python -m SimpleHTTPServer 6227 &
sleep 1;
open http://localhost:6227/test/;
