const assert = require("assert");
const path = require("path");
const chalk = require("chalk");
const winston = require("winston");
const expressWinston = require("express-winston");
const dirname = path.join(process.cwd(), "log");
const syslog_levels = {
  emerg: 0,
  alert: 1,
  crit: 2,
  error: 3,
  warning: 4,
  notice: 5,
  info: 6,
  debug: 7,
};
const npm_levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
};
const { env } = process;

/**
 * @typedef {object} Options
 * @property {string} context
 */
/**
 * @class
 */
module.exports = class Logger {
  /**
   * @type {winston.Logger}
   */
  static logger;
  /**
   * @type {winston.Container}
   */
  static container;
  /**
   * @type {Logger}
   */
  static instance;
  /**
   * @type {Options}
   */
  opts;
  /**
   * @type {winston.Logger}
   */
  logger;
  /**
   * @type {winston.Container}
   */
  container;
  /**
   * @param {Options} opts
   */
  constructor(opts) {
    this.opts = opts;
    if (Logger.container) {
      this.container = Logger.container;
      if (opts.context) {
        this.logger = this.createLogger({ context: opts.context });
      } else {
        if (Logger.logger) {
          this.logger = Logger.logger;
        }
      }
    }
  }
  http() {}
  /**
   * @param {any} message
   */
  info(message) {
    return this.logger.log("info", message);
  }
  /**
   * @param {any} message
   */
  warn(message) {
    return this.logger.log("warn", message);
  }
  /**
   * @param {any} message
   */
  error(message) {
    return this.logger.log("error", message);
  }
  /**
   * @param {number | string} id
   * @param {any} meta
   */
  profile(id, meta) {
    return this.logger.profile(id, meta);
  }
  /**
   * @type {function (): Logger}
   */
  default() {
    const container = new winston.Container();
    const logger = container.get(this.opts.context, {
      levels: winston.config.npm.levels,
      exitOnError: false,
      handleExceptions: true,
      handleRejections: true,
      defaultMeta: {},
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.timestamp(),
        winston.format.label({ label: this.opts.context }),
        // winston.format.json(),
        winston.format.printf(
          ({ timestamp, label, level, durationMs, message, tag }) => {
            const durationMsg = durationMs
              ? `${chalk.yellow(durationMs)}ms`
              : "";
            const tagMsg = tag ? `[${tag}]` : "";
            return `[${chalk.magenta(timestamp)}] [${chalk.blue(
              label
            )}] [${level}] ${tagMsg} ${durationMsg} \n>> ${message} -`;
          }
        )
        // winston.format.prettyPrint({ colorize: true }),
      ),
      transports: [],
      exceptionHandlers: [],
      rejectionHandlers: [],
    });
    if (env.NODE_ENV == "development") {
      logger.add(new winston.transports.Console());
      logger.exceptions.handle(new winston.transports.Console());
      logger.rejections.handle(new winston.transports.Console());
    } else {
      logger.add(
        new winston.transports.File({
          dirname,
          filename: "verbose.log",
        })
      );
      logger.exceptions.handle(
        new winston.transports.File({
          dirname,
          filename: "exceptions.log",
        })
      );
      logger.rejections.handle(
        new winston.transports.File({
          dirname,
          filename: "rejections.log",
        })
      );
    }
    Logger.container = container;
    Logger.logger = logger;
    Logger.instance = this;
    this.logger = logger;
    this.container = container;
    return this;
  }
  /**
   * @type {function ({context: string}): winston.Logger}
   */
  createLogger({ context }) {
    assert.equal(typeof context, "string", "context param must be string");
    const logger = this.container.get(context, {
      levels: winston.config.npm.levels,
      handleExceptions: true,
      handleRejections: true,
      exitOnError: false,
      defaultMeta: { context },
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.timestamp(),
        winston.format.label({ label: context }),
        winston.format.printf(
          ({ timestamp, label, level, durationMs, message, tag }) => {
            const durationMsg = durationMs
              ? `${chalk.yellow(durationMs)}ms`
              : "";
            const tagMsg = tag ? `[${tag}]` : "";
            return `[${chalk.magenta(timestamp)}] [${chalk.blue(
              label
            )}] [${level}] ${tagMsg} ${durationMsg} \n>> ${message}`;
          }
        )
      ),
      transports: [new winston.transports.Console()],
      exceptionHandlers: [new winston.transports.Console()],
      rejectionHandlers: [new winston.transports.Console()],
    });
    return logger;
  }
  /**
   * @type {function ({app, context: string}): void}
   */
  createHttpLogger({ app, context }) {
    assert.equal(typeof context, "string", "context param must be string");
    if (env.NODE_ENV != "development") {
      app.use(
        expressWinston.logger({
          baseMeta: { context },
          transports: [new winston.transports.Console()],
          format: winston.format.combine(
            winston.format.json(),
            winston.format.prettyPrint({ colorize: true })
          ),
        })
      );
    }
  }
  /**
   * @type {function ({app, context: string}): void}
   */
  createHttpErrorLogger({ app, context }) {
    assert.equal(typeof context, "string", "context param must be string");
    if (env.NODE_ENV != "development") {
      app.use(
        expressWinston.errorLogger({
          baseMeta: { context },
          // dumpExceptions: true,
          // showStack: true,
          transports: [new winston.transports.Console()],
          format: winston.format.combine(
            winston.format.json(),
            winston.format.prettyPrint({ colorize: true })
          ),
        })
      );
    }
  }
};
