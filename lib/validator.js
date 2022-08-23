const { default: Ajv } = require("ajv");
const { default: AjvErrors } = require("ajv-errors");
const { default: addFormats } = require("ajv-formats");
const Logger = require("#root/lib/logger");
const Interchange = require("#root/lib/interchange");

/**
 * @namespace NSValidator
 */
/**
 * @typedef {Object} NSValidator.Schema
 * @property {import('ajv').Schema | string} [params]
 * @property {import('ajv').Schema | string} [header]
 * @property {import('ajv').Schema | string} [body]
 * @property {import('ajv').Schema | string} [query]
 */
/**
 * @typedef {Object} NSValidator.Options
 * @property {string} name
 * @property {string} version
 * @property {boolean} debug
 * @property {Logger} [logger]
 * @property {string} [key]
 * @property {import('ajv').AnySchema[]} [schemas]
 */
/**
 * @callback NSValidator.validate_middle
 * @param {import('express').Request} request
 * @param {import('express').Response} response
 * @param {import('express').NextFunction} next
 */
/**
 * @class
 */
module.exports = class Validator {
  /**
   * @member
   * @type {Map<string, Ajv>}
   */
  static cache = new Map();
  name = "";
  version = "";
  /**
   * @type {Ajv}
   */
  ajv;
  /**
   * @type {Logger}
   */
  logger;
  /**
   * @type {Interchange}
   */
  interchange;
  /**
   * @type {NSValidator.Options}
   */
  opts;
  /**
   * @param {NSValidator.Options} opts
   */
  constructor(opts) {
    this.opts = opts;
    if (this.opts.key) {
      const cache = Validator.cache.get(this.opts.key);
      if (cache) {
        this.logger.info(`validator use cache ${this.opts.key}`);
        this.ajv = cache;
      }
    } else {
      this.ajv = new Ajv({
        verbose: opts.debug,
        allErrors: true,
        schemas: opts.schemas,
      });
      addFormats(this.ajv);
      AjvErrors(this.ajv);
      this.opts.key && Validator.cache.set(this.opts.key, this.ajv);
    }
    if (this.opts.logger) {
      this.logger = this.opts.logger;
    } else {
      this.logger = new Logger({
        context: `validator:${this.opts.name}:v${this.opts.version}`,
      });
    }
    this.interchange = new Interchange({
      name: this.opts.name,
      version: this.opts.version,
      debug: this.opts.debug,
    });
    this.logger.info("init validator");
  }
  /**
   * @param {NSValidator.Schema} schema
   * @param {object} message
   * @param {object} [opts]
   * @return {NSValidator.validate_middle}
   */
  validate(schema, message, opts) {
    /**
     * @type {{validator: Function, key: string}[]}
     */
    const validates = [];
    for (const key of ["params", "body"]) {
      if (schema[key]) {
        let validator;
        if (typeof schema[key] == "string") {
          // console.log(this.ajv.getSchema(schema[key]));
          validator = this.ajv.getSchema(schema[key]);
        } else if (typeof schema[key] == "object") {
          // @ts-ignore
          validator = this.ajv.compile(schema[key]);
        } else {
          throw new Error(`schema must object or string`, { cause: schema });
        }
        if (!validator) {
          throw new Error(`invalid validate schema ${key}`, { cause: schema });
        }
        validates.push({
          validator,
          key,
        });
      }
    }
    return (request, response, next) => {
      /**
       * @type {{key: string, valid: boolean}[]}
       */
      const valids = [];
      for (const validate of validates) {
        const valid = validate.validator(request[validate.key]);
        if (!valid) {
          return next(
            this.interchange.error(400, undefined, {
              cause: validate.validator["errors"],
            })
          );
        } else {
          valids.push({
            key: validate.key,
            valid,
          });
        }
      }
      next();
    };
  }
};
