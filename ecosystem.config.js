module.exports = {
  apps: [
    {
      name: "server",
      namespace: "gis",
      script: "bin/www",
      args: "",
      cwd: ".",
      watch: false,
      ignore_watch: ["[/\\]./", "node_modules", "public", "data"],
      exec_mode: "fork",
      error_file: "log/pm2.error.log",
      out_file: "log/pm2.log",
      wait_ready: true,
      env_production: {
        NODE_ENV: "production",
      },
      env_development: {
        NODE_ENV: "development",
      },
    },
  ],

  deploy: {
    production: {
      user: "SSH_USERNAME",
      host: "SSH_HOSTMACHINE",
      ref: "origin/master",
      repo: "GIT_REPOSITORY",
      path: "DESTINATION_PATH",
      "pre-deploy-local": "",
      "post-deploy":
        "npm install && pm2 reload ecosystem.config.js --env production",
      "pre-setup": "",
    },
  },
};
