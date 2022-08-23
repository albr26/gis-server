const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const child_process = require("child_process");
const util = require("util");
const si = require("systeminformation");
const Logger = require("#lib/logger");
const Database = require("#lib/database");
const Authentication = require("#lib/authentication");
const Authorization = require("#lib/authorization");
const Validator = require("#lib/validator");
const Interchange = require("#lib/interchange");
const middleware_auth_ctor = require("#middleware/auth");

const api_name = "models";
const api_version = "1";
const root = process.cwd();
// const schema = require("#schema/v2/models");
const config = {
  dir_storage: path.join(root, "storage"),
};
const exec_script = util.promisify(child_process.exec);

function getDiskSize(path, logger) {
  logger.profile("execution disk util");
  return exec_script(`du ${path} -s | cut -f1`)
    .then((value) => {
      return value.stdout.toString();
    })
    .catch((error) => {
      logger.error(error);
      return "error";
    })
    .finally(() => {
      logger.profile("disk util");
    });
}

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
    // schemas: [schema],
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

  router.get(
    "/stats",
    middleware_auth.router_authc,
    middleware_auth.router_authz,
    async function (req, res, nx) {
      try {
        const admins = await db.model("admins").count();
        const supervisors = await db.model("supervisors").count();
        const projects = await db.model("projects").count();
        const reports = await db.model("reports").count();
        interchange.success(res, 200, {
          members: admins + supervisors,
          projects,
          reports,
          warn: 0,
          error: 0,
        });
      } catch (error) {
        nx(error);
      }
    }
  );
  router.get(
    "/system",
    middleware_auth.router_authc,
    async function (req, res, nx) {
      if (req[authc.s.auth_info].role != middleware_auth.config.usr_root.role) {
        return nx(interchange.error(403));
      }
      try {
        const cpu = await si.currentLoad().then((data) => {
          return {
            cpus: data.cpus.map((cpu) => ({ percent: data.currentLoad })),
            core: data.cpus.length,
            percent: data.currentLoad,
          };
        });
        const mem = await si.mem().then((data) => {
          return {
            total: data.total / 1e9,
            active: data.active / 1e9,
            percent: (data.active / data.total) * 100,
          };
        });
        const disk = await si.fsSize().then((data) => {
          return data.reduce(
            (prev, curr) => {
              prev.total += curr.size / 1e9;
              prev.active += curr.used / 1e9;
              prev.percent += curr.use;
              prev.part++;
              return prev;
            },
            { total: 0, active: 0, part: 0, percent: 0 }
          );
        });
        const nio = await si.networkStats().then((data) => {
          return data.reduce(
            (prev, curr) => {
              prev.receive += curr.rx_bytes / 1e6;
              prev.transfer += curr.tx_bytes / 1e6;
              return prev;
            },
            { receive: 0, transfer: 0 }
          );
        });
        const dio = await si.disksIO().then((data) => {
          return {
            read: data.rIO / 1e6,
            write: data.wIO / 1e6,
            total: data.tIO / 1e6,
          };
        });
        const battery = await si.battery().then((data) => {
          return {
            total: data.maxCapacity,
            active: data.currentCapacity,
            isCharging: data.isCharging,
            percent: data.percent,
          };
        });
        const instance = await si.processLoad("node").then((data) => {
          return data.reduce(
            (prev, curr) => {
              prev.proc++;
              prev.cpu += curr.cpu;
              prev.mem += curr.mem;
              return prev;
            },
            {
              proc: 0,
              cpu: 0,
              mem: 0,
            }
          );
        });
        const os = await si.osInfo().then((data) => {
          return {
            arch: data.arch,
            platform: data.platform,
            distro: data.distro,
            release: data.release,
          };
        });
        const mod = await si.versions().then((data) => {
          return {
            node: data.node,
            npm: data.npm,
            nginx: data.nginx,
            postgresql: data.postgresql,
            pm2: data.pm2,
          };
        });
        interchange.success(res, 200, {
          cpu,
          mem,
          disk,
          nio,
          dio,
          battery,
          instance,
          os,
          mod,
        });
      } catch (error) {
        nx(error);
      }
    }
  );
  // const route_safe_model = function (req, res, nx) {
  //   const Model = db.model(req.params.model);
  //   if (!Model) {
  //     return nx(`Unknown Model ${req.params.model}`);
  //   }
  //   nx();
  // };
  router
    .route("/:model")
    .get(
      middleware_auth.router_authc,
      middleware_auth.router_authz,
      async function (req, res, nx) {
        try {
          const Model = db.model(req.params.model);
          if (!Model) {
            throw new Error(`Unknown Model ${req.params.model}`);
          }
          interchange.success(res, 200, await Model.findAll());
        } catch (error) {
          nx(error);
        }
      }
    )
    .patch(
      middleware_auth.router_authc,
      middleware_auth.router_authz,
      async function (req, res, nx) {
        const tr = await db.transaction();
        try {
          const Model = db.model(req.params.model);
          if (!Model) {
            throw new Error(`Unknown Model ${req.params.model}`);
          }
          if (!Array.isArray(req.body)) {
            req.body = [req.body];
          }
          const list = [];
          for (const item of req.body) {
            const model = await Model.findByPk(item.id, { transaction: tr });
            list.push(model.toJSON());
            await model.update(item.value, { transaction: tr });
          }
          await tr.commit();
          interchange.success(res, 200, list);
        } catch (error) {
          await tr.rollback();
          nx(error);
        }
      }
    )
    .delete(
      middleware_auth.router_authc,
      middleware_auth.router_authz,
      async function (req, res, nx) {
        const tr = await db.transaction();
        try {
          const Model = db.model(req.params.model);
          if (!Model) {
            throw new Error(`Unknown Model ${req.params.model}`);
          }
          if (!Array.isArray(req.body)) {
            req.body = [req.body];
          }
          const list = [];
          for (const item of req.body) {
            const model = await Model.findByPk(item, { transaction: tr });
            list.push(model.toJSON());
            await model.destroy({ transaction: tr });
          }
          await tr.commit();
          interchange.success(res, 200, list);
        } catch (error) {
          await tr.rollback();
          nx(error);
        }
      }
    );
  logger.profile(`api ${api_name}`);

  return router;
};
