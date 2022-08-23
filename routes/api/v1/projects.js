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

const api_name = "projects";
const api_version = "1";
const root = process.cwd();
// const schema = require("#schema/v1/projects");
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
   * @type {App.Models.CtorProjects}
   */
  const Model = db.model(api_name);
  /**
   * @type {App.Models.CtorReports}
   */
  const Model_Reports = db.model("reports");

  await fs.promises.mkdir(path.join(root, "storage/images"), {
    recursive: true,
  });
  await fs.promises.mkdir(path.join(root, "storage/proposals"), {
    recursive: true,
  });

  router.get(
    "/",
    middleware_auth.router_authc,
    middleware_auth.router_authz,
    async function (req, res, nx) {
      try {
        let payload;
        if (req[authc.s.auth_info].role == "supervisor") {
          payload = await Model.findAll({
            include: {
              association: "supervisor",
              where: { id: req[authc.s.auth_info].id },
            },
          });
        } else {
          payload = await Model.findAll();
        }
        interchange.success(res, 200, payload);
      } catch (error) {
        nx(error);
      }
    }
  );
  router.get("/public", async function (req, res, nx) {
    try {
      interchange.success(
        res,
        200,
        await Model.findAll({
          attributes: {
            exclude: [
              "id",
              "id_admins",
              "id_supervisors",
              "createdAt",
              "updatedAt",
            ],
          },
        })
      );
    } catch (error) {
      nx(error);
    }
  });
  router.post(
    "/create",
    middleware_auth.router_authc,
    authz.rbac_auth(async function (req, res, nx) {
      return {
        role: req[authc.s.auth_info].role,
        resource: api_name,
        action: "write",
        number: "one",
      };
    }),
    validator.validate({
      body: "index.json#/definitions/projects/definitions/create",
    }),
    async function (req, res, nx) {
      try {
        const project = await Model.create(req.body);

        interchange.success(res, 201, "created");
      } catch (error) {
        nx(interchange.error(500, error));
      }
    }
  );
  router
    .route("/:id")
    .get(
      middleware_auth.router_authc,
      middleware_auth.router_authz,
      async function (req, res, nx) {
        try {
          const {
            params: { id },
            query: { includes = [] },
          } = req;
          const include = Array.isArray(includes)
            ? includes.map((rel) => ({ association: rel }))
            : { association: includes };
          const model = await Model.findOne({
            where: { id },
            // @ts-ignore
            include,
            // include: includes,
          });

          const project = model.toJSON();
          interchange.success(res, 200, project);
        } catch (error) {
          nx(interchange.error(500, error));
        }
      }
    )
    .patch(
      middleware_auth.router_authc,
      middleware_auth.router_authz,
      validator.validate({
        body: "index.json#/definitions/projects/definitions/update",
      }),
      async function (req, res, nx) {
        try {
          const {
            body,
            params: { id },
          } = req;
          const model = await Model.findOne({ where: { id } });

          const project = model.toJSON();
          const image = project.image.replace("resources", "storage");
          const image_path = path.join(root, image);
          const proposal = project.proposal.replace("resources", "storage");
          const proposal_path = path.join(root, proposal);

          if (body.image != project.image) {
            await fs.promises
              .access(image_path, fs.constants.F_OK)
              .then(() => fs.promises.rm(image_path))
              .catch((err) => {});
          }
          if (body.proposal != project.proposal) {
            await fs.promises
              .access(proposal_path, fs.constants.F_OK)
              .then(() => fs.promises.rm(proposal_path))
              .catch((err) => {});
          }

          await model.update(body);

          interchange.success(res, 200, "updated");
        } catch (error) {
          nx(interchange.error(500, error));
        }
      }
    )
    .delete(
      middleware_auth.router_authc,
      middleware_auth.router_authz,
      async function (req, res, nx) {
        try {
          const {
            params: { id },
          } = req;
          const model = await Model.findOne({ where: { id } });
          const project = model.toJSON();
          const image = project.image.replace("resources", "storage");
          const proposal = project.proposal.replace("resources", "storage");
          const img_path = path.join(root, image);
          const proposal_path = path.join(root, proposal);

          await Promise.all([
            fs.promises
              .access(img_path, fs.constants.F_OK)
              .then(() => fs.promises.rm(img_path))
              .catch((err) => {}),
            fs.promises
              .access(proposal_path, fs.constants.F_OK)
              .then(() => fs.promises.rm(proposal_path))
              .catch((err) => {}),
          ]);
          await model.destroy();

          interchange.success(res, 200, "deleted");
        } catch (error) {
          nx(interchange.error(500, error));
        }
      }
    );
  router.get("/name/:name", async function (req, res, nx) {
    try {
      const project = await Model.findOne({
        where: { name: req.params.name },
        // include: {
        //   model: Model_Reports,
        //   attributes: { exclude: ["createdAt", "updatedAt"] },
        // },
        attributes: { exclude: ["createdAt", "updatedAt"] },
      });
      interchange.success(res, 200, project);
    } catch (error) {
      nx(interchange.error(500, error));
    }
  });
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
  router.post("/proposal/*", function (req, res, nx) {
    if (!req.is("application/pdf")) {
      return nx(interchange.error(406));
    }
    const name = Object.values(req.params).join("/");
    if (!name) {
      return nx(interchange.error(400));
    }
    const file_name = `${name}.pdf`;
    const file_path = path.join(root, "storage/proposals", file_name);
    const stream = fs.createWriteStream(file_path);

    req.pipe(stream);

    stream.once("error", (error) => {
      nx(interchange.error(500, error));
    });
    stream.once("finish", () => {
      interchange.success(
        res,
        201,
        path.join("/resources/proposals", file_name)
      );
    });
  });

  logger.profile(`api ${api_name}`);

  return router;
};
