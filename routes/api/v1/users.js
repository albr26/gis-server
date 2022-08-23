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

const api_name = "users";
const api_version = "1";
const root = process.cwd();

/**
 * @param {import('express').Application} app
 */
module.exports = async function (app) {
  const logger = new Logger({ context: `api:${api_name}:v${api_version}` });

  logger.profile(`api ${api_name}`);

  const middleware_auth = await middleware_auth_ctor(app);
  middleware_auth.register(router);

  logger.profile(`api ${api_name}`);

  return router;
};
