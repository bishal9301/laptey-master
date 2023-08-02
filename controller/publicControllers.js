const Product = require("../models/product");
const Cart = require("../models/cart");
const auth = require("../models/auth");

exports.getAbout = (req, res, next) => {
  res.render("about", {
    ownCSS: "about",
    title: "About us",
    signedIn: req.cookies ? req.cookies.token : false,
  });
};

exports.getReservation = (req, res, next) => {
  res.render("reservation", {
    ownCSS: "reservation",
    title: "Reservation",
    signedIn: req.cookies ? req.cookies.token : false,
  });
};

exports.getHowItWorks = (req, res, next) => {
  res.render("how_it_works", {
    ownCSS: "how_it_works",
    title: "How it works",
    signedIn: req.cookies ? req.cookies.token : false,
  });
};

exports.getHome = (req, res, next) => {
  res.render("index", {
    ownCSS: "index",
    title: "Laptey",
    signedIn: req.cookies ? req.cookies.token : false,
  });
};

exports.getProducts = (req, res) => {
  const category = req.params.category;
  Product.find({ category })
    .select("_id name ratings imgUrl price ")
    .exec((error, products) => {
      if (error) {
        return res.status(400).json({ error });
      }
      res.status(200).json({ products });
    });
};

exports.getProductById = (req, res) => {
  const _id = req.params.id;
  Product.findOne({ _id })
    .select("_id name intro ratings imgUrl price description category")
    .exec((error, product) => {
      if (error) {
        return res.status(400).json({ error });
      }
      res.status(200).json({ product });
    });
};

exports.getSearchedItem = (req, res) => {
  const searchBy = new RegExp(req.query.q, "i");
  Product.find({
    $or: [
      { name: searchBy },
      { category: searchBy },
      { intro: searchBy },
      { description: searchBy },
    ],
  })
    .select("_id name intro ratings imgUrl price description ")
    .exec((error, products) => {
      if (error) {
        return res.status(400).json({ error });
      }
      if (products) {
        res.render("search", {
          ownCSS: "search",
          title: "Laptey search",
          signedIn: req.cookies ? req.cookies.token : false,
          products: products,
        });
      } else {
        return res.status(400).json({
          message: "No products found.",
        });
      }
    });
};
