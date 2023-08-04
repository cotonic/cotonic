#!/bin/bash

readonly host=localhost
readonly port=6227
readonly uri=test

if [[ "$OSTYPE" == darwin* ]]; then
    readonly cmd=open
elif [[ "$OSTYPE" == linux* ]]; then
    readonly cmd=xdg-open
else
    readonly browsers=("google-chrome" "chromium-browser" "firefox" "microsoft-edge")

    for browser in "${browsers[@]}"; do
        if which "$browser" >/dev/null; then
            readonly cmd="$browser"
            break
        fi
    done

    if [ -z "$cmd" ]; then
        echo "None of those browsers was found:"
        printf "\t%s\n" "${browsers[@]}"
        exit 1
    fi
fi

(sleep 1 && "$cmd" http://"$host":"$port"/"$uri") & esbuild --serve=127.0.0.1:"$port" --servedir=. 
