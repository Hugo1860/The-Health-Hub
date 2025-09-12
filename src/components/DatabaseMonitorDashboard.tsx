'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Database, 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw, 
  Clock,
  HardDrive,
  Zap,
  TrendingUp
} from 'lucide-react';

interface DatabaseHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  database: {
    connected: boolean;
    healthy: boolean;
    path: string;
    fileExists: boolean;
    connectionAttempts: number;
    lastHealthCheck: number;
    tablesCount?: number;
    tableInfo?: Record<string, number>;
    error?: string;
    config: {
      retryAttempts: number;
      connectionTimeout: number;
      healthCheckInterval: number;
    };
  };
  performance: {
    responseTime: number;
    databaseResponseTime?: number;
    memoryUsage?: NodeJS.MemoryUsage;
  };
  environment: {
    nodeVersion: string;
    platform: string;
    arch: string;
    cwd: string;
    nodeEnv?: string;
    uptime: number;
  };
}

interface ConnectionPoolStats {
  initialized: boolean;
  activeConnections: number;
  totalConnections: number;
  waitingRequests: number;
  stats: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    peakConnections: number;
  };
}

export default function DatabaseMonitorDashboard() {
  const [healthData, setHealthData] = useState<DatabaseHealth | null>(null);
  const [poolStats, setPoolStats] = useState<ConnectionPoolStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchHealthData = async () => {
    try {
      setError(null);
      
      // 获取数据库健康状态
      const healthResponse = await fetch('/api/health/database');
      const healthResult = await healthResponse.json();
      
      if (healthResult.success) {
        setHealthData(healthResult.data.data);
      } else {
        throw new Error(healthResult.error || 'Failed to fetch health data');
      }

      // 获取连接池统计
      const poolResponse = await fetch('/api/health/connection-pool');
      const poolResult = await poolResponse.json();
      
      if (poolResult.success) {
        setPoolStats(poolResult.data);
      }

      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const forceReconnect = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/health/database', { method: 'POST' });
      const result = await response.json();
      
      if (result.success) {
        await fetchHealthData();
      } else {
        throw new Error(result.error || 'Reconnection failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reconnection failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchHealthData, 30000); // 30秒刷新
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'unhealthy': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'degraded': return <AlertCircle className="h-4 w-4" />;
      case 'unhealthy': return <AlertCircle className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  if (loading && !healthData) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Loading database status...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Database className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Database Monitor</h2>
          {healthData && (
            <Badge className={getStatusColor(healthData.status)}>
              {healthData.status.toUpperCase()}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className={`h-4 w-4 mr-1 ${autoRefresh ? 'animate-pulse' : ''}`} />
            Auto Refresh: {autoRefresh ? 'ON' : 'OFF'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={fetchHealthData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button
            variant="destructive"
            size="sm"
            onClick={forceReconnect}
            disabled={loading}
          >
            <Zap className="h-4 w-4 mr-1" />
            Reconnect
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Last Update */}
      {lastUpdate && (
        <div className="text-sm text-gray-500 flex items-center">
          <Clock className="h-4 w-4 mr-1" />
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      )}

      {healthData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Database Status */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Database Status</CardTitle>
              {getStatusIcon(healthData.status)}
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Connected:</span>
                  <Badge variant={healthData.database.connected ? 'default' : 'destructive'}>
                    {healthData.database.connected ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Healthy:</span>
                  <Badge variant={healthData.database.healthy ? 'default' : 'destructive'}>
                    {healthData.database.healthy ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">File Exists:</span>
                  <Badge variant={healthData.database.fileExists ? 'default' : 'destructive'}>
                    {healthData.database.fileExists ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Tables:</span>
                  <span className="text-sm font-mono">{healthData.database.tablesCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Attempts:</span>
                  <span className="text-sm font-mono">{healthData.database.connectionAttempts}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Performance</CardTitle>
              <TrendingUp className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Response Time:</span>
                  <span className="text-sm font-mono">{healthData.performance.responseTime}ms</span>
                </div>
                {healthData.performance.databaseResponseTime && (
                  <div className="flex justify-between">
                    <span className="text-sm">DB Response:</span>
                    <span className="text-sm font-mono">{healthData.performance.databaseResponseTime}ms</span>
                  </div>
                )}
                {healthData.performance.memoryUsage && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm">Memory (RSS):</span>
                      <span className="text-sm font-mono">{formatBytes(healthData.performance.memoryUsage.rss)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Memory (Heap):</span>
                      <span className="text-sm font-mono">{formatBytes(healthData.performance.memoryUsage.heapUsed)}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Environment Info */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Environment</CardTitle>
              <HardDrive className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Node Version:</span>
                  <span className="text-sm font-mono">{healthData.environment.nodeVersion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Platform:</span>
                  <span className="text-sm font-mono">{healthData.environment.platform}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Architecture:</span>
                  <span className="text-sm font-mono">{healthData.environment.arch}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Environment:</span>
                  <span className="text-sm font-mono">{healthData.environment.nodeEnv || 'development'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Uptime:</span>
                  <span className="text-sm font-mono">{formatUptime(healthData.environment.uptime)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Database Tables */}
          {healthData.database.tableInfo && (
            <Card className="md:col-span-2 lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Table Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {Object.entries(healthData.database.tableInfo).map(([table, count]) => (
                    <div key={table} className="text-center p-2 border rounded">
                      <div className="text-sm font-medium">{table}</div>
                      <div className="text-lg font-bold">{count}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Connection Pool Stats */}
          {poolStats && poolStats.initialized && (
            <Card className="md:col-span-2 lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Connection Pool</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Active</div>
                    <div className="text-lg font-bold">{poolStats.activeConnections}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Total</div>
                    <div className="text-lg font-bold">{poolStats.totalConnections}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Waiting</div>
                    <div className="text-lg font-bold">{poolStats.waitingRequests}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Success Rate</div>
                    <div className="text-lg font-bold">
                      {poolStats.stats.totalRequests > 0 
                        ? Math.round((poolStats.stats.successfulRequests / poolStats.stats.totalRequests) * 100)
                        : 0}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Avg Response</div>
                    <div className="text-lg font-bold">{Math.round(poolStats.stats.averageResponseTime)}ms</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Database Configuration */}
          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Database Path</div>
                  <div className="text-sm font-mono break-all">{healthData.database.path}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Retry Attempts</div>
                  <div className="text-sm font-mono">{healthData.database.config.retryAttempts}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Connection Timeout</div>
                  <div className="text-sm font-mono">{healthData.database.config.connectionTimeout}ms</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Health Check Interval</div>
                  <div className="text-sm font-mono">{healthData.database.config.healthCheckInterval}ms</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Working Directory</div>
                  <div className="text-sm font-mono break-all">{healthData.environment.cwd}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Information */}
          {healthData.database.error && (
            <Card className="md:col-span-2 lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-red-600">Database Error</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="font-mono text-sm">
                    {healthData.database.error}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}