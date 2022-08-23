require("dotenv-expand").expand(require("dotenv").config());

const path = require("path");
const fs = require("fs");
const sjs = require("sequelize-json-schema");
const jst = require("json-schema-to-typescript");
const Logger = require("./logger");
const Database = require("./database");

const dir_schema = path.join(process.cwd(), "schema/v2");
const dir_type = path.join(process.cwd(), "type/v2");

const model_admins = require("#model/admins");
const model_supervisors = require("#model/supervisors");
const model_projects = require("#model/projects");
const model_reports = require("#model/reports");

const logger = new Logger({ context: `schema generator` }).default();
const db = new Database({
  name: "app",
  url: process.env.DB_URL,
  model_loaders: [
    model_admins,
    model_supervisors,
    model_projects,
    model_reports,
  ],
  logger,
});

logger.profile("generating schema");

const schema = {
  $id: "index.json",
  title: "Schema",
  ...sjs.getSequelizeSchema(db.connection),
};

for (const [key, value] of Object.entries(schema.definitions)) {
  value.definitions = {
    create: {
      title: `${key}_create`,
      type: "object",
      properties: {
        ...value.properties,
      },
      required: value.required.filter(
        (name) => !["id", "createdAt", "updatedAt", "deletedAt"].includes(name)
      ),
    },
    update: {
      title: `${key}_update`,
      type: "object",
      properties: {
        ...value.properties,
      },
      required: [],
    },
  };
}

fs.writeFileSync(
  path.join(dir_schema, schema["$id"]),
  JSON.stringify(schema, null, "\t")
);

jst
  // @ts-ignore
  .compile(schema, "index", { unreachableDefinitions: true })
  .then((value) => fs.writeFileSync(path.join(dir_type, "index.d.ts"), value))
  .catch((error) => {
    logger.error(error);
  });

logger.profile("generating schema");
logger.info("success generating schema & type");
