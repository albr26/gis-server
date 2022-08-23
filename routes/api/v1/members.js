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

const api_name = "members";
const api_version = "1";
const root = process.env.PWD;
const schema = require("#schema/v2/members");

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
  const authc = new Authentication({
    name: api_name,
    version: api_version,
    description: "",
    debug: true,
    logger: logger,
    jwt: { secretKey: "secret" },
  });
  const authz = new Authorization({
    name: api_name,
    version: api_version,
    description: "",
    debug: true,
    logger: logger,
    rbac: {
      p_conf: path.join(root, "config/rbac-ext.conf"),
      p_data: path.join(root, "data/rbac-ext.csv"),
    },
  });

  await authc.init();
  await authz.init();

  await fs.promises.mkdir(path.join(root, "storage/images"), {
    recursive: true,
  });

  const router_auth = authc.jwt_auth(
    async function (req, res, nx) {
      return {
        issuer: "user",
      };
    },
    async function (payload, req, res, nx) {
      const { sub: id, role } = payload;
      const Model = db.model(role + "s");
      if (!Model) {
        nx(interchange.error(401, `model ${role} not exists`));
      }
      const user = await Model.findOne({ where: { id } });
      if (!user) {
        nx(interchange.error(401, `user ${role} not exists`));
      }
      return user.toJSON();
    }
  );
  const router_auth_refresh = authc.jwt_auth(
    async function (req, res, nx) {
      return {
        issuer: "user",
      };
    },
    async function (payload, req, res, nx) {
      const { sub: id, role } = payload;
      const Model = db.model(role + "s");
      if (!Model) {
        nx(interchange.error(401, `model ${role} not exists`));
      }
      const user = await Model.findOne({ where: { id } });
      if (!user) {
        nx(interchange.error(401, `user ${role} not exists`));
      }
      return user.toJSON();
    },
    async function (user, request, response, next) {
      return {
        sub: user.id,
        role: user.role,
        opt: {
          issuer: "user",
          expiresIn: "1h",
        },
      };
    }
  );

  router.get(
    "/",
    router_auth,
    authz.rbac_auth(async function (req, res, nx) {
      return {
        role: req[authc.s.auth_info].role,
        resource: api_name,
        action: "read",
        number: "all",
      };
    }),
    async function (request, response, next) {
      const roles = ["admins", "supervisors"];
      const users = [];
      try {
        for (const role of roles) {
          const Model = db.model(role);
          const data = await Model.findAll();
          users.push(...data);
        }
        interchange.success(response, 200, users);
      } catch (error) {
        next(error);
      }
    }
  );
  router.post(
    "/",
    validator.validate({ body: "members.json#/definitions/create" }),
    async function (request, response, next) {
      const { body } = request;
      const Model = db.model(body.role + "s");
      if (!Model) {
        throw interchange.error(401, `model ${body.role} not exists`);
      }
      const data = await Model.findOne({
        where: { username: body.username },
      });
      if (data) {
        interchange.error(400, "data already exist");
      } else {
        await Model.create({
          username: body.username,
          password: body.password,
          email: body.email,
        });
        interchange.success(response, 200);
      }
    }
  );
  router.patch(
    "/:id",
    validator.validate({
      params: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string" } },
      },
      body: "members.json#/definitions/update",
    }),
    async function (request, response, next) {
      const { params, body } = request;
      const Model = db.model(body.role + "s");
      if (!Model) {
        throw interchange.error(401, `model ${body.role} not exists`);
      }
      const data = await Model.findByPk(+params.id);
      const copy = Object.assign({}, data.toJSON());
      if (data) {
        await data.update({
          image: body.image ?? undefined,
          name: body.name,
          email: body.email,
          role: body.role,
          password: body.password,
        });

        interchange.success(response, 200, copy);
      } else {
        interchange.error(401, "data not exist");
      }
    }
  );
  router.put(
    "/",
    validator.validate({ body: "members.json#/definitions/undo" }),
    async function (request, response, next) {
      const transaction = await db.transaction();
      try {
        const { body } = request;
        const jobs = [];
        for (const user of body) {
          const Model = db.model(user.role + "s");
          if (!Model) {
            throw interchange.error(401, `model ${user.role} not exists`);
          }
          jobs.push(Model.upsert(user, { transaction }));
        }
        await Promise.all(jobs);
        await transaction.commit();
        interchange.success(response, 200);
      } catch (error) {
        await transaction.rollback();
        next(interchange.error(500, error));
      }
    }
  );
  router.delete(
    "/",
    validator.validate({ body: "members.json#/definitions/remove_many" }),
    async function (request, response, next) {
      const transaction = await db.transaction();
      try {
        const { body } = request;
        const users = [];
        const removed = [];
        for (const data of body) {
          const Model = db.model(data.role + "s");
          if (!Model) {
            throw interchange.error(401, `model ${data.role} not exists`);
          }
          const result = await Model.findOne({
            where: {
              id: data.id,
            },
          });
          users.push(result);
          removed.push(result.toJSON());
          await Model.destroy({
            where: {
              id: data.id,
            },
            transaction,
          });
        }
        await transaction.commit();
        interchange.success(response, 200, removed);
      } catch (error) {
        await transaction.rollback();
        next(interchange.error(500, error));
      }
    }
  );
  router.post(
    "/signin",
    validator.validate({
      body: {
        type: "object",
        properties: {
          username: {
            type: "string",
          },
          password: {
            type: "string",
          },
        },
      },
    }),
    authc.jwt_gen(async function (request, response, next) {
      try {
        const { body } = request;
        let data;

        for (const model of ["admins", "supervisors"]) {
          const DModel = db.model(model);
          if (DModel) {
            const result = await DModel.findOne({
              where: { username: body.username },
            });
            if (result) {
              data = result;
              break;
            }
          } else {
            throw interchange.error(401, `model not exists`);
          }
        }
        if (!data) {
          throw interchange.error(401, `user not exists`);
        }
        const user = data.toJSON();
        if (body.password != user.password) {
          throw interchange.error(401, "username or password wrong");
        }
        request.user = user;
        return {
          sub: user.id,
          role: user.role,
          opt: {
            issuer: "user",
            expiresIn: "1h",
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
  router.get(
    "/auth",
    router_auth_refresh,
    async function (request, response, next) {
      try {
        const token = request[Authentication.Symbol.jwt_token];
        const member = request[Authentication.Symbol.auth_info];
        interchange.success(response, 200, { token, user: member });
      } catch (error) {
        next(error);
      }
    }
  );
  router.post(
    "/permission",
    validator.validate({ body: { type: "object" } }),
    async function (request, response, next) {
      try {
        /**
         * @type {{body: Object<string, string[]>}}
         */
        const { body } = request;

        console.log(body);

        logger.profile("enforce");
        const data = {};
        for (const [key, value] of Object.entries(body)) {
          data[key] = await authz.enforce(...value);
        }
        logger.profile("enforce");

        interchange.success(response, 200, data);
      } catch (error) {
        next(error);
      }
    }
  );
  router.post("/image/*", function (req, res, nx) {
    if (!req.is("image/*")) {
      return nx(interchange.error(406));
    }
    const name = Object.values(req.params).join("/");
    if (!name) {
      return nx(interchange.error(400));
    }
    const file_name = `${name}.${req.get("content-type").substring(6)}`;
    const file_path = path.join(root, "storage/images", file_name);
    const stream = fs.createWriteStream(file_path);

    req.pipe(stream);

    stream.once("error", (error) => {
      nx(interchange.error(500, error));
    });
    stream.once("finish", () => {
      interchange.success(res, 201, path.join("/resources/images", file_name));
    });
  });

  logger.profile(`api ${api_name}`);

  return router;
};
