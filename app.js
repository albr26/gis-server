const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const loggerHttp = require("morgan");
const createHttpError = require("http-errors");
const rfs = require("rotating-file-stream");
const fs = require("fs");
const path = require("path");

const Logger = require("#root/lib/logger");
const Database = require("#lib/database");
const Interchange = require("#root/lib/interchange");
const limitter = require("#root/lib/limitter");

const app = express();
const { env } = process;

const model_admins = require("#model/admins");
const model_supervisors = require("#model/supervisors");
const model_projects = require("#model/projects");
const model_reports = require("#root/database/models/reports");

// const routesApiV0Account = require("#routes/api/v0/account");
// const routes_api_v1_members = require("#api/v1/members");
const routes_api_v1_users = require("#api/v1/users");
const routes_api_v1_resources = require("#api/v1/resources");
const routes_api_v1_models = require("#api/v1/models");
const routes_api_v1_admins = require("#api/v1/admins");
const routes_api_v1_supervisors = require("#api/v1/supervisors");
const routes_api_v1_projects = require("#api/v1/projects");
const routes_api_v1_reports = require("#api/v1/reports");
// const routesLangEnAccount = require("#routes/lang/en/account");

const routes_setting = require("#routes/setting/index");

loggerHttp.token("protocol", function (req, res) {
  // @ts-ignore
  return req.protocol;
});
loggerHttp.token("status-code", function (req, res) {
  return res.statusMessage;
});

async function init() {
  const logger = await new Logger({
    context: "app:v1",
  }).default();
  const db = new Database({
    name: "app",
    url: env.DB_URL,
    model_loaders: [
      model_admins,
      model_supervisors,
      model_projects,
      model_reports,
    ],
    logger: logger,
  });

  await db.init();

  app.on("close", async function () {
    await db.close();
  });

  app.disable("x-powered-by");
  app.set("trust proxy", env.BEHIND_PROXY ? 1 : false);
  app.set("views", path.join(__dirname, "views"));
  app.set("view engine", "ejs");

  app.set("database", db.connected);
  app.set(
    "storage",
    await fs.promises
      .access(path.join(process.cwd(), "storage"), fs.constants.F_OK)
      .then(
        () => true,
        () => false
      )
  );
  app.set("environment", !!env.SERVER_HAS_ENV);

  app.use(limitter);
  app.use(
    loggerHttp(env.LOG_STDOUT ? "dev" : env.LOG_FORMAT, {
      stream: env.LOG_STDOUT
        ? process.stdout
        : rfs.createStream(env.LOG_FILE, {
            interval: "1d",
            path: path.join(__dirname, env.LOG_DIR),
          }),
    })
  );

  // @ts-ignore
  app.use(helmet());
  app.use("lang", cookieParser());
  app.use(
    "lang",
    session({
      secret: "secret",
      name: "sessionId",
      resave: true,
      saveUninitialized: true,
    })
  );
  app.use("/public", express.static(path.join(__dirname, "public")));

  app.use("/setting", await routes_setting(app));

  app.use("/api", express.json(), express.urlencoded({ extended: true }));
  // app.use("/api/v1/members", await routes_api_v1_members(app));
  app.use("/api/v1/users", await routes_api_v1_users(app));
  app.use("/api/v1/resources", await routes_api_v1_resources(app));
  app.use("/api/v1/models", await routes_api_v1_models(app));
  app.use("/api/v1/admins", await routes_api_v1_admins(app));
  app.use("/api/v1/supervisors", await routes_api_v1_supervisors(app));
  app.use("/api/v1/projects", await routes_api_v1_projects(app));
  app.use("/api/v1/reports", await routes_api_v1_reports(app));
  app.use("/api", Interchange.not_found_middle(), Interchange.error_middle());

  app.use(function (req, res, nx) {
    nx(createHttpError(404));
  });
  app.use(function (err, req, res, next) {
    if (res.headersSent) {
      next();
    }
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};

    res.status(err.status || 500);
    res.render("error");
  });

  return app;
}

module.exports = init;
module.exports.app = app;
