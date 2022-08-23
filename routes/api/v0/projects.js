const express = require("express");
const router = express.Router();
const httpErrors = require("http-errors");
const path = require("path");
const Logger = require("#root/lib/logger");
const LocalDB = require("#root/lib/localdb");
const Authentication = require("#root/lib/authentication");
const Authorization = require("#root/lib/authorization");

const api_name = "projects";
const api_version = "1";
const root = process.env.PWD;

/**
 * @param {import('express').Application} app
 */
module.exports = async function (app) {
  const logger = new Logger({ context: api_name });
  const db = LocalDB.create("app");
  const authc = new Authentication({
    name: api_name,
    version: api_version,
    description: "",
    debug: true,
    jwt: { secretKey: "secret" },
  });
  const authz = new Authorization({
    name: api_name,
    version: api_version,
    description: "",
    debug: true,
    rbac: {
      p_conf: path.join(root, "data/rbac.conf"),
      p_data: path.join(root, "data/rbac.csv"),
    },
  });

  await authc.init();
  await authz.init();
  await db.open();

  const projects = db.create(api_name, []);

  app.on("close", async function () {
    await db.close();
  });

  // router.head("/auth");
  router.post("/projects", function (request, response, next) {
    next(new httpErrors.Unauthorized());
    // response.send({
    //   status: "success",
    //   data: { token: {} },
    // });
  });
  // router.post(
  //   "/signin",
  //   authc.jwt_gen(async function (request, response, next) {
  //     const { body } = request;
  //     const account = projects.find(
  //       (account) => account.username == body.username
  //     );
  //     if (account) {
  //       return {
  //         opt: {
  //           issuer: api_name,
  //           subject: account.id + "",
  //           audience: account.role,
  //         },
  //       };
  //     }
  //     next(new httpErrors.NotFound("data not exists"));
  //   }),
  //   function (request, response, next) {
  //     response.send({
  //       status: "success",
  //       data: { token: request[Authentication.Symbol.jwt_token] },
  //     });
  //   }
  // );

  return router;
};
