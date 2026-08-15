#!/usr/bin/env bash
# ============================================================
# 法渡 — GitHub 发布：建仓 -> push -> topics -> release -> Pages -> 验证
# 依赖：GCM 凭据（git credential fill）+ 直连 GitHub
# ============================================================
set -uo pipefail
cd "$(dirname "$0")/.."

# 强制直连（Clash 代理会阻断 GitHub 连接）
export HTTPS_PROXY= HTTP_PROXY= ALL_PROXY= no_proxy="*" NO_PROXY="*"
CURL() { curl -sS --noproxy "*" "$@"; }

REPO="fadao"
API="https://api.github.com"

# ---- 1. 提取 token（GCM） ----
TOKEN=$(printf "protocol=https\nhost=github.com\n\n" | git credential fill 2>/dev/null | sed -n 's/^password=//p')
[ -n "$TOKEN" ] || { echo "❌ 无法从 GCM 提取 token"; exit 1; }
GH_USER=$($CURL -H "Authorization: token ${TOKEN}" "$API/user" | python -c "import sys,json;print(json.load(sys.stdin)['login'])" 2>/dev/null)
echo "账号: ${GH_USER}"

# ---- 2. 建仓 ----
python - <<'PYEOF'
import json
d = {
    "name": "fadao",
    "description": "法渡 — 法考学习工具：18部门法客观题刷题(1500+真题带逐选项解析)、单选/多选/不定项、每日一练、模拟考试、错题本(艾宾浩斯复习)、打卡追踪。纯前端零依赖离线可用。",
    "homepage": "https://andesiwangzhiyi-alt.github.io/fadao/",
    "private": False, "has_issues": True, "has_wiki": False
}
open('_api_req.json', 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False))
PYEOF
RESP=$($CURL -X POST -H "Authorization: token ${TOKEN}" -H "Accept: application/vnd.github+json" \
  -H "Content-Type: application/json; charset=utf-8" --data @_api_req.json "$API/user/repos")
echo "$RESP" | python -c "import sys,json;d=json.load(sys.stdin);print('建仓:', d.get('html_url') or d.get('message'))" || { echo "建仓失败: $RESP"; exit 1; }
rm -f _api_req.json

# ---- 3. 添加 remote 并 push ----
git remote remove origin 2>/dev/null
git remote add origin "https://github.com/${GH_USER}/${REPO}.git"
echo "推送代码..."
PUSH_OUT=$(git -c http.proxy= -c https.proxy= push -u origin main 2>&1)
echo "$PUSH_OUT" | tail -3
echo "$PUSH_OUT" | grep -qE "rejected|error|fatal|Failed to connect" && { echo "❌ push 失败"; exit 1; }
echo "✅ 代码已推送"

# ---- 4. topics ----
python - <<'PYEOF'
import json
open('_topics.json', 'w', encoding='utf-8').write(json.dumps({"names":["fakao","legal-exam","law","exam-prep","study-tool","pwa","offline-first","zhuma"]}))
PYEOF
$CURL -X PUT -H "Authorization: token ${TOKEN}" -H "Accept: application/vnd.github+json" \
  -H "Content-Type: application/json" --data @_topics.json "$API/repos/${GH_USER}/${REPO}/topics" | python -c "import sys,json;d=json.load(sys.stdin);print('topics:', len(d.get('names',[])), '个')"
rm -f _topics.json

# ---- 5. release ----
python - <<'PYEOF'
import json
d = {"tag_name": "v0.1", "name": "v0.1 · 法渡", "body": "首个可用版本：\n- 题库 1532 题（18 部门法，2016-2025 真题，100% 逐选项解析）\n- 单选/多选/不定项三种题型刷题\n- 每日一练 / 模拟考试（法考结构组卷）\n- 错题本 + 艾宾浩斯复习提醒\n- 打卡热力图 / 学习统计 / 番茄专注钟\n- 数据导出导入备份", "draft": False}
open('_rel.json', 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False))
PYEOF
$CURL -X POST -H "Authorization: token ${TOKEN}" -H "Accept: application/vnd.github+json" \
  -H "Content-Type: application/json" --data @_rel.json "$API/repos/${GH_USER}/${REPO}/releases" | python -c "import sys,json;d=json.load(sys.stdin);print('release:', d.get('html_url') or d.get('message'))"
rm -f _rel.json

# ---- 6. 开启 Pages（gh-pages 分支） ----
python - <<'PYEOF'
import json
d = {"source": {"branch": "main", "path": "/"}}
open('_pages.json', 'w', encoding='utf-8').write(json.dumps(d))
PYEOF
$CURL -X POST -H "Authorization: token ${TOKEN}" -H "Accept: application/vnd.github+json" \
  -H "Content-Type: application/json" --data @_pages.json "$API/repos/${GH_USER}/${REPO}/pages" | python -c "import sys,json;d=json.load(sys.stdin);print('pages:', d.get('html_url') or d.get('message'))"
rm -f _pages.json

# ---- 7. 验证 ----
echo "--- 验证 ---"
$CURL -H "Authorization: token ${TOKEN}" "$API/repos/${GH_USER}/${REPO}" | python -c "import sys,json;d=json.load(sys.stdin);print('仓库:', d['full_name'], '| 星标:', d['stargazers_count'], '| 默认分支:', d['default_branch'])"
git -c http.proxy= -c https.proxy= ls-remote "https://github.com/${GH_USER}/${REPO}.git" HEAD
echo "✅ 发布完成: https://github.com/${GH_USER}/${REPO}"
echo "✅ Pages: https://${GH_USER}.github.io/${REPO}/（首次部署需等 1-2 分钟生效）"
