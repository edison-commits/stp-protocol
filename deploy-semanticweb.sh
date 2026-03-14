#!/usr/bin/env bash
set -euo pipefail

REMOTE="${REMOTE:-root@5.78.130.174}"
REMOTE_DIR="${REMOTE_DIR:-/opt/semanticweb}"
FILES=(index.html robots.txt sitemap.xml og-stp.svg)

for f in "${FILES[@]}"; do
  [[ -f "$f" ]] || { echo "missing $f" >&2; exit 1; }
done

STAMP="$(date +%Y%m%d-%H%M%S)"
ssh "$REMOTE" "mkdir -p $REMOTE_DIR/backup-$STAMP && cp $REMOTE_DIR/html/index.html $REMOTE_DIR/backup-$STAMP/"
scp "${FILES[@]}" "$REMOTE:$REMOTE_DIR/html/"
ssh "$REMOTE" "chmod 644 $REMOTE_DIR/html/index.html $REMOTE_DIR/html/robots.txt $REMOTE_DIR/html/sitemap.xml $REMOTE_DIR/html/og-stp.svg && docker restart semanticweb-landing >/dev/null"

echo "Deployed semanticweb.dev assets to $REMOTE:$REMOTE_DIR/html"
