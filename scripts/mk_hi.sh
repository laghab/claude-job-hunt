#!/bin/sh
list=$(printf '"%s",' "$@")
sed "s#/\*SLUGS\*/\[\]#[${list%,}]#" "$(dirname "$0")/hirist_apply.js" | python3 -I "$(dirname "$0")/answers.py" > "$(dirname "$0")/run_hi.js"
