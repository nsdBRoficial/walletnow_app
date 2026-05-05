// supabase/functions/_shared/logger.ts
// Logs estruturados em JSON para Supabase Edge Function Logs

type LogLevel = "INFO" | "WARN" | "ERROR";

interface LogEntry {
  level: LogLevel;
  fn: string;
  msg: string;
  ts: string;
  [key: string]: unknown;
}

function log(level: LogLevel, fn: string, msg: string, extra?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    fn,
    msg,
    ts: new Date().toISOString(),
    ...extra,
  };

  if (level === "ERROR") {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

export const logger = {
  info:  (fn: string, msg: string, extra?: Record<string, unknown>) => log("INFO",  fn, msg, extra),
  warn:  (fn: string, msg: string, extra?: Record<string, unknown>) => log("WARN",  fn, msg, extra),
  error: (fn: string, msg: string, extra?: Record<string, unknown>) => log("ERROR", fn, msg, extra),
};
