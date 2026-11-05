#!/bin/bash
# usage: find_emails.sh domain...  -> domain<TAB>emails found on its own pages (same domain only)
for d in "$@"; do
  found=""
  for p in "" careers career careers/ contact contact-us contact-us/ about-us jobs join-us; do
    html=$(curl -sL --max-time 12 -A "Mozilla/5.0" "https://$d/$p" 2>/dev/null)
    e=$(printf '%s' "$html" | grep -oiE "[a-z0-9._%+-]+@([a-z0-9-]+\.)*${d//./\\.}" | tr 'A-Z' 'a-z' | sort -u | tr '\n' ' ')
    [ -n "$e" ] && found="$found $e"
  done
  echo -e "$d\t$(echo $found | tr ' ' '\n' | sort -u | tr '\n' ' ')"
done
