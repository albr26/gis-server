/// <reference path="../@types/global.d.ts"/>

const crypto = require("crypto");
const jsonwebtoken = require("jsonwebtoken");
const otpauth = require("otpauth");
const Interchange = require("#root/lib/interchange");
const Logger = require("#root/lib/logger");
// const secretKey = crypto.randomBytes(48).toString("hex");

/**
 * @typedef {import('express').Application} Application
 */
/**
 * @typedef {import('express').Request} Express.Request
 */
/**
 * @typedef {import('express').Response} Express.Response
 */
/**
 * @typedef {import('express').NextFunction} Express.NextFunction
 */
/**
 * @typedef {import('express').RequestHandler} Express.RequestHandler
 */
/**
 * @typedef {string} jwt_token
 */
/**
 * @typedef {Object<string, any>} jwt_payload
 */
/**
 * @typedef {{
 *  audience?: string | string[],
 *  issuer?: string,
 *  subject?: string,
 *  ignoreExpiration?: boolean,
 *  ignoreNotBefore?: boolean,
 *  maxAge?: string | number,
 *  notBefore?: string | number,
 * }} jwt_payload_verify_opt
 */
/**
 * @typedef {{
 *  audience?: string | string[],
 *  issuer?: string,
 *  subject?: string,
 *  expiresIn?: string | number,
 *  notBefore?: string | number,
 * }} jwt_payload_sign_opt
 */
/**
 * @async
 * @callback jwt_gen_handler
 * @param {Express.Request} request
 * @param {Express.Response} response
 * @param {Express.NextFunction} next
 * @return {Promise<jwt_payload & {opt?: jwt_payload_sign_opt}>}
 */
/**
 * @async
 * @callback jwt_gen_middle
 * @param {Express.Request} request
 * @param {Express.Response} response
 * @param {Express.NextFunction} next
 * @return {Promise<void>}
 */
/**
 * @async
 * @callback jwt_verify_handler
 * @param {Express.Request} request
 * @param {Express.Response} response
 * @param {Express.NextFunction} next
 * @return {Promise<jwt_payload_verify_opt>}
 */
/**
 * @async
 * @callback jwt_auth_handler
 * @param {jwt_payload} payload
 * @param {Express.Request} request
 * @param {Express.Response} response
 * @param {Express.NextFunction} next
 * @return {Promise<Object<string, any>>}
 */
/**
 * @async
 * @callback jwt_refresh_handler
 * @param {Object<string, any>} auth_info
 * @param {Express.Request} request
 * @param {Express.Response} response
 * @param {Express.NextFunction} next
 * @return {Promise<jwt_payload & {opt?: jwt_payload_sign_opt}>}
 */
/**
 * @async
 * @callback jwt_auth_middle
 * @param {Express.Request} request
 * @param {Express.Response} response
 * @param {Express.NextFunction} next
 * @return {Promise<void>}
 */
/**
 * @typedef {Object} AuthenticationOptions
 * @property {string} name
 * @property {string} version
 * @property {string} description
 * @property {boolean} debug
 * @property {Object} [app]
 * @property {Logger} [logger]
 * @property {{secretKey: string}} jwt
 */
/**
 * @class
 */
module.exports = class Authentication {
  static Symbol = {
    jwt_token: Symbol("jwt_token"),
    jwt_payload: Symbol("jwt_payload"),
    auth_info: Symbol("auth_info"),
  };
  /**
   * @type {AuthenticationOptions}
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
  scheme = "Bearer";
  s = Authentication.Symbol;
  /**
   * @constructor
   * @param {AuthenticationOptions} opts
   */
  constructor(opts) {
    this.opts = opts;
  }
  async init() {
    if (this.opts.logger) {
      this.logger = this.opts.logger;
    } else {
      this.logger = new Logger({
        context: `authentication:${this.opts.name}:v${this.opts.version}`,
      });
    }
    this.interchange = new Interchange({
      name: this.opts.name,
      version: this.opts.version,
      debug: this.opts.debug,
    });
    this.logger.info("authentication init");
    return this;
  }
  /**
   * @param {Express.Request} request
   * @return {string}
   */
  jwt_extractor(request) {
    const authorization = request.get("authorization");
    if (authorization) {
      if (authorization.startsWith(this.scheme)) {
        const token = authorization.substring(this.scheme.length + 1);
        if (token) {
          return token;
        }
      }
    }
    throw this.interchange.error(401);
  }
  /**
   * @param {jwt_payload} payload
   * @return {string}
   */
  jwt_sign(payload) {
    return jsonwebtoken.sign(payload, this.opts.jwt.secretKey, {});
  }
  /**
   * @param {jwt_gen_handler} handler
   * @return {jwt_gen_middle}
   */
  jwt_gen(handler) {
    const instance = this;
    const { jwt } = this.opts;
    return async function (request, response, next) {
      try {
        const payload = await handler(request, response, next);
        const { opt } = payload;

        delete payload.opt;

        const token = jsonwebtoken.sign(payload, jwt.secretKey, opt);
        request[Authentication.Symbol.jwt_token] = token;
        next();
      } catch (error) {
        next(instance.interchange.error(401, error));
      }
    };
  }
  /**
   * @param {jwt_verify_handler} verify_handler
   * @param {jwt_auth_handler} auth_handler
   * @param {jwt_refresh_handler} [refresh_handler]
   * @return {jwt_auth_middle}
   */
  jwt_auth(verify_handler, auth_handler, refresh_handler) {
    const instance = this;
    const { jwt } = this.opts;
    return async function (request, response, next) {
      try {
        const token = instance.jwt_extractor(request);
        const opt = await verify_handler(request, response, next);
        const payload = jsonwebtoken.verify(token, jwt.secretKey, opt);
        if (typeof payload == "string") {
          next(instance.interchange.error(401, new Error(payload)));
        } else {
          request[Authentication.Symbol.jwt_payload] = payload;
          const info = await auth_handler(payload, request, response, next);
          request[Authentication.Symbol.auth_info] = info;
          if (refresh_handler) {
            const payload = await refresh_handler(
              info,
              request,
              response,
              next
            );
            const { opt } = payload;

            delete payload.opt;

            const token = jsonwebtoken.sign(payload, jwt.secretKey, opt);
            request[Authentication.Symbol.jwt_token] = token;
          }
          next();
        }
      } catch (error) {
        next(instance.interchange.error(401, error));
      }
    };
  }
};
