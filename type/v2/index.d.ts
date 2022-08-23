/* tslint:disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

export interface Schema {
  [k: string]: unknown;
}
/**
 * This interface was referenced by `Schema`'s JSON-Schema
 * via the `definition` "admins".
 */
export interface Admins {
  id: number;
  username: string;
  password: string;
  image: string;
  name: string;
  nip: string;
  role?: string | null;
  createdAt: string;
  updatedAt: string;
  projects?: Projects[];
  [k: string]: unknown;
}
/**
 * This interface was referenced by `Schema`'s JSON-Schema
 * via the `definition` "projects".
 */
export interface Projects {
  id: number;
  image: string;
  name: string;
  name_company: string;
  contract_number: number;
  contract_date: string;
  activity: string;
  status: string;
  progress: number;
  fund_source: string;
  fiscal_year: string;
  coordinate: number[];
  address: string[];
  proposal: string;
  createdAt: string;
  updatedAt: string;
  reports?: Reports[];
  supervisor?: Supervisors;
  admin?: Admins;
  [k: string]: unknown;
}
/**
 * This interface was referenced by `Schema`'s JSON-Schema
 * via the `definition` "reports".
 */
export interface Reports {
  id: number;
  project_copy: unknown;
  reported_at: string;
  preparation: string;
  base_building: string;
  structure: string;
  supervisor_instruction: string;
  createdAt: string;
  updatedAt: string;
  project?: Projects;
  [k: string]: unknown;
}
/**
 * This interface was referenced by `Reports`'s JSON-Schema
 * via the `definition` "create".
 */
export interface ReportsCreate {
  id?: number;
  project_copy: unknown;
  reported_at: string;
  preparation: string;
  base_building: string;
  structure: string;
  supervisor_instruction: string;
  createdAt?: string;
  updatedAt?: string;
  project?: Projects;
  [k: string]: unknown;
}
/**
 * This interface was referenced by `Reports`'s JSON-Schema
 * via the `definition` "update".
 */
export interface ReportsUpdate {
  id?: number;
  project_copy?: unknown;
  reported_at?: string;
  preparation?: string;
  base_building?: string;
  structure?: string;
  supervisor_instruction?: string;
  createdAt?: string;
  updatedAt?: string;
  project?: Projects;
  [k: string]: unknown;
}
/**
 * This interface was referenced by `Schema`'s JSON-Schema
 * via the `definition` "supervisors".
 */
export interface Supervisors {
  id: number;
  username: string;
  password: string;
  image: string;
  name: string;
  nip: string;
  role?: string | null;
  createdAt: string;
  updatedAt: string;
  project?: Projects;
  [k: string]: unknown;
}
/**
 * This interface was referenced by `Supervisors`'s JSON-Schema
 * via the `definition` "create".
 */
export interface SupervisorsCreate {
  id?: number;
  username: string;
  password: string;
  image: string;
  name: string;
  nip: string;
  role?: string | null;
  createdAt?: string;
  updatedAt?: string;
  project?: Projects;
  [k: string]: unknown;
}
/**
 * This interface was referenced by `Supervisors`'s JSON-Schema
 * via the `definition` "update".
 */
export interface SupervisorsUpdate {
  id?: number;
  username?: string;
  password?: string;
  image?: string;
  name?: string;
  nip?: string;
  role?: string | null;
  createdAt?: string;
  updatedAt?: string;
  project?: Projects;
  [k: string]: unknown;
}
/**
 * This interface was referenced by `Projects`'s JSON-Schema
 * via the `definition` "create".
 */
export interface ProjectsCreate {
  id?: number;
  image: string;
  name: string;
  name_company: string;
  contract_number: number;
  contract_date: string;
  activity: string;
  status: string;
  progress: number;
  fund_source: string;
  fiscal_year: string;
  coordinate: number[];
  address: string[];
  proposal: string;
  createdAt?: string;
  updatedAt?: string;
  reports?: Reports[];
  supervisor?: Supervisors;
  admin?: Admins;
  [k: string]: unknown;
}
/**
 * This interface was referenced by `Projects`'s JSON-Schema
 * via the `definition` "update".
 */
export interface ProjectsUpdate {
  id?: number;
  image?: string;
  name?: string;
  name_company?: string;
  contract_number?: number;
  contract_date?: string;
  activity?: string;
  status?: string;
  progress?: number;
  fund_source?: string;
  fiscal_year?: string;
  coordinate?: number[];
  address?: string[];
  proposal?: string;
  createdAt?: string;
  updatedAt?: string;
  reports?: Reports[];
  supervisor?: Supervisors;
  admin?: Admins;
  [k: string]: unknown;
}
/**
 * This interface was referenced by `Admins`'s JSON-Schema
 * via the `definition` "create".
 */
export interface AdminsCreate {
  id?: number;
  username: string;
  password: string;
  image: string;
  name: string;
  nip: string;
  role?: string | null;
  createdAt?: string;
  updatedAt?: string;
  projects?: Projects[];
  [k: string]: unknown;
}
/**
 * This interface was referenced by `Admins`'s JSON-Schema
 * via the `definition` "update".
 */
export interface AdminsUpdate {
  id?: number;
  username?: string;
  password?: string;
  image?: string;
  name?: string;
  nip?: string;
  role?: string | null;
  createdAt?: string;
  updatedAt?: string;
  projects?: Projects[];
  [k: string]: unknown;
}