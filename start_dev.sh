#!/bin/bash


if [[ "$OSTYPE" == darwin* ]]; then
    (sleep 1 && open http://localhost:6227/test/) &
else
    (sleep 1 && firefox http://localhost:6227/test/) &
fi

python devserver.py 6227
