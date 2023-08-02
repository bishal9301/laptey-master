const express = require("express");
const env = require("dotenv");
const path = require("path");
const app = express();
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const shortid = require("shortid");
const cookieParser = require("cookie-parser");
const compression = require("compression");
//var Regex = require("regex");
//var regex = new Regex(/(a|b)*abb/);

//routes
const adminRoutes = require("./routes/admin/adminRoutes");
const userRoutes = require("./routes/User/userRoutes");
const auth = require("./models/auth");
const admin = require("./models/adminModel");
const publicRoutes = require("./routes/publicRoutes");
const errorRoutes = require("./routes/errorRoutes");
//const product = require("./models/product");

//environment variable or we can say constant
env.config();

//mongodb connection
mongoose
  .connect(
    `mongodb+srv://${process.env.MONGO_DB_USER}:${process.env.MONGO_DB_PASSWORD}@lapteycluster.${process.env.MONGO_UNIQUE}.mongodb.net/${process.env.MONGO_DB_DATABASE}?retryWrites=true&w=majority`,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
    }
  )
  .then(() => {
    console.log("Database connected");
  });

app.set("view engine", "ejs");
app.set("views", "views");

const storage = multer.diskStorage({
  destination: "./meal_photos",
  filename: function (req, file, cb) {
    cb(null, shortid.generate() + "-" + file.originalname);
  },
});

app.use(multer({ storage }).single("img"));

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/meal_photos", express.static(path.join(__dirname, "meal_photos")));
app.use(compression());
// app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(publicRoutes);

app.use(userRoutes);

app.use("/admin", adminRoutes);
app.use("/user", userRoutes);

app.use(errorRoutes);

app.listen(process.env.PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
