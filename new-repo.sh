#!/bin/bash
# Usage: new-repo.sh <repo-dir> <repo-name> "<description>" <pr-body-file>
# Standing rule: main never shows a red run. Seeds main with LICENSE + .gitignore
# (no workflows → no run), pushes everything else on branch `init`, enables Pages
# (build_type=workflow) and opens the PR. Run `npm run check` before calling this.
set -euo pipefail
DIR="$1"; REPO="$2"; DESC="$3"; BODY="$4"
cd "$DIR"
git init -q 2>/dev/null || true
git checkout -q -B main
git rm -rfq --cached . 2>/dev/null || true
git add LICENSE .gitignore
git commit -q -m "chore: seed repository"
gh repo create "Freddricklogan/$REPO" --public --description "$DESC" --homepage "https://freddricklogan.github.io/$REPO/" >/dev/null
git remote remove origin 2>/dev/null || true
git remote add origin "https://github.com/Freddricklogan/$REPO.git"
git push -q -u origin main
git checkout -q -b init
git add -A
git commit -q -F - <<MSG
Initial release
MSG
git push -q -u origin init
gh api -X POST "repos/Freddricklogan/$REPO/pages" -f build_type=workflow --jq '.build_type'
gh api -X POST "repos/Freddricklogan/$REPO/pulls" -f title="Initial release" -f head=init -f base=main -F body=@"$BODY" --jq '.html_url'
