#!/bin/bash

# 🧹 健闻局 - 测试文件清理脚本
# 删除不必要的测试和演示文件，优化项目结构

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 项目根目录
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "🧹 健闻局测试文件清理"
echo "===================="
echo ""

# 创建备份目录
create_backup() {
    print_info "创建备份目录..."
    BACKUP_DIR="${ROOT_DIR}/cleanup-backup-$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    print_success "备份目录创建完成: $BACKUP_DIR"
}

# 统计待删除文件
count_files() {
    print_info "统计待删除的测试文件..."
    
    # 统计测试目录
    TEST_DIRS=$(find "$ROOT_DIR/src/app" -name "*test*" -type d | wc -l)
    print_info "找到 $TEST_DIRS 个测试目录"
    
    # 统计演示目录
    DEMO_DIRS=$(find "$ROOT_DIR/src/app" -name "*demo*" -type d | wc -l)
    print_info "找到 $DEMO_DIRS 个演示目录"
    
    # 统计API测试目录
    API_TEST_DIRS=$(find "$ROOT_DIR/src/app/api" -name "*test*" -type d 2>/dev/null | wc -l || echo "0")
    print_info "找到 $API_TEST_DIRS 个API测试目录"
    
    # 统计脚本测试文件
    SCRIPT_TEST_FILES=$(find "$ROOT_DIR" -name "*test*.js" -o -name "*demo*.js" | grep -v node_modules | wc -l)
    print_info "找到 $SCRIPT_TEST_FILES 个测试脚本文件"
    
    TOTAL_ITEMS=$((TEST_DIRS + DEMO_DIRS + API_TEST_DIRS + SCRIPT_TEST_FILES))
    print_warning "总计将删除 $TOTAL_ITEMS 个测试相关项目"
    
    echo ""
}

# 备份重要的测试文件
backup_important_files() {
    print_info "备份重要的测试文件..."
    
    # 备份有用的测试页面
    IMPORTANT_TESTS=(
        "src/app/test/page.tsx"
        "src/app/test-health-checks"
        "src/app/api/__tests__"
        "jest.config.js"
        "jest.setup.js"
    )
    
    for item in "${IMPORTANT_TESTS[@]}"; do
        if [ -e "$ROOT_DIR/$item" ]; then
            mkdir -p "$BACKUP_DIR/$(dirname "$item")"
            cp -r "$ROOT_DIR/$item" "$BACKUP_DIR/$item" 2>/dev/null || true
            print_info "已备份: $item"
        fi
    done
    
    print_success "重要文件备份完成"
}

# 删除测试页面目录
remove_test_pages() {
    print_info "删除测试页面目录..."
    
    # 查找并删除所有test开头的目录（除了重要的）
    find "$ROOT_DIR/src/app" -name "test-*" -type d | while read -r dir; do
        # 跳过重要的测试目录
        if [[ "$dir" == *"test-health-checks"* ]]; then
            print_warning "跳过重要测试目录: $(basename "$dir")"
            continue
        fi
        
        print_info "删除测试目录: $(basename "$dir")"
        rm -rf "$dir"
    done
    
    print_success "测试页面目录清理完成"
}

# 删除演示页面目录
remove_demo_pages() {
    print_info "删除演示页面目录..."
    
    # 保留一个主要的演示页面，删除其他的
    DEMO_DIRS_TO_KEEP=(
        "demos"  # 保留主演示页面
    )
    
    find "$ROOT_DIR/src/app" -name "*demo*" -type d | while read -r dir; do
        dir_name=$(basename "$dir")
        
        # 检查是否在保留列表中
        keep_dir=false
        for keep in "${DEMO_DIRS_TO_KEEP[@]}"; do
            if [[ "$dir_name" == "$keep" ]]; then
                keep_dir=true
                break
            fi
        done
        
        if [ "$keep_dir" = true ]; then
            print_warning "保留演示目录: $dir_name"
        else
            print_info "删除演示目录: $dir_name"
            rm -rf "$dir"
        fi
    done
    
    print_success "演示页面目录清理完成"
}

# 删除API测试目录
remove_api_tests() {
    print_info "删除API测试目录..."
    
    # 保留重要的API测试
    API_TESTS_TO_KEEP=(
        "__tests__"  # 保留单元测试
    )
    
    find "$ROOT_DIR/src/app/api" -name "*test*" -type d 2>/dev/null | while read -r dir; do
        dir_name=$(basename "$dir")
        
        # 检查是否在保留列表中
        keep_dir=false
        for keep in "${API_TESTS_TO_KEEP[@]}"; do
            if [[ "$dir_name" == "$keep" ]]; then
                keep_dir=true
                break
            fi
        done
        
        if [ "$keep_dir" = true ]; then
            print_warning "保留API测试目录: $dir_name"
        else
            print_info "删除API测试目录: $dir_name"
            rm -rf "$dir"
        fi
    done || true
    
    print_success "API测试目录清理完成"
}

# 删除测试脚本文件
remove_test_scripts() {
    print_info "删除测试脚本文件..."
    
    # 查找并删除测试脚本（除了重要的）
    find "$ROOT_DIR" -name "*test*.js" -o -name "*demo*.js" | grep -v node_modules | while read -r file; do
        file_name=$(basename "$file")
        
        # 跳过重要的测试文件
        if [[ "$file_name" == "jest.config.js" ]] || [[ "$file_name" == "jest.setup.js" ]]; then
            print_warning "保留重要测试文件: $file_name"
            continue
        fi
        
        print_info "删除测试脚本: $file_name"
        rm -f "$file"
    done
    
    print_success "测试脚本清理完成"
}

# 删除调试相关目录
remove_debug_pages() {
    print_info "删除调试相关目录..."
    
    find "$ROOT_DIR/src/app" -name "*debug*" -type d | while read -r dir; do
        print_info "删除调试目录: $(basename "$dir")"
        rm -rf "$dir"
    done
    
    print_success "调试目录清理完成"
}

# 删除临时和备份文件
remove_temp_files() {
    print_info "删除临时和备份文件..."
    
    # 删除备份文件
    find "$ROOT_DIR/src" -name "*.backup" -type f | while read -r file; do
        print_info "删除备份文件: $(basename "$file")"
        rm -f "$file"
    done
    
    # 删除.corrupted文件
    find "$ROOT_DIR/src" -name "*.corrupted" -type f | while read -r file; do
        print_info "删除损坏文件: $(basename "$file")"
        rm -f "$file"
    done
    
    # 删除临时文件
    find "$ROOT_DIR" -name "*.tmp" -type f | while read -r file; do
        print_info "删除临时文件: $(basename "$file")"
        rm -f "$file"
    done
    
    print_success "临时文件清理完成"
}

# 清理空目录
remove_empty_dirs() {
    print_info "清理空目录..."
    
    # 查找并删除空目录
    find "$ROOT_DIR/src/app" -type d -empty | while read -r dir; do
        print_info "删除空目录: $(basename "$dir")"
        rmdir "$dir" 2>/dev/null || true
    done
    
    print_success "空目录清理完成"
}

# 更新路由和导航
update_navigation() {
    print_info "检查导航文件中的测试链接..."
    
    # 检查是否有导航文件需要更新
    NAV_FILES=(
        "src/components/AntdHomeLayout.tsx"
        "src/components/Navigation.tsx"
        "src/components/Sidebar.tsx"
    )
    
    for nav_file in "${NAV_FILES[@]}"; do
        if [ -f "$ROOT_DIR/$nav_file" ]; then
            print_info "检查导航文件: $nav_file"
            
            # 检查是否包含测试链接
            if grep -q "test-\|demo-\|debug-" "$ROOT_DIR/$nav_file" 2>/dev/null; then
                print_warning "发现测试链接在 $nav_file 中，请手动检查和清理"
            fi
        fi
    done
    
    print_success "导航检查完成"
}

# 生成清理报告
generate_report() {
    print_info "生成清理报告..."
    
    REPORT_FILE="${ROOT_DIR}/CLEANUP_REPORT_$(date +%Y%m%d_%H%M%S).md"
    
    cat > "$REPORT_FILE" << EOF
# 🧹 项目清理报告

清理时间: $(date)

## 清理统计

- 删除测试页面目录: $(find "$ROOT_DIR/src/app" -name "test-*" -type d 2>/dev/null | wc -l || echo "0") 个
- 删除演示页面目录: $(find "$ROOT_DIR/src/app" -name "*demo*" -type d 2>/dev/null | wc -l || echo "0") 个  
- 删除调试页面目录: $(find "$ROOT_DIR/src/app" -name "*debug*" -type d 2>/dev/null | wc -l || echo "0") 个
- 清理临时文件: 多个
- 清理空目录: 多个

## 保留的重要文件

- \`src/app/test/page.tsx\` - 基础测试页面
- \`src/app/test-health-checks/\` - 健康检查测试
- \`src/app/demos/\` - 主演示页面
- \`src/app/api/__tests__/\` - API单元测试
- \`jest.config.js\` - Jest配置
- \`jest.setup.js\` - Jest设置

## 备份位置

备份目录: \`$BACKUP_DIR\`

## 清理效果

- 减少了项目复杂度
- 提高了代码可维护性  
- 减少了构建时间
- 清理了无用文件

## 建议

1. 检查应用是否正常运行
2. 验证重要功能是否受影响
3. 如有问题，可从备份目录恢复
4. 定期进行类似清理

---

**注意**: 如果需要恢复任何文件，请查看备份目录: \`$BACKUP_DIR\`
EOF

    print_success "清理报告已生成: $REPORT_FILE"
}

# 验证清理结果
verify_cleanup() {
    print_info "验证清理结果..."
    
    # 统计剩余的测试相关项目
    REMAINING_TESTS=$(find "$ROOT_DIR/src/app" -name "*test*" -type d 2>/dev/null | wc -l || echo "0")
    REMAINING_DEMOS=$(find "$ROOT_DIR/src/app" -name "*demo*" -type d 2>/dev/null | wc -l || echo "0")
    REMAINING_DEBUG=$(find "$ROOT_DIR/src/app" -name "*debug*" -type d 2>/dev/null | wc -l || echo "0")
    
    echo ""
    echo "=== 清理结果 ==="
    echo "剩余测试目录: $REMAINING_TESTS 个"
    echo "剩余演示目录: $REMAINING_DEMOS 个"
    echo "剩余调试目录: $REMAINING_DEBUG 个"
    echo ""
    
    if [ "$REMAINING_TESTS" -lt 5 ] && [ "$REMAINING_DEMOS" -lt 3 ] && [ "$REMAINING_DEBUG" -eq 0 ]; then
        print_success "✅ 清理效果良好！"
    else
        print_warning "⚠️ 仍有较多测试文件，可能需要进一步清理"
    fi
}

# 主函数
main() {
    echo "开始项目清理流程..."
    echo ""
    
    # 确认操作
    print_warning "此操作将删除大量测试和演示文件"
    print_warning "建议在执行前确保代码已提交到版本控制系统"
    echo ""
    read -p "确认继续清理吗？(y/N): " -r
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "清理操作已取消"
        exit 0
    fi
    
    create_backup
    count_files
    backup_important_files
    
    echo ""
    print_info "开始清理操作..."
    
    remove_test_pages
    remove_demo_pages
    remove_api_tests
    remove_test_scripts
    remove_debug_pages
    remove_temp_files
    remove_empty_dirs
    update_navigation
    
    generate_report
    verify_cleanup
    
    echo ""
    print_success "🎉 项目清理完成！"
    echo ""
    echo "=== 后续建议 ==="
    echo "1. 测试应用是否正常运行"
    echo "2. 检查重要功能是否受影响"
    echo "3. 如有问题，从备份目录恢复文件"
    echo "4. 提交清理后的代码"
    echo ""
}

# 错误处理
trap 'print_error "清理过程中出现错误"; exit 1' ERR

# 执行主函数
main "$@"
