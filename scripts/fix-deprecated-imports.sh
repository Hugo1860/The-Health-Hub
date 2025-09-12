#!/bin/bash

# 修复已弃用模块的导入错误

set -e

echo "🔧 Fixing deprecated imports..."

# 需要更新的文件和它们的导入替换
declare -A IMPORT_REPLACEMENTS=(
    ["@/lib/db-robust"]="@/lib/database"
    ["@/lib/monitoring-storage"]="@/lib/database"
    ["@/lib/OptimizedDatabase"]="@/lib/database"
    ["@/lib/QueryAnalyzer"]="@/lib/database"
    ["./OptimizedDatabase"]="../database"
    ["./monitoring-storage"]="./database"
    ["./db-robust"]="./database"
)

# 查找所有包含已弃用导入的文件
echo "📋 Scanning for deprecated imports..."

for old_import in "${!IMPORT_REPLACEMENTS[@]}"; do
    new_import="${IMPORT_REPLACEMENTS[$old_import]}"
    
    echo "🔄 Replacing '$old_import' with '$new_import'"
    
    # 查找并替换导入语句
    find src/ -name "*.ts" -type f -exec grep -l "$old_import" {} \; | while read file; do
        echo "   📝 Updating $file"
        
        # 备份原文件
        cp "$file" "$file.backup"
        
        # 替换导入语句
        sed -i.tmp "s|from '$old_import'|from '$new_import'|g" "$file"
        sed -i.tmp "s|from \"$old_import\"|from \"$new_import\"|g" "$file"
        
        # 清理临时文件
        rm -f "$file.tmp"
    done
done

echo ""
echo "🧹 Creating stub files for deprecated modules..."

# 为已弃用的模块创建存根文件
DEPRECATED_MODULES=(
    "src/lib/monitoring-storage.ts"
    "src/lib/OptimizedDatabase.ts"
    "src/lib/QueryAnalyzer.ts"
)

for module in "${DEPRECATED_MODULES[@]}"; do
    if [ ! -f "$module" ] || [ ! -f "${module}.deprecated" ]; then
        echo "📄 Creating stub for $module"
        
        cat > "$module" << EOF
// ⚠️ DEPRECATED: This module has been deprecated
// Please use the PostgreSQL implementation in src/lib/database.ts instead

console.warn('Warning: ${module} is deprecated. Use src/lib/database.ts instead.');

// Export empty objects to prevent import errors
export const monitoringStorage = null;
export const optimizedDb = null;
export const queryAnalyzer = null;

export default null;
EOF
    fi
done

echo ""
echo "🔍 Checking for remaining issues..."

# 检查是否还有better-sqlite3的引用
SQLITE_REFS=$(grep -r "better-sqlite3" src/ --include="*.ts" 2>/dev/null || true)
if [ -n "$SQLITE_REFS" ]; then
    echo "⚠️  Found remaining SQLite references:"
    echo "$SQLITE_REFS"
else
    echo "✅ No SQLite references found"
fi

# 检查是否还有已弃用模块的导入
DEPRECATED_IMPORTS=$(grep -r "from.*db-robust\|from.*monitoring-storage\|from.*OptimizedDatabase" src/ --include="*.ts" 2>/dev/null || true)
if [ -n "$DEPRECATED_IMPORTS" ]; then
    echo "⚠️  Found remaining deprecated imports:"
    echo "$DEPRECATED_IMPORTS"
else
    echo "✅ No deprecated imports found"
fi

echo ""
echo "✅ Import fixes completed!"
echo ""
echo "📋 Next steps:"
echo "1. Test the build: npm run build"
echo "2. Run the application: npm run dev"
echo "3. If issues persist, check the backup files (*.backup)"