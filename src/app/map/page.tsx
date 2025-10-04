'use client'

import dynamic from 'next/dynamic'
import { Typography } from 'antd'

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })
const { Title, Text } = Typography

export default function MapPage() {
  return (
    <div style={{ padding: 24 }}>
      <Title level={2} style={{ marginBottom: 8 }}>地图演示</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        需要在环境变量中设置 <code>NEXT_PUBLIC_MAPBOX_TOKEN</code>
      </Text>
      <MapView height={560} />
    </div>
  )
}


