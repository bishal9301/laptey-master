const jwt = require("jsonwebtoken");

exports.requireSignin = (req, res, next) => {
  if (req.cookies.token) {
    const token = req.cookies.token;
    const auth = jwt.verify(token, process.env.JWT_SECRET);
    req.auth = auth;
  } else {
    return res.status(400).json({
      message: "Please sign in to continue.",
      type: "error",
    });
  }
  next();
};

//Callback function to check whether user is logged in or not.
exports.userMiddleware = (req, res, next) => {
  if (req.auth.role !== "user") {
    return res.status(400).json({
      message: "Please sign in to continue.",
      type: "error",
    });
  }
  next();
};
