const fs = require("fs/promises");
const path = require("path");
const { newEnforcer } = require("casbin");
const Logger = require("#root/lib/logger");
const Interchange = require("#root/lib/interchange");

/**
 * @namespace NSAuthorization
 */
/**
 * @typedef {Object} NSAuthorization.RBACAuthEnforceOptions
 * @property {string} role
 * @property {string} resource
 * @property {string} action
 * @property {string} number
 */
/**
 * @async
 * @callback NSAuthorization.RBACAuthHandler
 * @param {import('express').Request} request
 * @param {import('express').Response} response
 * @param {import('express').NextFunction} next
 * @return {Promise<NSAuthorization.RBACAuthEnforceOptions>|Promise<void>}
 */
/**
 * @async
 * @callback NSAuthorization.RBACAuth
 * @param {import('express').Request} request
 * @param {import('express').Response} response
 * @param {import('express').NextFunction} next
 * @return {Promise<void>}
 */
/**
 * @typedef {Object} NSAuthorization.Options
 * @property {string} name
 * @property {string} version
 * @property {string} description
 * @property {boolean} debug
 * @property {Object} [app]
 * @property {Logger} [logger]
 * @property {{p_conf: string, p_data: string, key?: string}} rbac
 */

module.exports = class Authorization {
  static Symbol = {};
  /**
   * @member
   * @type {Map<string, import('casbin').Enforcer>}
   */
  static cache = new Map();
  /**
   * @member
   * @type {NSAuthorization.Options}
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
   * @type {import('casbin').Enforcer}
   */
  enforcer;
  /**
   * @constructor
   * @param {NSAuthorization.Options} opts
   */
  constructor(opts) {
    this.opts = opts;
  }
  async init() {
    if (this.opts.logger) {
      this.logger = this.opts.logger;
    } else {
      this.logger = new Logger({
        context: `authorization:${this.opts.name}:v${this.opts.version}`,
      });
    }
    this.logger.profile("init");
    this.interchange = new Interchange({
      name: this.opts.name,
      version: this.opts.version,
      debug: this.opts.debug,
    });
    if (this.opts.rbac.key) {
      const cache = Authorization.cache.get(this.opts.rbac.key);
      if (cache) {
        this.logger.info(`authorization use cache ${this.opts.rbac.key}`);
        this.enforcer = cache;
      }
    } else {
      this.enforcer = await newEnforcer(
        this.opts.rbac.p_conf,
        this.opts.rbac.p_data
      );
      this.opts.rbac.key &&
        Authorization.cache.set(this.opts.rbac.key, this.enforcer);
    }
    this.logger.profile("authorization init");
    return this;
  }
  /**
   * @param {NSAuthorization.RBACAuthHandler} handler
   * @returns {NSAuthorization.RBACAuth}
   */
  rbac_auth(handler) {
    const instance = this;
    return async function (request, response, next) {
      const result = await handler(request, response, next);
      if (!result) {
        instance.logger.info(`[rbac_auth] bypass`);
        return next();
      }
      const permission = Object.values(result);
      const valid = await instance.enforcer.enforce(...permission);
      instance.logger.info(`[rbac_auth] ${permission.join(", ")} == ${valid}`);
      if (valid) {
        next();
      } else {
        next(instance.interchange.error(403));
      }
    };
  }
  /**
   * @param {string[]} value
   * @return {Promise<boolean>}
   */
  enforce(...value) {
    return this.enforcer.enforce(...value);
  }
};

// class A {
//   /**
//    * @type {import('casbin'.Enforcer)}
//    */
//   static enforcer;
//   /**
//    * @type {import('express').Application}
//    */
//   app;
//   /**
//    * @type {{p_conf: string, p_data: string}}
//    */
//   opts;
//   /**
//    * @type {import('winston').Logger}
//    */
//   logger;
//   /**
//    * @type {import('casbin'.Enforcer)}
//    */
//   enforcer;
//   /**
//    * @type {(app: import('express').Application, opts: {p_conf: string, p_data: string}): Authorization}
//    */
//   constructor(app, opts) {
//     this.app = app;
//     this.opts = opts;
//   }
//   /**
//    * @type {(opts: {p_conf: string, p_data: string}): Authorization}
//    */
//   reconstructor(opts) {
//     return new Authorization(this.app, Object.assign(this.opts, opts));
//   }
//   async init() {
//     this.enforcer = await newEnforcer(this.opts.p_conf, this.opts.p_data);
//     this.enforcer;
//   }
//   /**
//    * @type {(value: string): Promise<boolean>}
//    */
//   addPolicy(value) {
//     return this.enforcer.addPolicy(value);
//   }
//   /**
//    * @type {(value: string): Promise<boolean>}
//    */
//   removePolicy(value) {
//     return this.enforcer.removePolicy(value);
//   }
//   /**
//    * @type {(value: string): Promise<boolean>}
//    */
//   enforce(value) {
//     return this.enforcer.enforce(value);
//   }

//   async create() {
//     const conf = path.join(this.opts.p_conf);
//     const data = path.join(this.opts.p_data);
//     const enforcer = Authorization.enforcer
//       ? Authorization.enforcer
//       : await newEnforcer(conf, data);

//     Authorization.enforcer ??= enforcer;
//     this.enforcer = enforcer;

//     const sub = "alice"; // the user that wants to access a resource.
//     const obj = "data1"; // the resource that is going to be accessed.
//     const act = "read"; // the operation that the user performs on the resource.

//     // Async:
//     const res = await enforcer.enforce(sub, obj, act);
//     // Sync:
//     // const res = enforcer.enforceSync(sub, obj, act);

//     if (res) {
//       // permit alice to read data1
//     } else {
//       // deny the request, show an error
//     }

//     // const roles = await enforcer.getRolesForUser("alice");

//     // const added = await enforcer.addPermissionForUser("anas", "read");
//     // const saved = await enforcer.savePolicy();

//     // console.log(enforcer, res, roles, added, saved);
//     // await enforcer.addRoleForUser("anas", "admin");

//     await this.enforcer.addPolicy("admin transaction write");

//     // console.log(await manager.getRoles("alice"));
//     // console.log(await enforcer.add);
//     // console.log(await enforcer.getAllRoles());
//     // console.log(await enforcer.getAllActions());
//     // console.log(await enforcer.getAllObjects());
//     // console.log(await enforcer.getAllSubjects());
//     console.log(await enforcer.getPolicy());
//     await enforcer.savePolicy();
//   }
//   /**
//    * @type {function(user: string): Promise<boolean}
//    */
//   async addUser(user) {
//     return this.enforcer.addRoleForUser(user, ROLES.ANONIMOUS);
//   }
//   /**
//    * @type {function(role: string): Promise}
//    */
//   async addRole(role) {
//     this.enforcer.addPolicy(role);
//   }
//   /**
//    * @type {function(roles: string[]): Promise}
//    */
//   async addRole(roles) {}
// };
