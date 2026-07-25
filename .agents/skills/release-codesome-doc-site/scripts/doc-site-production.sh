#!/usr/bin/env bash
set -Eeuo pipefail

CANONICAL_REMOTE='https://github.com/hicodesome/codesome-docs-site.git'
PRODUCTION_HOST='longxia'
PRODUCTION_DIR='/home/ubuntu/doc-main'
PM2_APP='doc-site-3009'
PUBLIC_URL='https://doc.codesome.ai'

fail() {
  printf 'FAIL: %s\n' "$*" >&2
  exit 1
}

pass() {
  printf 'PASS: %s\n' "$*"
}

usage() {
  cat <<'EOF'
Usage:
  doc-site-production.sh preflight [--sha SHA]
  doc-site-production.sh deploy [--sha SHA] [--file PATH] [--expect PATH::TEXT]
  doc-site-production.sh verify [--sha SHA] [--file PATH] [--expect PATH::TEXT]

Actions:
  preflight  Validate the local release commit without pushing or deploying.
  deploy     Push origin/main, fast-forward production, restart PM2, and verify.
  verify     Re-run Git, PM2, localhost, public file, and text verification.
EOF
}

[[ $# -ge 1 ]] || {
  usage
  exit 2
}

ACTION=$1
shift
EXPECTED_SHA=''
declare -a EXTRA_FILES=()
declare -a EXPECTATIONS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --sha)
      [[ $# -ge 2 ]] || fail '--sha requires a value'
      EXPECTED_SHA=$2
      shift 2
      ;;
    --file)
      [[ $# -ge 2 ]] || fail '--file requires a repository-relative path'
      EXTRA_FILES+=("$2")
      shift 2
      ;;
    --expect)
      [[ $# -ge 2 ]] || fail '--expect requires PATH::TEXT'
      EXPECTATIONS+=("$2")
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fail "unknown argument: $1"
      ;;
  esac
done

case "$ACTION" in
  preflight|deploy|verify) ;;
  *)
    usage
    exit 2
    ;;
esac

for command in git node npm rg curl ssh sha256sum awk; do
  command -v "$command" >/dev/null || fail "required command is unavailable: $command"
done

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)
EXPECTED_SHA=${EXPECTED_SHA:-$(git -C "$REPO_ROOT" rev-parse HEAD)}
EXPECTED_SHA=$(git -C "$REPO_ROOT" rev-parse "${EXPECTED_SHA}^{commit}")

git_text() {
  git -C "$REPO_ROOT" "$@"
}

check_local_identity() {
  local branch remote
  branch=$(git_text branch --show-current)
  remote=$(git_text remote get-url origin)
  [[ "$branch" == 'main' ]] || fail "local branch must be main, found: $branch"
  [[ "$remote" == "$CANONICAL_REMOTE" ]] || fail "local origin is not canonical: $remote"
  [[ "$(git_text rev-parse HEAD)" == "$EXPECTED_SHA" ]] || fail 'local HEAD does not equal --sha'
  pass "local identity is main at $EXPECTED_SHA"
}

check_local_cleanliness() {
  git_text diff --quiet || fail 'local tracked worktree has unstaged changes'
  git_text diff --cached --quiet || fail 'local index has staged, uncommitted changes'

  local untracked_count
  untracked_count=$(git_text ls-files --others --exclude-standard | wc -l | tr -d ' ')
  if [[ "$untracked_count" != '0' ]]; then
    printf 'WARN: local repository has %s untracked path(s); they are not part of the release\n' "$untracked_count"
  fi
  pass 'local tracked worktree is clean'
}

refresh_origin() {
  git_text fetch --prune origin main
  git_text cat-file -e 'origin/main^{commit}'
  git_text merge-base --is-ancestor origin/main "$EXPECTED_SHA" ||
    fail 'origin/main is not an ancestor of the release commit; refusing non-fast-forward publication'
  pass "release commit is a fast-forward of origin/main $(git_text rev-parse origin/main)"
}

check_cache_versions() {
  local base=$1 path current_line base_line
  local -a resources=()

  mapfile -d '' resources < <(
    git_text diff --name-only -z --diff-filter=ACMRT "$base" "$EXPECTED_SHA" -- \
      'styles/*.css' 'scripts/*.js' 'assets/*.js' 'assets/*.css'
  )

  for path in "${resources[@]}"; do
    if ! rg -F -q -- "$path" "$REPO_ROOT/index.html"; then
      continue
    fi

    current_line=$(rg -F -m 1 -- "$path" "$REPO_ROOT/index.html")
    [[ "$current_line" == *"$path?v="* ]] ||
      fail "browser resource lacks a ?v= cache version in index.html: $path"

    base_line=$(git_text show "$base:index.html" 2>/dev/null | rg -F -m 1 -- "$path" || true)
    [[ "$current_line" != "$base_line" ]] ||
      fail "browser resource changed without bumping its index.html cache version: $path"
  done

  pass 'browser resource cache versions are consistent'
}

run_preflight() {
  check_local_identity
  check_local_cleanliness
  refresh_origin
  git_text diff --check origin/main "$EXPECTED_SHA"
  check_cache_versions "$(git_text rev-parse origin/main)"
  (
    cd "$REPO_ROOT"
    npm run check
  )
  pass 'local content, link, image, CDC, whitespace, and cache gates passed'
}

encode_path() {
  node -e 'process.stdout.write(encodeURIComponent(process.argv[1]).replace(/%2F/g, "/"))' "$1"
}

is_public_release_file() {
  local path=$1
  case "$path" in
    index.html|_sidebar.md|*.md)
      [[ "$path" != */* ]]
      ;;
    styles/*.css|scripts/*.js|assets/*.js|assets/*.css|assets/vendor/*|images/*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

verify_public_file() {
  local path=$1 encoded expected_hash actual_hash
  git_text cat-file -e "$EXPECTED_SHA:$path" 2>/dev/null || fail "release commit does not contain: $path"
  encoded=$(encode_path "$path")
  expected_hash=$(git_text show "$EXPECTED_SHA:$path" | sha256sum | awk '{print $1}')
  actual_hash=$(curl -fsS --max-time 30 "$PUBLIC_URL/$encoded" | sha256sum | awk '{print $1}')
  [[ "$actual_hash" == "$expected_hash" ]] || fail "public file differs from $EXPECTED_SHA: $path"
  pass "public file matches release commit: $path"
}

verify_expectation() {
  local item=$1 path text_value encoded
  [[ "$item" == *'::'* ]] || fail "invalid --expect value, use PATH::TEXT: $item"
  path=${item%%::*}
  text_value=${item#*::}
  [[ -n "$path" && -n "$text_value" ]] || fail "invalid --expect value: $item"
  encoded=$(encode_path "$path")
  curl -fsS --max-time 30 "$PUBLIC_URL/$encoded" | rg -F -q -- "$text_value" ||
    fail "public file does not contain expected text: $path :: $text_value"
  pass "public text expectation matched: $path"
}

verify_remote_runtime() {
  ssh "$PRODUCTION_HOST" bash -s -- \
    "$PRODUCTION_DIR" "$CANONICAL_REMOTE" "$EXPECTED_SHA" "$PM2_APP" <<'REMOTE'
set -Eeuo pipefail
production_dir=$1
canonical_remote=$2
expected_sha=$3
pm2_app=$4

cd "$production_dir"
git fetch --prune origin main
[[ "$(git branch --show-current)" == 'main' ]] || {
  printf 'FAIL: production branch is not main\n' >&2
  exit 1
}
[[ "$(git remote get-url origin)" == "$canonical_remote" ]] || {
  printf 'FAIL: production origin is not canonical\n' >&2
  exit 1
}
[[ "$(git rev-parse HEAD)" == "$expected_sha" ]] || {
  printf 'FAIL: production HEAD does not equal release SHA\n' >&2
  exit 1
}
[[ "$(git rev-parse origin/main)" == "$expected_sha" ]] || {
  printf 'FAIL: production origin/main does not equal release SHA\n' >&2
  exit 1
}
[[ -z "$(git status --porcelain=v1 --untracked-files=all)" ]] || {
  printf 'FAIL: production worktree is not clean\n' >&2
  git status --short >&2
  exit 1
}

pm2_status=$(pm2 jlist | node -e '
let input = "";
process.stdin.on("data", chunk => input += chunk);
process.stdin.on("end", () => {
  const app = JSON.parse(input).find(item => item.name === process.argv[1]);
  process.stdout.write(app?.pm2_env?.status ?? "missing");
});
' "$pm2_app")
[[ "$pm2_status" == 'online' ]] || {
  printf 'FAIL: PM2 app is not online: %s\n' "$pm2_status" >&2
  exit 1
}
curl -fsS --max-time 20 'http://127.0.0.1:3009/index.html' >/dev/null
printf 'PASS: production SHA=%s, origin/main=%s, PM2=%s, localhost:3009=reachable\n' \
  "$(git rev-parse HEAD)" "$(git rev-parse origin/main)" "$pm2_status"
REMOTE
}

reconcile_and_deploy_remote() {
  ssh "$PRODUCTION_HOST" bash -s -- \
    "$PRODUCTION_DIR" "$CANONICAL_REMOTE" "$EXPECTED_SHA" "$PM2_APP" <<'REMOTE'
set -Eeuo pipefail
production_dir=$1
canonical_remote=$2
expected_sha=$3
pm2_app=$4

fail() {
  printf 'FAIL: %s\n' "$*" >&2
  exit 1
}

cd "$production_dir"
[[ "$(git branch --show-current)" == 'main' ]] || fail 'production branch is not main'
[[ "$(git remote get-url origin)" == "$canonical_remote" ]] || fail 'production origin is not canonical'
git fetch --prune origin main
[[ "$(git rev-parse origin/main)" == "$expected_sha" ]] || fail 'production origin/main does not equal release SHA'
git merge-base --is-ancestor HEAD "$expected_sha" || fail 'production HEAD cannot fast-forward to release SHA'

git diff --cached --quiet || fail 'production has staged changes; refusing automatic reconciliation'
mapfile -t untracked_paths < <(git ls-files --others --exclude-standard)
[[ ${#untracked_paths[@]} -eq 0 ]] || fail 'production has untracked files; refusing automatic reconciliation'

if ! git diff --quiet; then
  mapfile -d '' dirty_paths < <(git diff --name-only -z)
  [[ ${#dirty_paths[@]} -gt 0 ]] || fail 'production dirty state could not be classified'

  for path in "${dirty_paths[@]}"; do
    [[ -f "$path" ]] || fail "dirty production path is not a regular file: $path"
    git cat-file -e "$expected_sha:$path" 2>/dev/null || fail "dirty path is absent from release commit: $path"
    worktree_hash=$(sha256sum -- "$path" | awk '{print $1}')
    target_hash=$(git show "$expected_sha:$path" | sha256sum | awk '{print $1}')
    [[ "$worktree_hash" == "$target_hash" ]] || fail "dirty production path differs from release commit: $path"
  done

  backup_dir='/home/ubuntu/.doc-site-deploy-backups'
  mkdir -p "$backup_dir"
  backup_file="$backup_dir/$(date -u +%Y%m%dT%H%M%SZ)-$(git rev-parse --short HEAD)-to-${expected_sha:0:12}.patch"
  git diff --binary > "$backup_file"
  git restore --worktree -- "${dirty_paths[@]}"
  [[ -z "$(git status --porcelain=v1 --untracked-files=all)" ]] || fail 'production remained dirty after safe reconciliation'
  printf 'PASS: reconciled byte-identical production changes; backup=%s\n' "$backup_file"
fi

git pull --ff-only origin main
[[ "$(git rev-parse HEAD)" == "$expected_sha" ]] || fail 'production did not reach release SHA'
pm2 restart "$pm2_app" --update-env
pm2 save
curl -fsS --max-time 20 'http://127.0.0.1:3009/index.html' >/dev/null
printf 'PASS: production fast-forwarded and PM2 restarted at %s\n' "$expected_sha"
REMOTE
}

verify_release() {
  local path item
  verify_remote_runtime
  curl -fsS --max-time 30 "$PUBLIC_URL/" >/dev/null
  pass "public homepage is reachable: $PUBLIC_URL/"
  verify_public_file 'index.html'

  for path in "${EXTRA_FILES[@]}"; do
    verify_public_file "$path"
  done
  for item in "${EXPECTATIONS[@]}"; do
    verify_expectation "$item"
  done
}

deploy_release() {
  local previous_sha path
  local -a changed_public_files=()

  run_preflight
  git_text push origin HEAD:main
  git_text fetch --prune origin main
  [[ "$(git_text rev-parse origin/main)" == "$EXPECTED_SHA" ]] || fail 'GitHub origin/main did not reach release SHA'
  pass "GitHub origin/main is $EXPECTED_SHA"

  previous_sha=$(ssh "$PRODUCTION_HOST" "git -C '$PRODUCTION_DIR' rev-parse HEAD")
  git_text cat-file -e "$previous_sha^{commit}" 2>/dev/null || fail "local repository lacks production commit: $previous_sha"

  mapfile -d '' changed_paths < <(
    git_text diff --name-only -z --diff-filter=ACMRT "$previous_sha" "$EXPECTED_SHA"
  )
  for path in "${changed_paths[@]}"; do
    if is_public_release_file "$path"; then
      changed_public_files+=("$path")
    fi
  done

  reconcile_and_deploy_remote
  verify_remote_runtime
  curl -fsS --max-time 30 "$PUBLIC_URL/" >/dev/null
  verify_public_file 'index.html'
  for path in "${changed_public_files[@]}"; do
    [[ "$path" == 'index.html' ]] || verify_public_file "$path"
  done
  for path in "${EXTRA_FILES[@]}"; do
    verify_public_file "$path"
  done
  for item in "${EXPECTATIONS[@]}"; do
    verify_expectation "$item"
  done
  pass "release completed: GitHub, production, PM2, localhost, and public files agree at $EXPECTED_SHA"
}

case "$ACTION" in
  preflight)
    run_preflight
    ;;
  deploy)
    deploy_release
    ;;
  verify)
    check_local_identity
    refresh_origin
    [[ "$(git_text rev-parse origin/main)" == "$EXPECTED_SHA" ]] || fail 'GitHub origin/main does not equal release SHA'
    verify_release
    ;;
esac
