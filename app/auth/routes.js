const router = require("express").Router();
const { decodeToken } = require("../../middlewares/index.js");
const authController = require("./controller.js");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const cookieParser = require("cookie-parser");
const {
  registerValidator,
  loginValidator,
} = require("../../middlewares/validator");

passport.use(
  new LocalStrategy({ usernameField: "email" }, authController.localStrategy)
);
// Middleware untuk parsing cookies
router.use(cookieParser());

// Auth routes
router.post("/register", registerValidator, authController.register);
router.post("/login", loginValidator, authController.login);
router.post("/logout", authController.logout);
router.get("/me", decodeToken, authController.me);
router.post("/refresh-token", authController.refreshToken);

module.exports = router;
