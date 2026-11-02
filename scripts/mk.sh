#!/bin/sh
# mk.sh slug1 slug2 ... -> writes run.js with the slugs injected
list=$(printf '"%s",' "$@")
sed "s#/\*SLUGS\*/\[\]#[${list%,}]#" "$(dirname "$0")/naukri_apply.js" | python3 -I "$(dirname "$0")/answers.py" > "$(dirname "$0")/run.js"
if [ -n "$TIER2" ]; then sed -i "s#/\*STRICT\*/true#false#" "$(dirname "$0")/run.js"; fi
