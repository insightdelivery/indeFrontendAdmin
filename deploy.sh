#!/usr/bin/env bash
set -euo pipefail

SRC_DIR="/Users/hyoungjinnam/macSyncData/DEV/INDE/frontend_admin/out/"
DST_DIR="/Users/hyoungjinnam/macSyncData/DEV/INDE/frontend_admin_deploy"

# 1. out 폴더 존재 확인
if [ ! -d "$SRC_DIR" ]; then
  echo "ERROR: out directory not found: $SRC_DIR"
  exit 1
fi

# 2. 배포 저장소인지 최소 검증 (.git 존재 여부)
if [ ! -d "$DST_DIR/.git" ]; then
  echo "ERROR: deploy directory is not a git repository (.git not found)"
  exit 1
fi

echo "▶ Sync out → deploy (preserve .git)"

# 3. rsync로 안전하게 동기화
rsync -av --delete \
  --exclude=".git" \
  --exclude=".gitignore" \
  "$SRC_DIR" "$DST_DIR/"

echo "▶ Sync completed"

# 4. Git 상태 확인
cd "$DST_DIR"
git status --short

echo "▶ Ready to commit & push"

