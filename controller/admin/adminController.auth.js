const Admin = require("../../models/adminModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const shortid = require("shortid");
const Category = require("../../models/category");
const Order = require("../../models/order");
const Product = require("../../models/product");
const Address = require("../../models/address");
const slugify = require("slugify");
const normalizePath = require("normalize-path");
const Feedback = require("../../models/feedback");
const Reservation = require("../../models/reservation");
const Checkout = require("../../models/checkout");
const nodemailer = require("nodemailer");
const env = require("dotenv");
const imagemin = require("imagemin");
const imageminJpegtran = require("imagemin-jpegtran");
const imageminPngquant = require("imagemin-pngquant");

// config for email
env.config();

const generateJwtToken = (_id, role) => {
  return jwt.sign({ _id, role }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
};

exports.getSignIn = (req, res, next) => {
  res.render("./admin/sign-in-or-up");
};

exports.getPanel = (req, res, next) => {
  res.render("./admin/panel");
};

exports.postSignIn = (req, res) => {
  console.log(req.body);
  Admin.findOne({ username: req.body.username }).exec(async (error, admin) => {
    if (error) {
      return res.status(400).json({ error });
    }
    if (admin) {
      const isPasswordMatch = await admin.authenticate(req.body.password);
      if (isPasswordMatch && admin.role === "admin") {
        const token = jwt.sign(
          { id: admin._id, role: admin.role, username: admin.username },
          process.env.JWT_SECRET,
          { expiresIn: "1d" }
        );

        res.cookie("adminCookie", token, { expiresIn: "1d" });
        const { _id, username, role } = admin;
        res.status(200).json({
          token,
          message: { _id, username, role },
        });
      } else {
        return res.status(400).json({
          message: "Given password does not match our credentials",
          type: "error",
        });
      }
    } else {
      return res.status(400).json({
        message: "User does not exist, create a new account to proceed.",
        type: "error",
      });
    }
  });
};

exports.postSignout = (req, res) => {
  res.clearCookie("adminCookie");
  res.status(200).json({
    message: "Signout Successfully...!",
  });
};

exports.getInitialData = async (req, res) => {
  const categories = await Category.find({}).exec();
  const products = await Product.find({})

    .select(
      "_id name price quantity slug description productPictures subCategory category"
    )
    .populate({ path: "category", select: "_id name" })
    .exec();

  const orders = await Order.find({})
    .select(
      "_id userId addressId totalAmount items paymentStatus paymentType orderStatus"
    )
    .populate("userId", "_id fullName email password")
    .populate(
      "items.productId",
      "_id name slug price description productPictures subCategory category"
    )
    .populate("items.categoryId", "_id name")
    .populate("addressId", "customerAddress")
    .exec();

  res.status(200).json({
    categories,
    products,
    orders,
  });
};

exports.postCustomerOrders = async (req, res) => {
  const orders = await Order.find({})
    .select(
      "_id userId addressId totalAmount items paymentStatus paymentType orderStatus"
    )
    .populate("userId", "_id fullName email password")
    .populate(
      "items.productId",
      "_id name slug price description productPictures subCategory category"
    )
    .populate("items.categoryId", "_id name")
    .populate("addressId", "customerAddress")
    .exec();
  res.status(200).json({ orders });
};

exports.getAddress = (req, res) => {
  Address.findOne({ userId: req.auth.id }).exec((error, Address) => {
    if (error) return res.status(400).json({ error });
    if (Address) {
      res.status(200).json({ Address });
    }
  });
};

exports.postAddCategory = (req, res) => {
  const categoryObj = {
    name: req.body.name,
    slug: `${slugify(req.body.name)}-${shortid.generate()}`, //keeping name itself as slug
    createdBy: req.auth.id,
  };

  if (req.file) {
    categoryObj.categoryImage =
      process.env.API + "/public/" + req.file.filename;
  }

  const cat = new Category(categoryObj);

  cat.save((error, category) => {
    if (error) return res.status(400).json({ error });
    //if category added to database
    if (category) {
      return res.status(201).json({ category });
    }
  });
};

exports.postUpdateCategories = async (req, res) => {
  const { _id, name } = req.body;

  const updatedCategories = [];

  if (name instanceof Array) {
    //iterating throug req.body
    for (let i = 0; i < name.length; i++) {
      const category = {
        name: name[i],
        //WORK ON SLUG WILL BE DONE LATER
        //slug: `${slugify(req.body.name)}-${shortid.generate()}`,//keeping name itself as slug
        updatedBy: req.auth.id,
      };

      const updatedCategory = await Category.findOneAndUpdate(
        { _id: _id[i] },
        category,
        { new: true }
      );
      updatedCategories.push(updatedCategory);
    }
    return res.status(201).json({ updateCategories: updatedCategories });
  } else {
    const category = {
      name,
      //slug: `${slugify(req.body.name)}-${shortid.generate()}`,//keeping name itself as slug
      updatedBy: req.auth.id,
    };

    const updatedCategory = await Category.findOneAndUpdate({ _id }, category, {
      new: true,
    });
    return res
      .status(201)
      .json({ message: "Category has been updated.", type: "success" });
  }
};

exports.postDeleteCategories = async (req, res) => {
  const { ids } = req.body.payload;
  const deletedCategories = [];
  for (let i = 0; i < ids.length; i++) {
    const deleteCategory = await Category.findOneAndDelete({ _id: ids[i]._id });
    deletedCategories.push(deleteCategory);
  }

  if (deletedCategories.length == ids.length) {
    res.status(200).json({ message: "Categories removed" });
  } else {
    res.status(400).json({ message: "Something went wrong" });
  }
};

/* exports.getCategories = (req, res) => {
  Category.find({}).exec((error, categories) => {
    if (error) return res.status(400).json({ error });

    if (categories) {
      res.status(200).json({ categories });
    }
  });
}; */

exports.getProducts = (req, res) => {
  Product.find({})
    .select("_id name intro imgUrl price description category")
    .exec((error, products) => {
      if (error) {
        return res.status(400).json({ error });
      }
      res.status(200).json({ products });
    });
};

exports.getOrders = (req, res) => {
  Order.find({ userId: req.auth.id })
    .select(
      "_id userId addressId totalAmount items paymentStatus paymentType orderStatus"
    )
    .populate("userId", "_id fullName email password")
    .populate(
      "items.productId",
      "_id name slug price description productPictures subCategory category"
    )
    .populate("addressId", "customerAddress")
    .exec((error, order) => {
      if (error) res.status(400).json({ error });
      if (order) {
        res.status(200).json({ order });
      }
    });
};

exports.postAddProduct = async (req, res) => {
  console.log(req.body);
  console.log(req.file);

  const imageUrl = normalizePath(req.file.path); //converts windows like path to unix like path \\ to /
  console.log(imageUrl);
  const files = await imagemin([imageUrl], {
    destination: "./meal_photos",
    plugins: [
      imageminJpegtran({ progressive: true }),
      imageminPngquant({
        quality: [0.6, 0.8],
      }),
    ],
  });

  console.log(files);

  const { name, intro, price, description, category } = req.body;
  const ratings = Math.ceil(Math.random() * (5 - 3) + 3); //returns random number between 3 and 5

  const product = new Product({
    name,
    intro,
    slug: `${slugify(name)}-${shortid.generate()}`,
    category,
    price,
    ratings,
    description,
    imgUrl: "/" + imageUrl,
  });

  product.save((error, product) => {
    if (error) return res.status(400).json({ error });
    if (product) {
      res
        .status(201)
        .json({ message: "Product has been added.", type: "success" });
    }
  });
};

exports.postUpdateProducts = async (req, res) => {
  const { id, name, intro, price, description, category, prevImgUrl } =
    req.body;

  let imgUrl;
  if (req.file) {
    const imageUrl = normalizePath(req.file.path); //converts windows like path to unix like path \\ to /
    console.log(imageUrl);
    const files = await imagemin([imageUrl], {
      destination: "./meal_photos",
      plugins: [
        imageminJpegtran({ progressive: true }),
        imageminPngquant({
          quality: [0.6, 0.8],
        }),
      ],
    });

    console.log(files);
    imgUrl = "/" + imageUrl;
  } else {
    imgUrl = prevImgUrl;
  }

  const product = {
    id,
    name,
    intro,
    slug: `${slugify(name)}-${shortid.generate()}`,
    category,
    price,
    description,
    imgUrl,
  };
  const updatedProduct = await Product.findOneAndUpdate({ _id: id }, product, {
    new: true,
  });
  return res.status(201).json({
    updatedProduct,
    message: "Meal has been updated.",
    type: "success",
  });
};

exports.deleteProduct = async (req, res) => {
  const productId = req.params.mealId;
  if (productId) {
    Product.deleteOne({ _id: productId }).exec((error, result) => {
      if (error) return res.status(400).json({ error });
      if (result) {
        res.status(202).json({
          message: "Meal has been removed.",
          type: "success",
        });
      }
    });
  } else {
    res.status(400).json({ error });
  }
};

exports.getFeedbacks = (req, res) => {
  Feedback.find({}).exec((error, feedbacks) => {
    if (error) return res.status(400).json({ error });
    if (feedbacks) {
      res.status(200).json({ feedbacks });
    } else {
      return res.status(400).json({
        message: "You don't have any feedbacks.",
      });
    }
  });
};

exports.getAddress = (req, res) => {
  UserAddress.findOne({ userId: req.auth.id }).exec((error, userAddress) => {
    if (error) return res.status(400).json({ error });
    if (userAddress) {
      res.status(200).json({ userAddress });
    }
  });
};

exports.getOrders = (req, res) => {
  Order.find({ userId: req.auth.id })
    .select(
      "_id userId addressId totalAmount items paymentStatus paymentType orderStatus"
    )
    .populate("userId", "_id fullName email password")
    .populate(
      "items.productId",
      "_id name slug price description productPictures subCategory category"
    )
    .populate("addressId", "customerAddress")
    .exec((error, order) => {
      if (error) res.status(400).json({ error });
      if (order) {
        res.status(200).json({ order });
      }
    });
};

exports.getReservations = (req, res) => {
  Reservation.find({}).exec((error, reservations) => {
    if (error) return res.status(400).json({ error });
    if (reservations) {
      res.status(200).json({ reservations });
    } else {
      return res.status(400).json({
        message: "You don't have any reservations.",
      });
    }
  });
};

exports.getCheckouts = (req, res) => {
  Checkout.find({}).exec((error, checkouts) => {
    if (error) return res.status(400).json({ error });
    if (checkouts) {
      res.status(200).json({ checkouts });
    } else {
      return res.status(400).json({
        message: "There are no orders.",
      });
    }
  });
};

exports.postConfirmCheckout = (req, res) => {
  console.log("checkoutID : ", req.params.checkoutID);

  const checkoutDetails = req.body.checkoutDetails;
  console.log(checkoutDetails);

  const getMeals = () => {
    const meals = checkoutDetails.meals;
    let mealsText = "Meals:\n";
    meals.forEach((meal) => {
      mealsText += `          ${meal.product}  X${meal.mealQty}  Rs.${meal.mealTotalPrice}\n`;
    });
    return mealsText;
  };

  //Sending Email
  // console.log(req.body.checkoutDetails.userEmail);

  // SMTP
  var smtpTransport = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: `${process.env.EMAIL}`,
      pass: `${process.env.PSWD}`,
    },
  });
  var mailOptions;

  // Send Email
  mailOptions = {
    to: req.body.checkoutDetails.userEmail,
    subject: `Laptey checkout confirmation.`,
    text: `
      Dear ${checkoutDetails.userName},

      We would like to inform you that your order with the following details is being delivered today.
        Delivery time: ${checkoutDetails.deliveryTime}
        Deliver address: ${checkoutDetails.deliveryAddress}
        ${getMeals()}
      For any queries, feel free to contact us.

      Best regards,
      Laptey Restaurant
      Chardobato, Banepa
      Tel: 011-661234, 9804512760
  `,
  };
  console.log(mailOptions);
  smtpTransport.sendMail(mailOptions, function (error, response) {
    if (error) {
      console.log(error);
      res.end("error");
      return;
    } else {
      console.log("Message sent: " + response.message);
      //Delete Checkout
      Checkout.deleteOne({
        _id: req.params.checkoutID,
      }).exec((error, result) => {
        if (error) return res.status(400).json({ error });
        if (result) {
          res.status(200).json({
            message: "Order is confirmed and is being delivered.",
            type: "success",
          });
        }
      });
    }
  });
};

exports.postConfirmReservation = (req, res) => {
  console.log("reservationID : ", req.params.reservationID);

  const reservationDetails = req.body.reservationDetails;
  console.log(reservationDetails);

  //Sending Email

  // SMTP
  var smtpTransport = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: `${process.env.EMAIL}`,
      pass: `${process.env.PSWD}`,
    },
  });
  var mailOptions;

  // Send Email
  mailOptions = {
    to: req.body.reservationDetails.userEmail,
    subject: `Laptey reservation confirmation.`,
    text: `
      Dear ${reservationDetails.userName},

      We would like to inform you that your reservation with following details has been arranged.
        Occasion: ${reservationDetails.occasion}
        Date: ${reservationDetails.date}
        Starting time: ${reservationDetails.startingTime}
        Ending time: ${reservationDetails.endingTime}
        Party size: ${reservationDetails.partySize}
        No. of tables: ${reservationDetails.tableRequired}

      We are happy to see you on time and serve you with the best services.
      For any queries, feel free to contact us.

      Best regards,
      Laptey Restaurant
      Chardobato, Banepa
      Tel: 011-661234, 9804512760
    `,
  };

  console.log(mailOptions);
  smtpTransport.sendMail(mailOptions, function (error, response) {
    if (error) {
      console.log(error);
      res.end("error");
      return;
    } else {
      console.log("Message sent: " + response.message);

      //Delete Reservation
      Reservation.deleteOne({ _id: req.params.reservationID }).exec(
        (error, result) => {
          if (error) return res.status(400).json({ error });
          if (result) {
            res.status(200).json({
              message: "Reservation is confirmed.",
              type: "success",
            });
          }
        }
      );
    }
  });
};
