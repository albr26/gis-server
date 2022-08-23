const fs = require("fs");
const Logger = require("./logger");
/**
 * @namespace NSLocalDB
 */
/**
 * @typedef {Object} NSLocalDB.Options
 * @property {string} name
 * @property {string} version
 * @property {string} description
 * @property {boolean} debug
 * @property {Object} [app]
 * @property {Logger} [logger]
 * @property {string} path
 */
/**
 * @class
 */
module.exports = class LocalDB {
  /**
   * @type {LocalDB}
   */
  static instance;
  /**
   * @type {Map<string, LocalDB>}
   */
  static instances = new Map();
  /**
   * @param {string} name
   * @param {NSLocalDB.Options} [opts]
   */
  static create(name, opts) {
    if (this.instances.has(name)) {
    } else {
      if (opts) {
        this.instances.set(name, new LocalDB(opts));
      } else {
        throw new Error("cannot create without options");
      }
    }
    return this.instances.get(name);
  }
  #raw = {};
  name = "";
  path = "";
  time = Date.now();
  /**
   * @type {NSLocalDB.Options}
   */
  opts;
  /**
   * @type {Logger}
   */
  logger;
  get data() {
    return this.#raw;
  }
  set data(v) {
    this.#raw = v;
  }
  /**
   * @param {NSLocalDB.Options} opts
   */
  constructor(opts) {
    this.name = opts.name;
    this.path = opts.path;
    if (opts.logger) {
      this.logger = opts.logger;
    } else {
      this.logger = new Logger({ context: "db:v1" });
    }
    LocalDB.instances.set(opts.name, this);
  }
  async init() {}
  async open() {
    this.logger.profile("db open");
    await this.init();
    this.#raw = await this.#load();
    this.#raw.name ??= this.name;
    this.#raw.path ??= this.path;
    this.#raw.time ??= this.time;
    this.logger.profile("db open");
  }
  async sync() {
    this.logger.profile("db sync");
    this.#raw.time = this.time;
    await this.#save(this.#raw);
    this.logger.profile("db sync");
    // const loaded = await this.#load();
    // if (loaded.time != this.#raw.time) {
    //   throw Error("Edit Time mismatch: data maybe not synchronous");
    // } else {
    //   return this.#save(this.#raw);
    // }
  }
  async close() {
    this.logger.profile("db close");
    this.#raw.time = this.time;
    await this.#save(this.#raw);
    this.#raw = {};
    this.logger.profile("db close");
  }
  create(name, value) {
    if (name in this.#raw) {
    } else {
      this.#raw[name] = value;
    }
    return this.#raw[name];
  }
  remove(name) {
    this.#raw[name] = undefined;
  }
  get(name) {
    return this.#raw[name];
  }
  set(name, value) {
    this.#raw[name] = value;
  }
  #save(value) {
    return new Promise((resolve, reject) => {
      const content = JSON.stringify(value, null, "\t");
      const stream = fs.createWriteStream(this.path);
      stream.once("close", () => {
        resolve();
      });
      stream.once("error", (err) => {
        reject(err);
      });
      stream.end(content);
    });
  }
  #load() {
    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(this.path);
      const chunks = [];
      stream.on("readable", () => {
        let chunk;
        while (null != (chunk = stream.read())) {
          chunks.push(chunk);
        }
      });
      stream.once("end", () => {
        const content = chunks.join("");
        // this.#raw = JSON.parse(content);
        resolve(JSON.parse(content));
      });
      stream.once("error", (err) => {
        reject(err);
      });
    });
  }
};

class LocalObject {}
