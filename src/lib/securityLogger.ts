import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { SECURITY_CONFIG } from './securityConfig';

interface SecurityEvent {
  id: string;
  timestamp: string;
  type: 'RATE_LIMIT_EXCEEDED' | 'INVALID_INPUT' | 'UNAUTHORIZED_ACCESS' | 'CSRF_VIOLATION' | 'FILE_UPLOAD_VIOLATION' | 'SUSPICIOUS_ACTIVITY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  ip: string;
  userAgent?: string;
  userId?: string;
  endpoint: string;
  details: Record<string, any>;
  action?: string;
}

class SecurityLogger {
  private logPath: string;
  private maxLogEntries: number;

  constructor() {
    this.logPath = join(process.cwd(), 'logs', 'security.json');
    this.maxLogEntries = SECURITY_CONFIG.LOGGING.maxLogEntries;
    this.ensureLogDirectory();
  }

  private async ensureLogDirectory() {
    const logDir = join(process.cwd(), 'logs');
    if (!existsSync(logDir)) {
      await mkdir(logDir, { recursive: true });
    }
  }

  private generateEventId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private async readLogs(): Promise<SecurityEvent[]> {
    try {
      if (!existsSync(this.logPath)) {
        return [];
      }
      const data = await readFile(this.logPath, 'utf8');
      const logs = JSON.parse(data);
      return Array.isArray(logs) ? logs : [];
    } catch (error) {
      console.error('Failed to read security logs:', error);
      return [];
    }
  }

  private async writeLogs(logs: SecurityEvent[]): Promise<void> {
    try {
      // 限制日志条目数量
      if (logs.length > this.maxLogEntries) {
        logs = logs.slice(-this.maxLogEntries);
      }
      await writeFile(this.logPath, JSON.stringify(logs, null, 2));
    } catch (error) {
      console.error('Failed to write security logs:', error);
    }
  }

  async logEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void> {
    if (!SECURITY_CONFIG.LOGGING.logSecurityEvents) {
      return;
    }

    const securityEvent: SecurityEvent = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      ...event,
    };

    try {
      const logs = await this.readLogs();
      logs.push(securityEvent);
      await this.writeLogs(logs);

      // 在控制台输出高严重性事件
      if (event.severity === 'HIGH' || event.severity === 'CRITICAL') {
        console.warn(`[SECURITY ${event.severity}] ${event.type}:`, {
          ip: event.ip,
          endpoint: event.endpoint,
          details: event.details,
        });
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  async logRateLimitExceeded(ip: string, endpoint: string, userAgent?: string, userId?: string): Promise<void> {
    if (!SECURITY_CONFIG.LOGGING.logRateLimitExceeded) {
      return;
    }

    await this.logEvent({
      type: 'RATE_LIMIT_EXCEEDED',
      severity: 'MEDIUM',
      ip,
      userAgent,
      userId,
      endpoint,
      details: {
        message: 'Rate limit exceeded',
        timestamp: new Date().toISOString(),
      },
      action: 'REQUEST_BLOCKED',
    });
  }

  async logInvalidInput(ip: string, endpoint: string, errors: any[], userAgent?: string, userId?: string): Promise<void> {
    await this.logEvent({
      type: 'INVALID_INPUT',
      severity: 'LOW',
      ip,
      userAgent,
      userId,
      endpoint,
      details: {
        validationErrors: errors,
        message: 'Invalid input detected',
      },
      action: 'INPUT_REJECTED',
    });
  }

  async logUnauthorizedAccess(ip: string, endpoint: string, reason: string, userAgent?: string, userId?: string): Promise<void> {
    await this.logEvent({
      type: 'UNAUTHORIZED_ACCESS',
      severity: 'HIGH',
      ip,
      userAgent,
      userId,
      endpoint,
      details: {
        reason,
        message: 'Unauthorized access attempt',
      },
      action: 'ACCESS_DENIED',
    });
  }

  async logCSRFViolation(ip: string, endpoint: string, userAgent?: string, userId?: string): Promise<void> {
    await this.logEvent({
      type: 'CSRF_VIOLATION',
      severity: 'HIGH',
      ip,
      userAgent,
      userId,
      endpoint,
      details: {
        message: 'CSRF token validation failed',
      },
      action: 'REQUEST_BLOCKED',
    });
  }

  async logFileUploadViolation(ip: string, endpoint: string, violation: string, fileInfo: any, userAgent?: string, userId?: string): Promise<void> {
    await this.logEvent({
      type: 'FILE_UPLOAD_VIOLATION',
      severity: 'MEDIUM',
      ip,
      userAgent,
      userId,
      endpoint,
      details: {
        violation,
        fileInfo,
        message: 'File upload security violation',
      },
      action: 'UPLOAD_BLOCKED',
    });
  }

  async logSuspiciousActivity(ip: string, endpoint: string, activity: string, details: any, userAgent?: string, userId?: string): Promise<void> {
    await this.logEvent({
      type: 'SUSPICIOUS_ACTIVITY',
      severity: 'HIGH',
      ip,
      userAgent,
      userId,
      endpoint,
      details: {
        activity,
        ...details,
        message: 'Suspicious activity detected',
      },
      action: 'ACTIVITY_FLAGGED',
    });
  }

  async getRecentEvents(limit: number = 100, type?: SecurityEvent['type']): Promise<SecurityEvent[]> {
    const logs = await this.readLogs();
    
    let filteredLogs = logs;
    if (type) {
      filteredLogs = logs.filter(log => log.type === type);
    }

    return filteredLogs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  async getEventsByIP(ip: string, limit: number = 50): Promise<SecurityEvent[]> {
    const logs = await this.readLogs();
    
    return logs
      .filter(log => log.ip === ip)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  async getEventsByUser(userId: string, limit: number = 50): Promise<SecurityEvent[]> {
    const logs = await this.readLogs();
    
    return logs
      .filter(log => log.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  async getSecurityStats(): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    topIPs: Array<{ ip: string; count: number }>;
    recentEvents: SecurityEvent[];
  }> {
    const logs = await this.readLogs();
    
    const eventsByType: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};
    const ipCounts: Record<string, number> = {};

    logs.forEach(log => {
      eventsByType[log.type] = (eventsByType[log.type] || 0) + 1;
      eventsBySeverity[log.severity] = (eventsBySeverity[log.severity] || 0) + 1;
      ipCounts[log.ip] = (ipCounts[log.ip] || 0) + 1;
    });

    const topIPs = Object.entries(ipCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }));

    const recentEvents = logs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20);

    return {
      totalEvents: logs.length,
      eventsByType,
      eventsBySeverity,
      topIPs,
      recentEvents,
    };
  }

  async clearOldLogs(daysToKeep: number = 30): Promise<void> {
    const logs = await this.readLogs();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const filteredLogs = logs.filter(log => 
      new Date(log.timestamp) > cutoffDate
    );

    await this.writeLogs(filteredLogs);
  }
}

// 单例实例
export const securityLogger = new SecurityLogger();

// 便捷函数
export const logSecurityEvent = (event: Omit<SecurityEvent, 'id' | 'timestamp'>) => {
  return securityLogger.logEvent(event);
};

export const logRateLimitExceeded = (ip: string, endpoint: string, userAgent?: string, userId?: string) => {
  return securityLogger.logRateLimitExceeded(ip, endpoint, userAgent, userId);
};

export const logUnauthorizedAccess = (ip: string, endpoint: string, reason: string, userAgent?: string, userId?: string) => {
  return securityLogger.logUnauthorizedAccess(ip, endpoint, reason, userAgent, userId);
};

export const logCSRFViolation = (ip: string, endpoint: string, userAgent?: string, userId?: string) => {
  return securityLogger.logCSRFViolation(ip, endpoint, userAgent, userId);
};

export const logFileUploadViolation = (ip: string, endpoint: string, violation: string, fileInfo: any, userAgent?: string, userId?: string) => {
  return securityLogger.logFileUploadViolation(ip, endpoint, violation, fileInfo, userAgent, userId);
};

export const logSuspiciousActivity = (ip: string, endpoint: string, activity: string, details: any, userAgent?: string, userId?: string) => {
  return securityLogger.logSuspiciousActivity(ip, endpoint, activity, details, userAgent, userId);
};