const express = require("express");
const router = express.Router();
const httpProxy = require("http-proxy");

const proxy = httpProxy.createProxyServer({
  target: "http://localhost:3000",
  changeOrigin: true,
  ws: true,
});

/* GET home page. */
router.get("/*", function (req, res, next) {
  // console.log(req.url);

  // res.send(req.url);
  proxy.web(req, res, {}, next);

  // console.log(req.user);
  // console.log(req.authInfo);
  // if (!req.user) {
  //   return res.redirect("/signup");
  // }
  // res.render("index", { title: "Express", name: req.user.username });
});
// router.get("/admin", function (req, res, next) {
//   proxy.web(req, res, { target: "http://localhost:3000/admin" }, next);
// });

// router.get("/projects", function (req, res, next) {
//   res.send("projects");
// });

// router.get("/projects/:name", function (req, res, next) {
//   res.send(`projects ${req.params.name}`);
// });

router.post("/api/projects", function (req, res, next) {
  res.send("projects");
});

router.post("/api/projects/:name", function (req, res, next) {
  res.send(`projects`);
});

module.exports = router;
