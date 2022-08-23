const CircuitBreaker = require("opossum");
const Logger = require("./logger");
const Interchange = require("#root/lib/interchange");

// function asyncFunctionThatCouldFail(x, y) {
//   return new Promise((resolve, reject) => {
//     // Do something, maybe on the network or a disk
//   });
// }

// const options = {
//   timeout: 3000, // If our function takes longer than 3 seconds, trigger a failure
//   errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
//   resetTimeout: 30000, // After 30 seconds, try again.
// };
// const breaker = new CircuitBreaker(asyncFunctionThatCouldFail, options);

// breaker.fire(x, y).then(console.log).catch(console.error);

/**
 * @namespace NSBreaker
 */
/**
 * @typedef {Object} NSBreaker.Options
 * @property {boolean} debug
 * @property {Logger} [logger]
 */
/**
 * @typedef {Object} NSBreaker.intercept_opt
 * @property {number} timeout
 */
/**
 * @async
 * @callback NSBreaker.intercept_handler
 * @param {import('express').Request} request
 * @param {import('express').Response} response
 * @param {import('express').NextFunction} next
 */
/**
 * @callback NSBreaker.intercept_middle
 * @param {import('express').Request} request
 * @param {import('express').Response} response
 * @param {import('express').NextFunction} next
 */
/**
 * @class
 */
module.exports = class Breaker {
  /**
   * @type {NSBreaker.Options}
   */
  opts;
  /**
   * @type {Logger}
   */
  logger;
  /**
   * @type {Interchange}
   */
  interchange;
  /**
   *
   * @param {NSBreaker.Options} opts
   */
  constructor(opts) {
    this.opts = opts;
    if (opts.logger) {
      this.logger = opts.logger;
    } else {
      this.logger = new Logger({ context: `breaker:v1` });
    }
    this.interchange = new Interchange({
      name: "breaker",
      version: "1",
      debug: this.opts.debug,
    });
  }
  /**
   * @param {NSBreaker.intercept_opt} opt
   * @param {NSBreaker.intercept_handler} handler
   * @returns {NSBreaker.intercept_middle}
   */
  intercept(opt, handler) {
    const breaker = new CircuitBreaker(handler, {
      timeout: opt.timeout,
      resetTimeout: 2000,
      errorThresholdPercentage: 0,
    });
    // breaker.fallback(() => {});
    // breaker.on("success", (result, latency) => {
    //   console.log("success", result, latency);
    // });
    // breaker.on("timeout", (error) => {
    //   // res.send(`TIMEOUT: ${req.url} is taking too long to respond.`);
    //   breaker.close();
    //   nx(this.interchange.error(408));
    //   // breaker.close();
    // });
    // breaker.on("reject", () => {
    //   console.log("reject");
    //   // res.send(`REJECTED: The breaker for ${req.url} is open. Failing fast.`);
    // });
    breaker.on("open", () => {
      console.log("[open]");
      // res.send(`OPEN: The breaker for ${req.url} just opened.`);
    });
    breaker.on("halfOpen", () => {
      console.log("[half open]");
      // res.send(`HALF_OPEN: The breaker for ${req.url} is half open.`);
    });
    breaker.on("close", () => {
      console.log("[close]");
      // res.send(`CLOSE: The breaker for ${req.url} has closed. Service OK.`);
    });
    breaker.on("fallback", (data, error) => {
      console.log("[fallback]");
      // nx(this.interchange.error(503, error));
    });
    return (req, res, nx) => {
      // breaker.enable();
      // breaker.open();
      breaker
        .fire(req, res, nx)
        .then(
          (value) => {
            console.log("[then]", value);
          },
          (reason) => {
            console.log("[catch]", reason);
            nx(this.interchange.error(408, reason));
            // nx(this.interchange.error(503));
          }
        )
        .finally(() => {
          breaker.close();
        });
    };
  }
};
