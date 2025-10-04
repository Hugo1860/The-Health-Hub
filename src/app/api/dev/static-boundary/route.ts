import { NextResponse } from 'next/server';

// 这个 API 只在开发环境中可用
export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({
      success: false,
      error: 'This endpoint is only available in development mode'
    }, { status: 404 });
  }

  try {
    // 在服务端，我们无法直接访问客户端的 StaticBoundaryChecker
    // 但我们可以提供一些静态边界检查的指导信息
    const guidelines = {
      staticComponents: {
        description: '静态组件应该避免使用动态上下文',
        rules: [
          '不要在静态组件中使用 React Context',
          '不要在静态组件中使用浏览器特定的 API',
          '使用 withStaticBoundary 包装器来检测违规',
          '使用 safeUseContext 替代直接的 useContext'
        ],
        examples: {
          good: `
// ✅ 正确的静态组件
function StaticComponent({ data }) {
  return <div>{data.title}</div>;
}

// ✅ 使用静态边界包装器
const SafeStaticComponent = withStaticBoundary(StaticComponent);
          `,
          bad: `
// ❌ 错误的静态组件
function BadStaticComponent() {
  const theme = useContext(ThemeContext); // 违规！
  return <div>{theme.color}</div>;
}
          `
        }
      },
      dynamicComponents: {
        description: '动态组件可以使用上下文和浏览器 API',
        rules: [
          '使用 "use client" 指令标记动态组件',
          '可以安全地使用 React Context',
          '可以使用浏览器 API 和 DOM 操作',
          '使用 ClientOnly 组件避免 SSR 水合问题'
        ],
        examples: {
          good: `
// ✅ 正确的动态组件
'use client';

function DynamicComponent() {
  const theme = useContext(ThemeContext); // 安全
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) return null;
  
  return <div style={{ color: theme.color }}>Dynamic content</div>;
}
          `
        }
      },
      boundaryComponents: {
        description: '边界组件用于分离静态和动态内容',
        components: [
          'ClientOnly - 只在客户端渲染',
          'StaticDynamicBoundary - 分离静态和动态内容',
          'withStaticBoundary - 静态组件包装器'
        ],
        examples: {
          clientOnly: `
// ✅ 使用 ClientOnly 避免水合问题
<ClientOnly fallback={<div>Loading...</div>}>
  <DynamicComponent />
</ClientOnly>
          `,
          boundary: `
// ✅ 使用边界组件
<StaticDynamicBoundary
  staticData={<StaticContent data={data} />}
  dynamicContent={() => <DynamicContent />}
  fallback={<div>Loading...</div>}
/>
          `
        }
      },
      commonViolations: [
        {
          violation: 'useContext in static component',
          solution: 'Use safeUseContext or move to dynamic component'
        },
        {
          violation: 'localStorage access in static component',
          solution: 'Use useStaticSafeLocalStorage or ClientOnly wrapper'
        },
        {
          violation: 'window object access in static component',
          solution: 'Check typeof window !== "undefined" or use ClientOnly'
        },
        {
          violation: 'Event listeners in static component',
          solution: 'Move to useEffect in dynamic component'
        }
      ],
      tools: {
        hooks: [
          'useStaticSafeState - 静态安全的 useState',
          'useStaticSafeEffect - 静态安全的 useEffect',
          'useClientMounted - 检查是否已挂载',
          'useStaticSafeLocalStorage - 安全的本地存储',
          'useStaticSafeMediaQuery - 安全的媒体查询'
        ],
        components: [
          'ClientOnly - 客户端专用组件',
          'StaticBoundaryDevTools - 开发工具',
          'StaticDynamicBoundary - 边界组件'
        ],
        utilities: [
          'withStaticBoundary - 静态边界包装器',
          'safeUseContext - 安全的上下文消费',
          'isStaticContext - 检查静态上下文',
          'StaticBoundaryChecker - 违规检查器'
        ]
      }
    };

    return NextResponse.json({
      success: true,
      data: {
        message: 'Static Boundary Guidelines',
        guidelines,
        timestamp: new Date().toISOString(),
        environment: 'development'
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, {
      status: 500
    });
  }
}

// POST 端点用于接收客户端的违规报告
export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({
      success: false,
      error: 'This endpoint is only available in development mode'
    }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { violations, summary } = body;

    // 在开发环境中记录违规信息
    console.group('🚨 Static Boundary Violations Report');
    console.log('Summary:', summary);
    console.log('Recent violations:', violations?.slice(-5));
    console.groupEnd();

    // 可以在这里添加更多的处理逻辑，比如：
    // - 保存到文件
    // - 发送到监控系统
    // - 触发警报

    return NextResponse.json({
      success: true,
      message: 'Violations report received',
      processed: {
        totalViolations: violations?.length || 0,
        recentViolations: summary?.recent?.length || 0,
        affectedComponents: Object.keys(summary?.byComponent || {}).length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Invalid request body',
      timestamp: new Date().toISOString(),
    }, {
      status: 400
    });
  }
}