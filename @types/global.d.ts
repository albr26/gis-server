import { Model, ModelStatic, Optional } from "sequelize";
import { SchemaProjects } from "../type/v1/projects";
import { SchemaTasks } from "../type/v1/tasks";
import { SchemaAdmins } from "../type/v1/admins";
import { SchemaSupervisors } from "../type/v1/supervisors";

import * as TypeV2 from "../type/v2/index";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production";
      PWD: string;
      DEBUG: string;
      BEHIND_PROXY: boolean;
      LOG_DIR: string;
      LOG_STDOUT: boolean;
      LOG_FILE: string;
      LOG_FORMAT: string;
      DOMAIN: string;
      PROTOCOL: string;
      HOSTNAME: string;
      PORT: number;
      HOST: string;
      PATH_API: string;
      URL_BS_API: string;
      DB_URL: string;
      SERVER_MODE: string;
      SERVER_HAS_ENV: boolean;
      JWT_KEY: string;
      ROOT_NAME: string;
      ROOT_PASS: string;
    }
  }
  namespace App {
    module Util {
      type GetReturnType<Type> = Type extends (...args: never[]) => infer Return
        ? Return
        : never;
    }
    module Models {
      type AttrDef = "id" | "createdAt" | "updatedAt";
      type UsersInterop = {
        username: string;
        password: string;
        image: string;
        name: string;
        nip: string;
        role: string;
      };

      class Projects extends Model<
        TypeV2.Projects,
        Optional<TypeV2.ProjectsCreate, AttrDef>
      > {}
      class Reports extends Model<
        TypeV2.Reports,
        Optional<TypeV2.ReportsCreate, AttrDef>
      > {}
      class Admins extends Model<
        TypeV2.Admins,
        Optional<TypeV2.AdminsCreate, AttrDef>
      > {}
      class Supervisors extends Model<
        TypeV2.Supervisors,
        Optional<TypeV2.SupervisorsCreate, AttrDef>
      > {}

      type CtorProjects = ModelStatic<Projects>;
      type CtorReports = ModelStatic<Reports>;
      type CtorAdmins = ModelStatic<Admins>;
      type CtorSupervisors = ModelStatic<Supervisors>;
    }
  }
}
