#!/usr/bin/env bash

set -euo pipefail

# CN mirrors for dependencies and native binaries
export NPM_CONFIG_REGISTRY="https://registry.npmmirror.com"
export YARN_REGISTRY="https://registry.npmmirror.com"
export PNPM_REGISTRY="https://registry.npmmirror.com"

# Mirrors for popular native deps
export npm_config_sharp_binary_host="https://npmmirror.com/mirrors/sharp"
export SHARP_DIST_BASE_URL="https://npmmirror.com/mirrors/sharp"
export npm_config_esbuild_binary_host_mirror="https://npmmirror.com/mirrors/esbuild"
export ESBUILD_BINARY_MIRROR="https://npmmirror.com/mirrors/esbuild"

# Try to mirror Next.js swc download as well
export npm_config_@next:registry="https://registry.npmmirror.com"
export SWC_BINARY_HOST_MIRROR="https://npmmirror.com/mirrors/next-swc"
export NEXT_BINARY_HOST_MIRROR="https://npmmirror.com/mirrors/next-swc"

# better-sqlite3 often needs build-from-source in CN; set mirror if available and fall back to build
export npm_config_better_sqlite3_binary_host_mirror="https://npmmirror.com/mirrors/better-sqlite3"
export npm_config_build_from_source="true"

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$PROJECT_ROOT/dist"
PM="auto" # npm|yarn|pnpm
REBUILD_NATIVE="true"

usage() {
  cat <<EOF
用法: $(basename "$0") [选项]

选项:
  --pm <npm|yarn|pnpm>   指定包管理器 (默认: 自动检测)
  --no-rebuild-native    不强制重建原生依赖（如 better-sqlite3、sharp）
  --clean                清理 node_modules 和 .next 后再安装
  -h, --help             显示帮助

示例:
  $(basename "$0") --pm npm
  $(basename "$0") --clean
EOF
}

CLEAN="false"
for arg in "$@"; do
  case "$arg" in
    --pm)
      shift; PM="${1:-auto}"; shift || true ;;
    --no-rebuild-native)
      REBUILD_NATIVE="false"; shift ;;
    --clean)
      CLEAN="true"; shift ;;
    -h|--help)
      usage; exit 0 ;;
  esac
done

cd "$PROJECT_ROOT"

echo "[1/6] 检测 Node 与包管理器..."
command -v node >/dev/null 2>&1 || { echo "未检测到 Node.js，请先安装 Node.js >= 18"; exit 1; }
NODE_VER="$(node -v)"
echo "Node.js 版本: $NODE_VER"

detect_pm() {
  if [ "$PM" != "auto" ]; then echo "$PM"; return; fi
  if [ -f pnpm-lock.yaml ] && command -v pnpm >/dev/null 2>&1; then echo pnpm; return; fi
  if [ -f yarn.lock ] && command -v yarn >/dev/null 2>&1; then echo yarn; return; fi
  echo npm
}

PM_SELECTED="$(detect_pm)"
echo "包管理器: $PM_SELECTED (镜像源: $NPM_CONFIG_REGISTRY)"

if [ "$CLEAN" = "true" ]; then
  echo "[可选] 清理缓存与构建输出..."
  rm -rf node_modules .next .turbo || true
fi

echo "[2/6] 安装系统构建依赖 (如有) ..."
if command -v apt-get >/dev/null 2>&1; then
  sudo apt-get update -y
  sudo apt-get install -y build-essential python3 make g++
fi

echo "[3/6] 安装项目依赖（使用中国大陆镜像）..."
case "$PM_SELECTED" in
  npm)
    if [ -f package-lock.json ]; then
      npm ci --no-audit --no-fund
    else
      npm install --no-audit --no-fund
    fi
    ;;
  yarn)
    yarn install --frozen-lockfile || yarn install
    ;;
  pnpm)
    pnpm install --frozen-lockfile || pnpm install
    ;;
esac

if [ "$REBUILD_NATIVE" = "true" ]; then
  echo "[4/6] 重建原生模块以匹配当前 Node 版本 (如 better-sqlite3, sharp)..."
  case "$PM_SELECTED" in
    npm)
      npm rebuild better-sqlite3 sharp || true
      ;;
    yarn)
      yarn run node -e "console.log('skip explicit rebuild for yarn')" >/dev/null 2>&1 || true
      ;;
    pnpm)
      pnpm rebuild better-sqlite3 sharp || true
      ;;
  esac
fi

echo "[5/6] 构建 Next.js 产物..."
if [ -f package.json ]; then
  if grep -q '"build"' package.json; then
    npm run build || ( [ "$PM_SELECTED" != "npm" ] && $PM_SELECTED run build )
  else
    echo "package.json 中未定义 build 脚本" && exit 1
  fi
else
  echo "未找到 package.json" && exit 1
fi

echo "[6/6] 打包构建产物用于云端部署..."
mkdir -p "$DIST_DIR"
TS="$(date +%Y%m%d_%H%M%S)"
PKG_NAME="health-hub_${TS}.tar.gz"

if [ -d .next/standalone ]; then
  # Standalone 打包（推荐）
  tar -czf "$DIST_DIR/$PKG_NAME" \
    .next/standalone \
    .next/static \
    public \
    next.config.js \
    package.json \
    README.md \
    DEPLOYMENT.md 2>/dev/null || true
else
  # 常规打包（体积较大）
  tar -czf "$DIST_DIR/$PKG_NAME" \
    .next \
    public \
    node_modules \
    next.config.js \
    package.json \
    README.md \
    DEPLOYMENT.md 2>/dev/null || true
fi

echo "\n✅ 完成！打包文件: $DIST_DIR/$PKG_NAME"
echo "\n部署建议:"
cat <<'TIP'
1) 将压缩包上传至服务器后解压
2) 若使用 standalone：
   - cd .next/standalone
   - 设置环境变量（例如 NEXTAUTH_SECRET、NEXTAUTH_URL 等）
   - 启动：node server.js
   或使用 PM2：pm2 start server.js --name health-hub
3) 若使用常规打包：
   - npm run start 或 pm2 start npm --name "health-hub" -- start
TIP


