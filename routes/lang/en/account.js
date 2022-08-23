const express = require("express");
const router = express.Router();

/**
 * @param {import('express').Application} app
 */
module.exports = async function (app) {
  router.get("/signin", function (req, res, next) {
    res.render("auth/signin");
  });
  router.get("/signup", function (req, res, next) {
    res.render("auth/signup");
  });

  return router;
};
