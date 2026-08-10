type LogFields = Record<string, unknown>;

function format(level: string, message: string, fields?: LogFields) {
  const payload = {
    level,
    message,
    time: new Date().toISOString(),
    ...fields,
  };
  return JSON.stringify(payload);
}

export const logger = {
  info: (message: string, fields?: LogFields) => {
    console.log(format("info", message, fields));
  },
  warn: (message: string, fields?: LogFields) => {
    console.warn(format("warn", message, fields));
  },
  error: (message: string, fields?: LogFields) => {
    console.error(format("error", message, fields));
  },
  debug: (message: string, fields?: LogFields) => {
    if (process.env.NODE_ENV !== "production") {
      console.debug(format("debug", message, fields));
    }
  },
};
