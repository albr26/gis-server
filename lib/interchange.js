const createHttpError = require("http-errors");
const Logger = require("./logger");
const chalk = require("chalk");

/**
 * @namespace NSInterchange
 */
/**
 * @typedef {Object} NSInterchange.Options
 * @property {string} name
 * @property {string} version
 * @property {boolean} debug expose all error attribute
 * @property {Logger} [logger]
 */
/**
 * @class
 */
module.exports = class Interchange {
  static Error = createHttpError;
  /**
   * @deprecated use instance instead
   * @param {import('express').Response} response
   * @param {import('http-errors').HttpError} error
   */
  static error(response, error) {
    response.status(error.status).send(error);
  }
  /**
   * @deprecated use instance instead
   * @param {import('express').Response} response
   * @param {Object} data
   */
  static ok(response, data) {
    response.status(200).set("content-type", "application/json").send(data);
  }
  /**
   * @deprecated use instance instead
   * @param {import('express').Response} response
   * @param {Object} data
   */
  static created(response, data) {
    response.status(201).set("content-type", "application/json").send(data);
  }
  /**
   * @return {import('express').RequestHandler}
   */
  static not_found_middle() {
    return function (request, response, next) {
      // console.log("not_found_middle");
      next(createHttpError(404));
    };
  }
  /**
   * @return {import('express').ErrorRequestHandler}
   */
  static error_middle() {
    return function (error, request, response, next) {
      console.log(chalk.red("[static error_middle]"), error);
      // console.log("error_middle");
      // console.log("cause", error.cause);
      // console.log("expose", error.expose);
      // console.log("headers", error.headers);
      // console.log("message", error.message);
      // console.log("name", error.name);
      // console.log("stack", error.stack);
      // console.log("status", error.status);
      // console.log("statusCode", error.statusCode);
      if (response.headersSent) {
        next();
      }
      if (!createHttpError.isHttpError(error)) {
        return response.status(500).send(error).end();
      }
      if (error.headers) {
        for (const [key, value] of Object.entries(error.headers)) {
          response.set(key, value);
        }
      }
      response.status(error.status);
      if (error.expose) {
        const data = {
          ...error,
          name: error.name,
          message: error.message,
          stack: error.stack,
          cause: error.cause,
        };
        response.send(data);
      } else {
        response.send({
          name: error.name,
          message: error.message,
          stack: "",
          cause: "",
        });
      }
      response.end();
    };
  }
  /**
   * @type {NSInterchange.Options}
   */
  opts;
  /**
   * @type {Logger}
   */
  logger;
  /**
   * @param {NSInterchange.Options} opts
   */
  constructor(opts) {
    this.opts = opts;
    if (!opts.logger) {
      this.logger = new Logger({
        context: `interchange:${opts.name}:v${opts.version}`,
      });
    } else {
      this.logger = opts.logger;
    }
  }
  /**
   * @param {createHttpError.HttpError} error
   */
  compose(error) {
    error.expose = this.opts.debug;
  }
  /**
   * @param {import('express').Response} response
   * @param {number} status should 200..299 status code
   * @param {Object} [data]
   */
  success(response, status, data) {
    if (response.headersSent) {
      this.logger.warn(`${response.req.originalUrl} response already sent`);
      return response;
    }
    return response.status(status).json(this.on_response(data)).end();
  }
  /**
   * @param {number} status
   * @param {Error | Object | string} [error]
   * @param {Object} [rest]
   */
  error(status, error, rest = {}) {
    if (!error) {
      error = createHttpError(status);
    }
    return createHttpError(status, error, {
      expose: this.opts.debug,
      ...rest,
    });
  }
  on_response = (data) => data;
  /**
   * @deprecated use static instead
   * @return {import('express').RequestHandler}
   */
  not_found_middle() {
    return (request, response, next) => {
      next(createHttpError(404, { expose: this.opts.debug }));
    };
  }
  /**
   * @deprecated use static instead
   * @return {import('express').ErrorRequestHandler}
   */
  error_middle() {
    return (error, request, response, next) => {
      this.opts.debug && console.log(error);

      if (!createHttpError.isHttpError(error)) {
        return response.status(500).send(error).end();
      }
      if (error.headers) {
        for (const [key, value] of Object.entries(error.headers)) {
          response.set(key, value);
        }
      }
      response.status(error.status);
      if (error.expose) {
        response.send({
          name: error.name,
          message: error.message,
          stack: error.stack,
          cause: error.cause,
        });
      } else {
        response.send({
          name: error.name,
          message: error.message,
          stack: "",
          cause: "",
        });
      }
      response.end();
    };
  }
  // /**
  //  * @param {import('express').Response} response
  //  * @param {Object} data
  //  */
  // static created(response, data) {
  //   response.status(201).send({ status: "success", data });
  // }
};
