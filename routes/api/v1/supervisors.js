const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const Logger = require("#lib/logger");
const Database = require("#lib/database");
const Authentication = require("#lib/authentication");
const Authorization = require("#lib/authorization");
const Validator = require("#lib/validator");
const Interchange = require("#lib/interchange");
const middleware_auth_ctor = require("#middleware/auth");

const api_name = "supervisors";
const api_version = "1";
const root = process.cwd();
const schema = require("#schema/v1/supervisors");

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
  /**
   * @type {App.Models.CtorSupervisors}
   */
  const Model = db.model(api_name);

  router.use(middleware_auth.router_authc);

  router.route("/").get(
    authz.rbac_auth(async function (req, res, nx) {
      return {
        role: req[authc.s.auth_info].role,
        resource: api_name,
        action: "read",
        number: "all",
      };
    }),
    async function (req, res, nx) {
      try {
        const data = await Model.findAll();
        interchange.success(res, 200, data);
      } catch (error) {
        nx(error);
      }
    }
  );
  router
    .route("/:id")
    .get(
      authz.rbac_auth(async function (req, res, nx) {
        return {
          role: req[authc.s.auth_info].role,
          resource: api_name,
          action: "read",
          number: "one",
        };
      }),
      function (req, res, nx) {
        nx(interchange.error(501));
      }
    )
    .patch(
      authz.rbac_auth(async function (req, res, nx) {
        return {
          role: req[authc.s.auth_info].role,
          resource: api_name,
          action: "write",
          number: "one",
        };
      }),
      validator.validate({ body: "supervisors.json#/definitions/update" }),
      function (req, res, nx) {
        nx(interchange.error(501));
      }
    )
    .delete(
      authz.rbac_auth(async function (req, res, nx) {
        return {
          role: req[authc.s.auth_info].role,
          resource: api_name,
          action: "write",
          number: "one",
        };
      }),
      function (req, res, nx) {
        nx(interchange.error(501));
      }
    );
  router.post(
    "/create",
    authz.rbac_auth(async function (req, res, nx) {
      return {
        role: req[authc.s.auth_info].role,
        resource: api_name,
        action: "write",
        number: "one",
      };
    }),
    validator.validate({ body: "supervisors.json#/definitions/create" }),
    authc.jwt_gen(async function (request, response, next) {
      try {
        const { body } = request;
        let exist = await Model.findOne({
          where: { username: body.username },
        });
        if (exist) {
          throw interchange.error(404, "user already exist");
        }
        const data = await Model.create(body);
        const user = data.toJSON();
        request.user = user;
        return {
          sub: user.id,
          role: user.role,
          opt: {
            issuer: "user",
            expiresIn: "30s",
          },
        };
      } catch (error) {
        next(error);
      }
    }),
    function (request, response, next) {
      const token = request[authc.s.jwt_token];
      const user = request.user;
      interchange.success(response, 200, { token, user: user });
    }
  );
  router.post(
    "/signin",
    authc.jwt_gen(async function (request, response, next) {
      try {
        const { body } = request;
        let exist = await Model.findOne({
          where: { username: body.username },
        });
        if (!exist) {
          throw interchange.error(404, "user not exist");
        }
        const data = await Model.create(body);
        const user = data.toJSON();
        request.user = user;
        return {
          sub: user.id,
          role: user.role,
          opt: {
            issuer: "user",
            expiresIn: "30s",
          },
        };
      } catch (error) {
        next(error);
      }
    }),
    function (request, response, next) {
      const token = request[authc.s.jwt_token];
      const user = request.user;
      interchange.success(response, 200, { token, user: user });
    }
  );

  logger.profile(`api ${api_name}`);

  return router;
};
