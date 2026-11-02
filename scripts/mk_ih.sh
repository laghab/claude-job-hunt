#!/bin/sh
list=$(printf '%s,' "$@")
sed "s#/\*IDS\*/\[\]#[${list%,}]#" "$(dirname "$0")/instahyre_apply.js" | python3 -I "$(dirname "$0")/answers.py" > "$(dirname "$0")/run_ih.js"
