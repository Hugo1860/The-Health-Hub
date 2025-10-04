#!/usr/bin/env node

/**
 * Node.js 版本兼容性检查脚本
 * 检查当前 Node.js 版本是否满足项目要求
 */

const fs = require('fs');
const path = require('path');

// 读取 package.json 获取版本要求
const packageJsonPath = path.join(__dirname, '..', 'package.json');
let packageJson;

try {
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
} catch (error) {
    console.error('❌ 无法读取 package.json 文件');
    process.exit(1);
}

// 获取要求的 Node.js 版本
const requiredNodeVersion = packageJson.engines?.node;
const requiredNpmVersion = packageJson.engines?.npm;

if (!requiredNodeVersion) {
    console.log('✅ 没有找到 Node.js 版本要求，跳过检查');
    process.exit(0);
}

// 获取当前版本
const currentNodeVersion = process.version;
const nodeVersionMatch = currentNodeVersion.match(/^v(\d+)\.(\d+)\.(\d+)/);
const currentNpmVersion = require('child_process').execSync('npm --version', { encoding: 'utf8' }).trim();

if (!nodeVersionMatch) {
    console.error('❌ 无法解析当前 Node.js 版本:', currentNodeVersion);
    process.exit(1);
}

const [, currentMajor, currentMinor, currentPatch] = nodeVersionMatch.map(Number);

// 解析要求版本
const requiredVersionMatch = requiredNodeVersion.match(/>=?(\d+)\.(\d+)\.(\d+)/);
if (!requiredVersionMatch) {
    console.error('❌ 无法解析要求的 Node.js 版本:', requiredNodeVersion);
    process.exit(1);
}

const [, requiredMajor, requiredMinor, requiredPatch] = requiredVersionMatch.map(Number);

// 版本比较函数
function compareVersions(current, required) {
    if (current[0] > required[0]) return 1;
    if (current[0] < required[0]) return -1;
    if (current[1] > required[1]) return 1;
    if (current[1] < required[1]) return -1;
    if (current[2] > required[2]) return 1;
    if (current[2] < required[2]) return -1;
    return 0;
}

const currentVersion = [currentMajor, currentMinor, currentPatch];
const requiredVersion = [requiredMajor, requiredMinor, requiredPatch];
const versionComparison = compareVersions(currentVersion, requiredVersion);

console.log('🔍 Node.js 版本检查');
console.log('================================');
console.log(`📊 当前版本: ${currentNodeVersion}`);
console.log(`✅ 要求版本: ${requiredNodeVersion}`);
console.log(`📦 当前 npm: ${currentNpmVersion}`);

if (requiredNpmVersion) {
    console.log(`📦 要求 npm: ${requiredNpmVersion}`);
}

if (versionComparison >= 0) {
    console.log('✅ Node.js 版本兼容');
    console.log('🚀 可以继续安装依赖');
    process.exit(0);
} else {
    console.error('❌ Node.js 版本不兼容');
    console.error(`当前版本: ${currentNodeVersion}`);
    console.error(`要求版本: ${requiredNodeVersion}`);
    console.error('');
    console.error('请升级到 Node.js 18+ 版本');
    console.error('');
    console.error('升级方法:');
    console.error('1. 使用 nvm: nvm install 18 && nvm use 18');
    console.error('2. 或下载官方安装包: https://nodejs.org/');
    console.error('3. 或使用 Docker 环境');
    process.exit(1);
}
