const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const Logger = require("#lib/logger");
const Database = require("#lib/database");
const Authentication = require("#lib/authentication");
const Authorization = require("#lib/authorization");
const Validator = require("#lib/validator");
const Interchange = require("#lib/interchange");
const middleware_auth_ctor = require("#middleware/auth");

const api_name = "resources";
const api_version = "1";
const root = process.cwd();
const schema = require("#schema/v2/resources");
const config = {
  root_dir: path.join(root, "storage"),
  public: path.join("/resources"),
};

/**
 * @param {import('express').Application} app
 */
module.exports = async function (app) {
  const logger = new Logger({ context: `api:${api_name}:v${api_version}` });

  logger.profile(`api ${api_name}`);

  const db = Database.inject("app");
  const interchange = new Interchange({
    name: api_name,
    version: api_version,
    debug: true,
    logger: logger,
  });
  const validator = new Validator({
    name: api_name,
    version: api_version,
    debug: true,
    logger: logger,
    schemas: [schema],
  });
  const authc = await new Authentication({
    name: api_name,
    version: api_version,
    description: "",
    debug: true,
    logger: logger,
    jwt: { secretKey: "secret" },
  }).init();
  const authz = await new Authorization({
    name: api_name,
    version: api_version,
    description: "",
    debug: true,
    logger: logger,
    rbac: {
      p_conf: path.join(root, "config/rbac-ext.conf"),
      p_data: path.join(root, "data/rbac-ext.csv"),
    },
  }).init();
  const middleware_auth = await middleware_auth_ctor(app);

  app.use(config.public, express.static(config.root_dir));

  router.route("/:dir/:type/:path").post(
    // middleware_auth.router_auth,
    validator.validate({ params: "resources.json#/definitions/params" }),
    function (req, res, nx) {
      const { params } = req;
      const dir = path.join(config.root_dir, params.dir, params.type);
      const public_path = path.join(
        config.public,
        params.dir,
        params.type,
        params.path
      );
      const file_path = path.join(dir, params.path);
      fs.mkdir(dir, { recursive: true }, (err) => {
        if (err) {
          return nx(err);
        }
        const stream = fs.createWriteStream(file_path);

        req.pipe(stream);

        stream.once("error", (error) => {
          nx(interchange.error(500, error));
        });
        stream.once("finish", () => {
          interchange.success(res, 201, public_path);
        });
      });
    }
  );

  logger.profile(`api ${api_name}`);

  return router;
};
