const express = require("express");
const router = express.Router();
const httpErrors = require("http-errors");
const path = require("path");
const Logger = require("#root/lib/logger");
const LocalDB = require("#root/lib/localdb");
const Authentication = require("#root/lib/authentication");
const Authorization = require("#root/lib/authorization");
const Validator = require("#root/lib/validator");

/**
 * @param {import('express').Application} app
 */
module.exports = async function (app) {
  const root = process.env.PWD;
  const logger = new Logger({ context: "accounts" });
  const db = LocalDB.create("app");
  const validator = new Validator({
    name: "accounts",
    version: "0",
    debug: true,
  });
  const authc = new Authentication({
    name: "accounts",
    version: "0",
    description: "",
    debug: true,
    jwt: { secretKey: "secret" },
  });
  const authz = new Authorization({
    name: "accounts",
    version: "0",
    description: "",
    debug: true,
    rbac: {
      p_conf: path.join(root, "data/rbac.conf"),
      p_data: path.join(root, "data/rbac.csv"),
    },
  });

  await logger.default();
  await authc.init();
  await authz.init();
  // await db.sync();

  // logger.createLogger({ context: "accounts" });

  const accounts = db.create("accounts", []);

  // app.on("close", async function () {
  //   await db.close();
  // });

  // router.head("/auth");
  router.post(
    "/signup",
    function (req, res, next) {
      const error = new httpErrors.Unauthorized();
      // console.log(
      //   error.headers,
      //   error.status,
      //   error.name,
      //   error.message,
      //   error.expose,
      // );
      httpErrors.isHttpError(error);
      res.send(error);
    },
    validator.validate(require("#schema/accounts")),
    authc.jwt_gen(async function (request, response, next) {
      const account = request.body;

      const data = accounts.find((item) => item.username == account.username);

      if (data) {
        throw new httpErrors.BadRequest("data already exists");
      }

      account.id = Date.now();
      accounts.push(account);
      db.set("accounts", accounts);
      db.sync();

      return {
        opt: {
          issuer: "accounts",
          subject: account.id + "",
          audience: account.role,
        },
      };
    }),
    function (request, response, next) {
      response.send({
        status: "success",
        data: { token: request[Authentication.Symbol.jwt_token] },
      });
    }
  );
  router.post(
    "/signin",
    authc.jwt_gen(async function (request, response, next) {
      const { body } = request;
      const account = accounts.find(
        (account) => account.username == body.username
      );
      if (account) {
        if (account.password != body.password) {
          throw new httpErrors.Unauthorized();
        }
        return {
          opt: {
            issuer: "accounts",
            subject: account.id + "",
            audience: account.role,
          },
        };
      }
      throw new httpErrors.NotFound("data not exists");
    }),
    function (request, response, next) {
      response.send({
        status: "success",
        data: { token: request[Authentication.Symbol.jwt_token] },
      });
    }
  );
  // router.get(
  //   "/auth",
  //   authc.jwt_auth(
  //     async function (request, response, next) {
  //       return { issuer: "accounts" };
  //     },
  //     async function (payload, request, response, next) {
  //       const account = accounts.find((account) => account.id == payload.sub);
  //       return account;
  //     }
  //   ),
  //   authz.rbac_auth(async function (request, response, next) {
  //     const info = request[Authentication.Symbol.auth_info];
  //     return {
  //       role: info.role,
  //       resource: "accounts",
  //       action: "readwrite",
  //     };
  //   }),
  //   function (request, response, next) {
  //     const user = request[Authentication.Symbol.auth_info];
  //     response.send({ status: "success", data: user });
  //   }
  // );
  // router.get("/signout");

  return router;
};
