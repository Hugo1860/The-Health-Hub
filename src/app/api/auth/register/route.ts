import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import bcrypt from 'bcryptjs'

const DATA_DIR = join(process.cwd(), 'data')
const USERS_FILE = join(DATA_DIR, 'users.json')

interface User {
  id: string
  username: string
  email: string
  password: string
  role: 'user' | 'admin'
  status: 'active' | 'inactive' | 'banned'
  createdAt: string
  lastLogin?: string
  preferences: {
    theme: 'light' | 'dark' | 'system'
    autoplay: boolean
    defaultPlaybackRate: number
    defaultVolume: number
  }
}

// 确保数据目录和用户文件存在
async function ensureDataStructure() {
  try {
    await mkdir(DATA_DIR, { recursive: true })
  } catch (error) {
    // 目录已存在
  }
  
  try {
    await readFile(USERS_FILE, 'utf-8')
  } catch (error) {
    // 如果文件不存在，创建空数组
    await writeFile(USERS_FILE, JSON.stringify([], null, 2))
  }
}

// 获取所有用户
async function getUsers(): Promise<User[]> {
  await ensureDataStructure()
  const data = await readFile(USERS_FILE, 'utf-8')
  return JSON.parse(data)
}

// 保存用户
async function saveUsers(users: User[]): Promise<void> {
  await writeFile(USERS_FILE, JSON.stringify(users, null, 2))
}

// 生成用户ID
function generateUserId(): string {
  return 'user-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
}

export async function POST(request: NextRequest) {
  try {
    const { username, email, password } = await request.json()
    
    // 验证输入
    if (!username || !email || !password) {
      return NextResponse.json(
        { error: '用户名、邮箱和密码都是必填项' },
        { status: 400 }
      )
    }
    
    if (password.length < 6) {
      return NextResponse.json(
        { error: '密码长度至少为6位' },
        { status: 400 }
      )
    }
    
    // 检查邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '邮箱格式不正确' },
        { status: 400 }
      )
    }
    
    const users = await getUsers()
    
    // 检查用户是否已存在
    const existingUser = users.find(user => user.email === email || user.username === username)
    if (existingUser) {
      return NextResponse.json(
        { error: '用户名或邮箱已存在' },
        { status: 409 }
      )
    }
    
    // 创建新用户
    const hashedPassword = await bcrypt.hash(password, 12)
    const newUser: User = {
      id: generateUserId(),
      username,
      email,
      password: hashedPassword,
      role: 'user',
      status: 'active',
      createdAt: new Date().toISOString(),
      preferences: {
        theme: 'light',
        autoplay: false,
        defaultPlaybackRate: 1,
        defaultVolume: 0.8
      }
    }
    
    users.push(newUser)
    await saveUsers(users)
    
    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = newUser
    
    return NextResponse.json({
      message: '用户注册成功',
      user: userWithoutPassword
    }, { status: 201 })
    
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: '注册失败，请稍后重试' },
      { status: 500 }
    )
  }
}