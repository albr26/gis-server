"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class projects extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.hasMany(models.reports, {
        foreignKey: {
          name: "id_projects",
          allowNull: false,
        },
      });

      this.belongsTo(models.supervisors, {
        foreignKey: {
          name: "id_supervisors",
          allowNull: false,
        },
      });
      this.belongsTo(models.admins, {
        foreignKey: {
          name: "id_admins",
          allowNull: false,
        },
      });
    }
  }
  projects.init(
    {
      id_supervisors: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "supervisors", key: "id" },
      },
      id_admins: {
        allowNull: false,
        type: DataTypes.INTEGER,
        references: { model: "admins", key: "id" },
      },

      image: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      name_company: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      contract_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      contract_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      activity: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      progress: {
        type: DataTypes.TINYINT,
        allowNull: false,
      },
      fund_source: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      fiscal_year: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      coordinate: {
        type: DataTypes.ARRAY(DataTypes.FLOAT),
        allowNull: false,
      },
      address: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false,
      },
      proposal: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "projects",
      underscored: true,
    }
  );
  return projects;
};
