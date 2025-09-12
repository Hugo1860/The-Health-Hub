#!/usr/bin/env node

/**
 * Node.js 版本兼容性检查脚本
 * 确保使用的 Node.js 版本符合项目要求
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 颜色定义
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(level, message) {
  const color = colors[level] || colors.reset;
  console.log(`${color}[${level.toUpperCase()}]${colors.reset} ${message}`);
}

function checkNodeVersion() {
  const currentVersion = process.version;
  const currentMajor = parseInt(currentVersion.slice(1).split('.')[0]);
  
  log('info', `当前 Node.js 版本: ${currentVersion}`);
  
  // 读取 package.json 中的引擎要求
  let requiredVersion = '22.0.0';
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (packageJson.engines && packageJson.engines.node) {
        requiredVersion = packageJson.engines.node.replace('>=', '');
      }
    }
  } catch (error) {
    log('yellow', '无法读取 package.json，使用默认版本要求');
  }
  
  const requiredMajor = parseInt(requiredVersion.split('.')[0]);
  
  if (currentMajor >= requiredMajor) {
    log('green', `✅ Node.js 版本检查通过 (需要: >=${requiredVersion}, 当前: ${currentVersion})`);
    return true;
  } else {
    log('red', `❌ Node.js 版本不符合要求`);
    log('red', `   需要: >=${requiredVersion}`);
    log('red', `   当前: ${currentVersion}`);
    log('yellow', '');
    log('yellow', '请升级 Node.js 版本:');
    log('yellow', '  使用 nvm: nvm install 22 && nvm use 22');
    log('yellow', '  或访问: https://nodejs.org/');
    return false;
  }
}

function checkNpmVersion() {
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    const npmMajor = parseInt(npmVersion.split('.')[0]);
    
    log('info', `当前 npm 版本: ${npmVersion}`);
    
    if (npmMajor >= 10) {
      log('green', '✅ npm 版本检查通过');
      return true;
    } else {
      log('yellow', `⚠️  npm 版本较低 (当前: ${npmVersion}, 推荐: >=10.0.0)`);
      log('yellow', '建议升级: npm install -g npm@latest');
      return true; // 不阻止安装，只是警告
    }
  } catch (error) {
    log('red', '❌ 无法检查 npm 版本');
    return false;
  }
}

function main() {
  log('blue', '🏥 健闻局 - Node.js 兼容性检查');
  log('blue', '================================');
  
  const nodeCheck = checkNodeVersion();
  const npmCheck = checkNpmVersion();
  
  if (nodeCheck && npmCheck) {
    log('green', '🎉 所有兼容性检查通过！');
    process.exit(0);
  } else {
    log('red', '❌ 兼容性检查失败，请解决上述问题后重试');
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  checkNodeVersion,
  checkNpmVersion
};