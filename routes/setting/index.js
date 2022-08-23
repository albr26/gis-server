const express = require("express");
const router = express.Router();

/**
 *
 * @param {import('express').Application} app
 * @returns
 */
module.exports = async function (app) {
  router.route("/").get(function (req, res, nx) {
    const sys = {
      node_ver: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      cpuUsage: process.cpuUsage(),
      resourceUsage: process.resourceUsage(),
      memoryUsage: process.memoryUsage(),
      hrtime: process.hrtime(),
      cwd: process.cwd(),
      pid: process.pid,
    };
    const reqs = {
      database: app.get("database"),
      storage: app.get("storage"),
      environment: app.get("environment"),
    };
    const env = require("dotenv-expand").expand(require("dotenv").config());

    res.render("setting", { env: env.parsed, sys, reqs });
  });

  return router;
};
