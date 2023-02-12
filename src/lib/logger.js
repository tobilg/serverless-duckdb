import bunyan from 'bunyan';

let loggerInstance = null;

export default class Logger {
  constructor (options={}) {
    this.level = options.level || process.env.LOG_LEVEL || 'info';
    this.name = options.name || `duckdb-lambda-logger`
    return this.getLogger();
  }

  getLogger() {
    if (!loggerInstance || loggerInstance === null) {
      loggerInstance = bunyan.createLogger({
        name: this.name,
        level: this.level,
      });
    }
    return loggerInstance;
  }
}
