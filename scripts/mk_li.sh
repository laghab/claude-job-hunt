#!/bin/sh
list=$(printf '"%s",' "$@")
sed "s#/\*IDS\*/\[\]#[${list%,}]#" "$(dirname "$0")/linkedin_apply.js" | python3 -I "$(dirname "$0")/answers.py" > "$(dirname "$0")/run_li.js"
if [ -n "$TIER2" ]; then sed -i "s#/\*STRICT\*/true#false#" "$(dirname "$0")/run_li.js"; fi
