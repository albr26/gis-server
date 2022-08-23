"use strict";
module.exports = {
  /**
   * @param {import('sequelize').QueryInterface} queryInterface
   * @param {import('sequelize').DataTypes} Sequelize
   */
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("reports", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      id_projects: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "projects", key: "id" },
      },

      project_copy: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      reported_at: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      preparation: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      base_building: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      structure: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      supervisor_instruction: {
        type: Sequelize.TEXT,
        allowNull: false,
      },

      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("reports");
  },
};
