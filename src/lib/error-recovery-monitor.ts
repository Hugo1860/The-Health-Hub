/**
 * Error Recovery Monitoring and Alerting
 * Monitors error recovery patterns and provides alerting capabilities
 */

import { ErrorRecovery } from './error-recovery';
import { DatabaseErrorRecovery } from './db-error-recovery';
import { ApiErrorRecovery } from './api-error-recovery';

interface ErrorMetrics {
  timestamp: string;
  operationName: string;
  errorType: string;
  errorMessage: string;
  retryAttempt: number;
  circuitBreakerState: string;
  duration: number;
}

interface AlertRule {
  name: string;
  condition: (metrics: ErrorMetrics[]) => boolean;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cooldown: number; // milliseconds
}

interface MonitoringStats {
  totalErrors: number;
  totalRetries: number;
  circuitBreakerTrips: number;
  averageRecoveryTime: number;
  errorsByType: Record<string, number>;
  errorsByOperation: Record<string, number>;
  recentErrors: ErrorMetrics[];
}

class ErrorRecoveryMonitor {
  private static instance: ErrorRecoveryMonitor;
  private metrics: ErrorMetrics[] = [];
  private alerts: Array<{ rule: AlertRule; lastTriggered: number }> = [];
  private maxMetricsHistory = 1000;
  private monitoringInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.setupDefaultAlertRules();
    this.startMonitoring();
  }

  static getInstance(): ErrorRecoveryMonitor {
    if (!ErrorRecoveryMonitor.instance) {
      ErrorRecoveryMonitor.instance = new ErrorRecoveryMonitor();
    }
    return ErrorRecoveryMonitor.instance;
  }

  /**
   * Record error recovery metrics
   */
  recordError(
    operationName: string,
    errorType: string,
    errorMessage: string,
    retryAttempt: number = 0,
    circuitBreakerState: string = 'CLOSED',
    duration: number = 0
  ): void {
    const metric: ErrorMetrics = {
      timestamp: new Date().toISOString(),
      operationName,
      errorType,
      errorMessage,
      retryAttempt,
      circuitBreakerState,
      duration
    };

    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }

    // Check alert rules
    this.checkAlertRules();

    // Log critical errors immediately
    if (retryAttempt > 2 || circuitBreakerState === 'OPEN') {
      console.error('Critical error recovery event:', metric);
    }
  }

  /**
   * Get comprehensive monitoring statistics
   */
  getStats(): MonitoringStats {
    const now = Date.now();
    const oneHourAgo = now - 3600000; // 1 hour
    const recentMetrics = this.metrics.filter(m => 
      new Date(m.timestamp).getTime() > oneHourAgo
    );

    const errorsByType: Record<string, number> = {};
    const errorsByOperation: Record<string, number> = {};
    let totalDuration = 0;
    let circuitBreakerTrips = 0;

    recentMetrics.forEach(metric => {
      errorsByType[metric.errorType] = (errorsByType[metric.errorType] || 0) + 1;
      errorsByOperation[metric.operationName] = (errorsByOperation[metric.operationName] || 0) + 1;
      totalDuration += metric.duration;
      
      if (metric.circuitBreakerState === 'OPEN') {
        circuitBreakerTrips++;
      }
    });

    return {
      totalErrors: recentMetrics.length,
      totalRetries: recentMetrics.filter(m => m.retryAttempt > 0).length,
      circuitBreakerTrips,
      averageRecoveryTime: recentMetrics.length > 0 ? totalDuration / recentMetrics.length : 0,
      errorsByType,
      errorsByOperation,
      recentErrors: recentMetrics.slice(-10) // Last 10 errors
    };
  }

  /**
   * Get health status based on error patterns
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    issues: string[];
    recommendations: string[];
  } {
    const stats = this.getStats();
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Check error rate
    if (stats.totalErrors > 50) {
      status = 'unhealthy';
      issues.push(`High error rate: ${stats.totalErrors} errors in the last hour`);
      recommendations.push('Investigate root cause of errors and consider scaling resources');
    } else if (stats.totalErrors > 20) {
      status = 'degraded';
      issues.push(`Elevated error rate: ${stats.totalErrors} errors in the last hour`);
      recommendations.push('Monitor error patterns and prepare for potential issues');
    }

    // Check circuit breaker trips
    if (stats.circuitBreakerTrips > 5) {
      status = 'unhealthy';
      issues.push(`Multiple circuit breaker trips: ${stats.circuitBreakerTrips}`);
      recommendations.push('Check external dependencies and database connectivity');
    } else if (stats.circuitBreakerTrips > 0) {
      if (status === 'healthy') status = 'degraded';
      issues.push(`Circuit breaker trips detected: ${stats.circuitBreakerTrips}`);
      recommendations.push('Monitor external service health');
    }

    // Check retry patterns
    const retryRate = stats.totalRetries / Math.max(stats.totalErrors, 1);
    if (retryRate > 0.8) {
      if (status === 'healthy') status = 'degraded';
      issues.push(`High retry rate: ${Math.round(retryRate * 100)}% of operations require retries`);
      recommendations.push('Investigate network stability and service reliability');
    }

    return { status, issues, recommendations };
  }

  /**
   * Add custom alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alerts.push({ rule, lastTriggered: 0 });
  }

  /**
   * Get system-wide error recovery statistics
   */
  getSystemStats() {
    return {
      errorRecovery: ErrorRecovery.getCircuitBreakerStats(),
      database: DatabaseErrorRecovery.getStats(),
      api: ApiErrorRecovery.getStats(),
      monitoring: this.getStats(),
      health: this.getHealthStatus()
    };
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics(): {
    prometheus: string;
    json: any;
  } {
    const stats = this.getStats();
    
    // Prometheus format
    const prometheus = [
      `# HELP error_recovery_total_errors Total number of errors in the last hour`,
      `# TYPE error_recovery_total_errors gauge`,
      `error_recovery_total_errors ${stats.totalErrors}`,
      ``,
      `# HELP error_recovery_total_retries Total number of retries in the last hour`,
      `# TYPE error_recovery_total_retries gauge`,
      `error_recovery_total_retries ${stats.totalRetries}`,
      ``,
      `# HELP error_recovery_circuit_breaker_trips Circuit breaker trips in the last hour`,
      `# TYPE error_recovery_circuit_breaker_trips gauge`,
      `error_recovery_circuit_breaker_trips ${stats.circuitBreakerTrips}`,
      ``,
      `# HELP error_recovery_average_recovery_time Average recovery time in milliseconds`,
      `# TYPE error_recovery_average_recovery_time gauge`,
      `error_recovery_average_recovery_time ${stats.averageRecoveryTime}`
    ].join('\n');

    return {
      prometheus,
      json: this.getSystemStats()
    };
  }

  private setupDefaultAlertRules(): void {
    // High error rate alert
    this.addAlertRule({
      name: 'high_error_rate',
      condition: (metrics) => {
        const recentErrors = metrics.filter(m => 
          Date.now() - new Date(m.timestamp).getTime() < 300000 // 5 minutes
        );
        return recentErrors.length > 20;
      },
      message: 'High error rate detected: More than 20 errors in 5 minutes',
      severity: 'high',
      cooldown: 300000 // 5 minutes
    });

    // Circuit breaker open alert
    this.addAlertRule({
      name: 'circuit_breaker_open',
      condition: (metrics) => {
        return metrics.some(m => m.circuitBreakerState === 'OPEN');
      },
      message: 'Circuit breaker is OPEN - service degradation detected',
      severity: 'critical',
      cooldown: 60000 // 1 minute
    });

    // Database error pattern alert
    this.addAlertRule({
      name: 'database_error_pattern',
      condition: (metrics) => {
        const dbErrors = metrics.filter(m => 
          m.operationName.includes('db-') && 
          Date.now() - new Date(m.timestamp).getTime() < 600000 // 10 minutes
        );
        return dbErrors.length > 10;
      },
      message: 'Database error pattern detected: Multiple database operations failing',
      severity: 'high',
      cooldown: 600000 // 10 minutes
    });
  }

  private checkAlertRules(): void {
    const now = Date.now();
    
    this.alerts.forEach(alert => {
      if (now - alert.lastTriggered < alert.rule.cooldown) {
        return; // Still in cooldown
      }

      if (alert.rule.condition(this.metrics)) {
        this.triggerAlert(alert.rule);
        alert.lastTriggered = now;
      }
    });
  }

  private triggerAlert(rule: AlertRule): void {
    const alertData = {
      name: rule.name,
      message: rule.message,
      severity: rule.severity,
      timestamp: new Date().toISOString(),
      stats: this.getStats()
    };

    // Log alert
    console.error(`ALERT [${rule.severity.toUpperCase()}]: ${rule.message}`, alertData);

    // In a real implementation, you would send this to your alerting system
    // Examples: PagerDuty, Slack, email, etc.
    this.sendAlert(alertData);
  }

  private sendAlert(alertData: any): void {
    // Placeholder for external alerting integration
    // This could send to Slack, email, PagerDuty, etc.
    
    if (process.env.SLACK_WEBHOOK_URL) {
      // Example Slack integration
      fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 ${alertData.message}`,
          attachments: [{
            color: alertData.severity === 'critical' ? 'danger' : 'warning',
            fields: [
              { title: 'Severity', value: alertData.severity, short: true },
              { title: 'Time', value: alertData.timestamp, short: true },
              { title: 'Total Errors', value: alertData.stats.totalErrors.toString(), short: true },
              { title: 'Circuit Breaker Trips', value: alertData.stats.circuitBreakerTrips.toString(), short: true }
            ]
          }]
        })
      }).catch(err => console.error('Failed to send Slack alert:', err));
    }
  }

  private startMonitoring(): void {
    // Monitor every 30 seconds
    this.monitoringInterval = setInterval(() => {
      const health = this.getHealthStatus();
      
      if (health.status !== 'healthy') {
        console.warn(`System health status: ${health.status}`, {
          issues: health.issues,
          recommendations: health.recommendations
        });
      }
    }, 30000);
  }

  /**
   * Stop monitoring (for cleanup)
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
}

// Create singleton instance
const errorRecoveryMonitor = ErrorRecoveryMonitor.getInstance();

export { ErrorRecoveryMonitor, errorRecoveryMonitor };
export type { ErrorMetrics, AlertRule, MonitoringStats };