const express = require("express");
const passport = require("passport");
const router = express.Router();
const Authentication = require("#root/lib/authentication");
const Authorization = require("#root/lib/authorization");

// const authorization = new Authorization(app, { p_conf, p_data });

// authorization.enforce('')

router.get("/signin", function (req, res, next) {
  res.render("auth/signin");
});
router.get("/signup", function (req, res, next) {
  res.render("auth/signup");
});

router.post("/api/signup", function (req, res, next) {
  const body = req.body;

  res.send({
    token: Authentication.jwtSign({ sub: body.username, role: body.role }, {}),
  });
});
router.post("/api/signin", function (req, res, next) {
  const body = req.body;

  res.send({
    token: Authentication.jwtSign({ sub: body.username, role: body.role }, {}),
  });
});
router.get("/api/auth", function (req, res, next) {
  const token_bearer = req.get("authorization");
  const token = token_bearer.split(" ")[1];

  try {
    const data = Authentication.jwtVerify(token);
    res.send({
      valid: true,
      data,
    });
  } catch (error) {
    res.send({
      valid: false,
    });
  }
});

// router.post(
//   "/api/signin",
//   passport.authenticate(
//     "jwt",
//     { session: false, authInfo: true }
//   ),
//   function (req, res) {
//     console.log(req.user);
//     console.log(req.authInfo);
//     res.send(req.user);
//   }
// );
// router.post("/logout", function (req, res, next) {
//   req.logout(function (err) {
//     if (err) {
//       return next(err);
//     }
//     res.redirect("/");
//   });
// });

module.exports = router;
