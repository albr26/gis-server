const { Sequelize, DataTypes, Model, Op } = require("sequelize");
const Logger = require("./logger");

/**
 * @namespace NSDatabase
 */
/**
 * @typedef {Object} NSDatabase.Options
 * @property {string} name
 * @property {string} url
 * @property {Function[]} model_loaders
 * @property {Logger} [logger]
 */
/**
 * @class
 */
module.exports = class Database {
  static DTypes = DataTypes;
  static Op = Op;
  /**
   * @type {Map<string, Database>}
   */
  static instances = new Map();
  /**
   * @param {string} name
   * @returns {Database}
   */
  static inject(name) {
    const db = this.instances.get(name);
    if (db) {
      return db;
    }
    throw new Error(`instance ${name} not exists`);
  }
  /**
   * @type {NSDatabase.Options}
   */
  opts;
  /**
   * @type {Sequelize}
   */
  connection;
  /**
   * @type {Logger}
   */
  logger;
  connected = false;
  /**
   *
   * @param {NSDatabase.Options} opts
   */
  constructor(opts) {
    this.opts = opts;
    if (opts.logger) {
      this.logger = opts.logger;
    } else {
      this.logger = new Logger({ context: `database:v1` });
    }
    this.connection = new Sequelize(opts.url, {
      benchmark: true,
      logging: (sql, timing) => {
        this.logger.info(`${sql} - ${timing}ms`);
      },
    });
    for (const loader of opts.model_loaders) {
      this.load(loader);
    }
    for (const Model of Object.values(this.connection.models)) {
      // @ts-ignore
      Model.associate(this.connection.models);
    }
    if (Database.instances.has(opts.name)) {
      throw new Error(`instance ${opts.name} already exists`);
    }
    Database.instances.set(opts.name, this);
  }
  async init() {
    try {
      this.logger.profile("Connection has been established successfully.");
      await this.connection.authenticate();
      this.logger.profile("Connection has been established successfully.");
      this.connected = true;
    } catch (error) {
      this.logger.error("Unable to connect to the database");
      this.connected = false;
    }
  }
  async close() {
    try {
      this.logger.profile("Connection has been closed successfully.");
      await this.connection.close();
      this.logger.profile("Connection has been closed successfully.");
    } catch (error) {
      this.logger.error("Unable to close the database");
    }
  }
  /**
   * @param {string} name
   */
  model(name) {
    return this.connection.models[name];
  }
  /**
   * @template {Function} T
   * @param {T} loader
   * @return {App.Util.GetReturnType<T>}
   */
  load(loader) {
    // @ts-ignore
    return loader(this.connection, DataTypes);
  }
  transaction() {
    return this.connection.transaction();
  }
};
