const jwt = require("jsonwebtoken");

exports.requireSignin = (req, res, next) => {
    if (req.cookies.adminCookie) {
        const token = req.cookies.adminCookie;
        jwt.verify(token, process.env.JWT_SECRET, function(err, decoded) {
            if (err) {
                return res.status(400).json({
                    message: err,
                });
            }
            const admin = jwt.verify(token, process.env.JWT_SECRET);
            req.admin = admin;
        });

    } else {
        return res.status(400).json({
            message: "Authorization Required",
        });
    }
    next();
};

exports.adminMiddleware = (req, res, next) => {
    if (req.admin.role !== "admin") {
        return res.status(400).json({
            message: "User Access Denied",
        });
    }
    next();
};