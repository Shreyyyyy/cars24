/**
 * Enterprise Structured Logging and Observability for Maruti Suzuki Assistant
 */

export interface LogContext {
  correlationId?: string;
  conversationId?: string;
  intent?: string;
  latencyMs?: number;
  userId?: string;
  [key: string]: any;
}

// Redact sensitive patterns (API keys, PII, email, phone)
function sanitizeLogData(data: any): any {
  if (!data) return data;
  if (typeof data === 'string') {
    return data
      .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]')
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]')
      .replace(/\b\d{10}\b/g, '[REDACTED_PHONE]');
  }
  if (typeof data === 'object') {
    const sanitized: Record<string, any> = Array.isArray(data) ? [] : {};
    for (const [key, val] of Object.entries(data)) {
      if (/key|secret|password|auth|token|phone|email/i.test(key)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeLogData(val);
      }
    }
    return sanitized;
  }
  return data;
}

export const logger = {
  info: (message: string, context?: LogContext) => {
    const timestamp = new Date().toISOString();
    const cleanContext = sanitizeLogData(context || {});
    console.log(JSON.stringify({ level: 'INFO', timestamp, message, ...cleanContext }));
  },
  warn: (message: string, context?: LogContext) => {
    const timestamp = new Date().toISOString();
    const cleanContext = sanitizeLogData(context || {});
    console.warn(JSON.stringify({ level: 'WARN', timestamp, message, ...cleanContext }));
  },
  error: (message: string, error?: any, context?: LogContext) => {
    const timestamp = new Date().toISOString();
    const cleanContext = sanitizeLogData(context || {});
    const errMessage = error instanceof Error ? error.message : String(error || '');
    const errStack = error instanceof Error && process.env.NODE_ENV !== 'production' ? error.stack : undefined;
    console.error(JSON.stringify({
      level: 'ERROR',
      timestamp,
      message,
      error: errMessage,
      stack: errStack,
      ...cleanContext
    }));
  }
};

export function generateCorrelationId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
}
