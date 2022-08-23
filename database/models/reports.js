"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class reports extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.belongsTo(models.projects, {
        foreignKey: {
          name: "id_projects",
          allowNull: false,
        },
      });
    }
  }
  reports.init(
    {
      id_projects: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "projects", key: "id" },
      },

      project_copy: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      reported_at: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      preparation: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      base_building: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      structure: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      supervisor_instruction: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "reports",
      underscored: true,
    }
  );
  return reports;
};
