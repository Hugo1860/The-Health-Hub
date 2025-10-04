import { NextResponse } from 'next/server';
import db from '@/lib/db';

// 简化的分类API，只返回必要字段，提高加载速度
export async function GET() {
  try {
    const query = `
      SELECT id, name, color, icon
      FROM categories 
      WHERE is_active = true 
      ORDER BY sort_order ASC, name ASC 
      LIMIT 10
    `;

    const result = await db.query(query);
    
    const categories = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      color: row.color || '#13C2C2',
      icon: row.icon || '📝'
    }));

    return NextResponse.json(categories);
  } catch (error) {
    console.error('获取简化分类失败:', error);
    
    // 返回默认分类
    const defaultCategories = [
      { id: 'cardiology', name: '心血管', color: '#ef4444', icon: '❤️' },
      { id: 'neurology', name: '神经科', color: '#8b5cf6', icon: '🧠' },
      { id: 'internal-medicine', name: '内科学', color: '#10b981', icon: '🏥' },
      { id: 'surgery', name: '外科', color: '#f59e0b', icon: '🔬' },
      { id: 'pediatrics', name: '儿科', color: '#3b82f6', icon: '👶' },
    ];
    
    return NextResponse.json(defaultCategories);
  }
}