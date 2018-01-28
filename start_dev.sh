#!/bin/bash

(sleep 1 && open http://localhost:6227/test/) &

python devserver.py 6227
