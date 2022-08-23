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

const api_name = "reports";
const api_version = "1";
const root = process.cwd();
const schema = require("#schema/v2/index");

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
   * @type {App.Models.CtorReports}
   */
  const Model = db.model(api_name);

  router.use(middleware_auth.router_authc, middleware_auth.router_authz);
  router
    .route("/")
    .get(async function (req, res, nx) {
      try {
        interchange.success(res, 200, await Model.findAll());
      } catch (error) {
        nx(error);
      }
    })
    .post(
      validator.validate({
        body: "index.json#/definitions/reports/definitions/create",
      }),
      async function (req, res, nx) {
        try {
          if (Array.isArray(req.body)) {
            return nx(interchange.error(501));
          } else {
            Model.create(req.body);
          }
          interchange.success(res, 201, "created");
        } catch (error) {
          nx(error);
        }
      }
    )
    .delete(
      validator.validate({
        body: {
          type: "array",
          items: {
            type: "object",
            required: ["id"],
            properties: {
              id: {
                type: "integer",
                format: "int32",
              },
            },
          },
        },
      }),
      async function (req, res, nx) {
        const transaction = await db.transaction();
        try {
          if (Array.isArray(req.body)) {
            await Model.destroy({
              where: { id: req.body.map((item) => item.id) },
              transaction,
            });
          } else {
            return nx(interchange.error(501));
          }
          await transaction.commit();
          interchange.success(res, 201, "created");
        } catch (error) {
          await transaction.rollback();
          nx(error);
        }
      }
    );
  router
    .route("/:id")
    .get(async function (req, res, nx) {
      try {
        interchange.success(res, 200, await Model.findByPk(req.params.id));
      } catch (error) {
        nx(error);
      }
    })
    .patch(
      validator.validate({
        body: "index.json#/definitions/reports/definitions/update",
      }),
      async function (req, res, nx) {
        try {
          const model = await Model.findByPk(req.params.id);
          await model.update(req.body);
          interchange.success(res, 200, "updated");
        } catch (error) {
          nx(error);
        }
      }
    )
    .delete(async function (req, res, nx) {
      try {
        const model = await Model.findByPk(req.params.id);
        await model.destroy();
        interchange.success(res, 200, "deleted");
      } catch (error) {
        nx(error);
      }
    });

  logger.profile(`api ${api_name}`);

  return router;
};
