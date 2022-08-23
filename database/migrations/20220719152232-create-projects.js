"use strict";
module.exports = {
  /**
   * @param {import('sequelize').QueryInterface} queryInterface
   * @param {import('sequelize').DataTypes} Sequelize
   */
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("projects", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      id_supervisors: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "supervisors", key: "id" },
      },
      id_admins: {
        allowNull: false,
        type: Sequelize.INTEGER,
        references: { model: "admins", key: "id" },
      },

      image: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      name_company: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      contract_number: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      contract_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      activity: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      progress: {
        type: Sequelize.SMALLINT,
        allowNull: false,
      },
      fund_source: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      fiscal_year: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      coordinate: {
        type: Sequelize.ARRAY(Sequelize.FLOAT),
        allowNull: false,
      },
      address: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        allowNull: false,
      },
      proposal: {
        type: Sequelize.STRING,
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
    await queryInterface.dropTable("projects");
  },
};
