const express = require("express");
// const router = express.Router();
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

const middleware_name = "auth";
const middleware_version = "1";
const root = process.cwd();
const authc_key = process.env.JWT_KEY;
const debug = process.env.NODE_ENV == "development";
const schema = require("#schema/v2/auth");
const config = {
  issuer: "auth",
  expire: "1h",
  roles: schema.definitions.data.properties.role.enum,
  models: ["admins", "supervisors"],
  usr_root: {
    username: process.env.ROOT_NAME,
    password: process.env.ROOT_PASS,
    id: 1,
    image: "",
    name: "root",
    nip: "0000",
    role: "root",
  },
};

/**
 * @param {import('express').Application} app
 */
module.exports = async function (app) {
  const logger = new Logger({
    context: `middleware:${middleware_name}:v${middleware_version}`,
  });

  logger.profile(`middleware ${middleware_name}`);

  const db = Database.inject("app");
  const interchange = new Interchange({
    name: middleware_name,
    version: middleware_version,
    debug,
    logger: logger,
  });
  const validator = new Validator({
    name: middleware_name,
    version: middleware_version,
    debug,
    logger: logger,
    schemas: [schema],
  });
  const authc = new Authentication({
    name: middleware_name,
    version: middleware_version,
    description: "",
    debug,
    logger: logger,
    jwt: { secretKey: authc_key },
  });
  const authz = new Authorization({
    name: middleware_name,
    version: middleware_version,
    description: "",
    debug,
    logger: logger,
    rbac: {
      p_conf: path.join(root, "config/rbac-ext.conf"),
      p_data: path.join(root, "data/rbac-ext.csv"),
    },
  });

  await authc.init();
  await authz.init();

  const router_authc = authc.jwt_auth(
    async function (req, res, nx) {
      return {
        issuer: config.issuer,
      };
    },
    async function (payload, req, res, nx) {
      const { sub: id, role } = payload;
      if (role == config.usr_root.role && id == config.usr_root.id) {
        return config.usr_root;
      }
      const Model = db.model(role + "s");
      if (!Model) {
        nx(interchange.error(401, `model "${role}" not exists`));
      }
      const user = await Model.findOne({ where: { id } });
      if (!user) {
        nx(interchange.error(401, `user "${role}" not exists`));
      }
      return user.toJSON();
    }
  );
  const router_authz = authz.rbac_auth(async function (req, res, nx) {
    // console.log(req.route);
    const role = req[authc.s.auth_info].role;
    if (role == config.usr_root.role) {
      return;
    }
    if (!/\/api\/v\d\/.*/.test(req.originalUrl)) {
      throw new Error("not supported api", {
        cause: "middleware not in api route",
      });
    }
    let resource = req.originalUrl.replace(/\/api\/v\d\/(\w*)\/?.*/, "$1");
    let action = "x";
    let number = "o";
    switch (req.method) {
      case "GET":
        if (req.route) {
          if (req.route.path != "/:id") {
            number = "a";
          }
        }
        action = "r";
        break;
      case "POST":
      case "PUT":
        action = "c";
        break;
      case "PATCH":
        action = "u";
        break;
      case "DELETE":
        action = "d";
        break;
    }
    if (req.is("json")) {
      if (Array.isArray(req.body)) {
        number = "a";
      }
    }
    return {
      role,
      resource,
      action,
      number,
    };
  });

  const router_auth_refresh = authc.jwt_auth(
    async function (req, res, nx) {
      return {
        issuer: config.issuer,
      };
    },
    async function (payload, req, res, nx) {
      const { sub: id, role } = payload;
      if (role == config.usr_root.role && id == config.usr_root.id) {
        return config.usr_root;
      }
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
      request.user = user;
      return {
        sub: user.id,
        role: user.role,
        opt: {
          issuer: config.issuer,
          expiresIn: config.expire,
        },
      };
    }
  );

  /**
   * @param {import("sequelize/types").Identifier} id
   * @param {import("sequelize/types").Transaction} transaction
   */
  async function get(id, role, transaction) {
    const Model = db.model(role + "s");
    if (!Model) {
      throw interchange.error(401, `Model "${role + "s"}" Not Found`);
    }
    const result = await Model.findByPk(id, { transaction });
    if (!result) {
      throw new Error("User Not Found");
    }
    return result;
  }

  /**
   * @param {import('express').Router} router
   * @returns {import('express').Router}
   */
  const register = function (router) {
    router.post(
      "/signup",
      validator.validate({ body: "auth.json#/definitions/signup" }),
      async function (request, response, next) {
        const { body } = request;
        try {
          const Model = db.model(body.role + "s");
          if (!Model) {
            throw interchange.error(401, `model "${body.role}" not exists`);
          }
          const data = await Model.findOne({
            where: { username: body.username },
          });
          if (data) {
            throw interchange.error(400, "user already exist");
          } else {
            delete body.role;
            await Model.create(body);
            interchange.success(response, 200);
          }
        } catch (error) {
          next(error);
        }
      }
    );
    router.post(
      "/signin",
      validator.validate({ body: "auth.json#/definitions/signin" }),
      authc.jwt_gen(async function (request, response, next) {
        try {
          const { body } = request;
          if (
            config.usr_root.username == body.username &&
            config.usr_root.password == body.password
          ) {
            request.user = config.usr_root;
            return {
              sub: config.usr_root.id,
              role: config.usr_root.role,
              opt: {
                issuer: config.issuer,
                expiresIn: config.expire,
              },
            };
          }
          let data;
          for (const model of config.roles) {
            const DModel = db.model(model + "s");
            if (DModel) {
              const result = await DModel.findOne({
                where: { username: body.username },
              });
              if (result) {
                data = result;
                break;
              }
            } else {
              throw interchange.error(401, `model "${model}" not exists`);
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
              issuer: config.issuer,
              expiresIn: config.expire,
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
      function (request, response, next) {
        const token = request[authc.s.jwt_token];
        const user = request.user;
        interchange.success(response, 200, { token, user: user });
      }
    );
    router
      .route("/")
      .get(router_authc, router_authz, async function (req, res, nx) {
        const users = [];
        try {
          for (const name of config.models) {
            const Model = db.model(name);
            const data = await Model.findAll();
            users.push(...data);
          }
          interchange.success(res, 200, users);
        } catch (error) {
          nx(error);
        }
      })
      .post(function (req, res, nx) {
        nx(interchange.error(501));
      })
      .patch(
        router_authc,
        router_authz,
        validator.validate({ body: "auth.json#/definitions/update" }),
        async function (req, res, nx) {
          const { body } = req;
          const tr = await db.transaction();
          let payload;
          try {
            if (Array.isArray(body)) {
              const list = [];
              for (const item of body) {
                const result = await get(item.id, item.role, tr);
                if (result) {
                  delete item.id;
                  delete item.username;
                  delete item.role;
                  await result.update(item);
                  list.push(result.toJSON());
                }
              }
              payload = list;
            } else {
              const result = await get(body.id, body.role, tr);
              if (result) {
                delete body.id;
                delete body.username;
                delete body.role;
                await result.update(body);
                payload = result.toJSON();
              }
            }
            await tr.commit();
            interchange.success(res, 200, payload);
          } catch (error) {
            await tr.rollback();
            nx(error);
          }
        }
      )
      .delete(router_authc, router_authz, async function (req, res, nx) {
        const { body } = req;
        const tr = await db.transaction();
        let payload;
        try {
          if (Array.isArray(body)) {
            const list = [];
            for (const item of body) {
              const result = await get(item.id, item.role, tr);
              if (result) {
                list.push(result.toJSON());
                await result.destroy();
              }
            }
            payload = list;
          } else {
            const result = await get(body.id, body.role, tr);
            if (result) {
              payload = result.toJSON();
              await result.destroy();
            }
          }
          await tr.commit();
          interchange.success(res, 200, payload);
        } catch (error) {
          await tr.rollback();
          nx(error);
        }
      })
      .put(router_authc, router_authz, async function (req, res, nx) {
        const tr = await db.transaction();
        let { body } = req;
        try {
          if (!Array.isArray(body)) {
            body = [body];
          }
          for (const item of body) {
            const name = item.role + "s";
            const Model = db.model(name);
            if (Model) {
              await Model.upsert(item, { transaction: tr });
            } else {
              throw new Error(`model ${name} not found`);
            }
          }
          await tr.commit();
          interchange.success(res, 200, body);
        } catch (error) {
          await tr.rollback();
          nx(error);
        }
      });

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

    return router;
  };

  logger.profile(`middleware ${middleware_name}`);

  return {
    config,
    schema,
    register,
    router_authc,
    router_authz,
    router_auth_refresh,
  };
};
