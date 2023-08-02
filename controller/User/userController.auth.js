const User = require("../../models/auth");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const shortid = require("shortid");
const Category = require("../../models/category");
const Order = require("../../models/order");
const Product = require("../../models/product");
const Address = require("../../models/address");
const Cart = require("../../models/cart");
const Reservation = require("../../models/reservation");
const Feedback = require("../../models/feedback");
const Checkout = require("../../models/checkout");
const nodemailer = require("nodemailer");
const env = require("dotenv");
const cart = require("../../models/cart");
const History = require("../../models/history");
const category = require("../../models/category");

env.config();

//user signin, signup, signout
exports.getSignin = (req, res, next) => {
  res.render("signin", {
    ownCSS: "sign-in-up",
    title: "Signin",
    signedIn: req.cookies ? req.cookies.token : false,
  });
};

exports.getSignup = (req, res, next) => {
  res.render("signup", {
    ownCSS: "sign-in-up",
    title: "Signup",
    signedIn: req.cookies ? req.cookies.token : false,
  });
};

//main code
exports.postSignup = (req, res) => {
  //finding data in database
  User.findOne({ email: req.body.email }).exec(async (error, user) => {
    if (error || user)
      return res.status(400).json({
        message: "User with given email already exists.",
        type: "error",
      });

    const { fullName, email, password } = req.body;
    const hash_password = await bcrypt.hash(password, 10);

    const _user = new User({
      fullName,
      email,
      hash_password,
      username: shortid.generate(),
      role: "user",
    });

    _user.save((error, user) => {
      if (user) {
        const token = jwt.sign(
          {
            id: user._id,
            role: user.role,
            fullName: user.fullName,
            email: user.email,
          },
          process.env.JWT_SECRET,
          { expiresIn: "1d" }
        );

        //creating cookie during signin
        res.cookie("token", token, { expiresIn: "1d" });

        return res.status(201).json({
          data: user,
        });
      }
    });

    /* if (data) {
                  return res.status(201).json({
                    user: data,
                  });
                }; */
  });
};

exports.postSignin = (req, res) => {
  User.findOne({ email: req.body.email }).exec(async (error, user) => {
    if (error) {
      return res.status(400).json({ error });
    }
    if (user) {
      const isPasswordMatch = await user.authenticate(req.body.password);
      if (isPasswordMatch && user.role === "user") {
        const token = jwt.sign(
          {
            id: user._id,
            role: user.role,
            fullName: user.fullName,
            email: user.email,
          },
          process.env.JWT_SECRET,
          { expiresIn: "1d" }
        );

        //creating cookie during signin
        res.cookie("token", token, { expiresIn: "1d" });

        const { _id, fullName, email, role } = user;
        res.status(200).json({
          token,
          user: {
            _id,
            fullName,
            email,
            role,
          },
        });
        // return res.status("201").json({ message: message });
        // res.redirect("/");
      } else {
        return res.status(400).json({
          message: "Given password does not match our credentials.",
          type: "error",
        });
      }
    } else {
      return res.status(400).json({
        message: "We could not find the given user.",
        type: "error",
      });
    }
  });
};

exports.postSignout = (req, res) => {
  // console.log("inside signout");
  res.clearCookie("token");
  res.status(200).json({
    message: "Signout Successfully...!",
  });
};

exports.postReservation = (req, res) => {
  // console.log(req.auth.email);
  Reservation.findOne({
    date: req.body.date,
    startingTime: req.body.startingTime,
    endingTime: req.body.endingTime,
    user: req.auth.id,
    userName: req.auth.fullName,
    userEmail: req.auth.email,
  }).exec(async (error, reservation) => {
    if (error || reservation)
      return res.status(400).json({
        message:
          "Reservation already registered. Try another date and/or time.",
        type: "error",
      });

    const {
      occassion,
      partySize,
      tableRequired,
      date,
      startingTime,
      endingTime,
    } = req.body;

    if (endingTime < startingTime) {
      res.status(400).json({
        message: "Cannot go back in time.",
        type: "error",
      });
    } else {
      const _reservation = new Reservation({
        user: req.auth.id,
        userName: req.auth.fullName,
        userEmail: req.auth.email,
        occassion,
        partySize,
        tableRequired,
        date,
        startingTime,
        endingTime,
      });

      _reservation.save((error, data) => {
        if (error) {
          return res.status(400).json({
            message: "Something went wrong.",
            type: "error",
          });
        }

        if (data) {
          return res.status(201).json({
            message: "Your reservation has been recorded.",
            type: "success",
          });
        }
      });
    }
  });
};

exports.postFeedback = (req, res) => {
  Feedback.findOne({
    email: req.body.email,
  }).exec(async (error, feedback) => {
    if (error || feedback)
      return res.status(400).json({
        error: "We already have a feedback from the given email address.",
      });

    const { fullName, email, stars, response } = req.body;

    const _feedback = new Feedback({
      fullName,
      email,
      stars,
      response,
    });

    _feedback.save((error, data) => {
      if (error) {
        return res.status(400).json({
          error: "Something went wrong line 227",
        });
      }

      if (data) {
        return res.status(201).json({
          message: "Your feedback has been recorded.",
          type: "success",
        });
      }
    });
  });
};

/* 
const postHistory = (req, res) => {
  Cart.findOne({
    user: req.auth.id,
  }).exec((error, cart) => {
    if (error) return res.status(400).json({ error });
    if (cart) {
      // const { historyItems } = req.body; //will be managed within postAddToCart controller below
      // const _history = new History({
      //   user: req.auth.id,
      //   userName: req.auth.fullName,
      //   userEmail: req.auth.email,
      //   historyItems,
      // });
         
          let condition, update;
          
            const historyItems = req.body;
            historyItems.forEach((historyItems) => {
              let mealRate = historyItems.mealRate;
              let category = historyItems.category;
              let ratings = historyItems.ratings;
              // let mealQty = historyItems.mealQty;
              History.findOne({ user: req.auth.id }).exec((history) => {
                condition = {
                  user: req.auth.id,
                  "cartItems.mealRate": mealRate,
                  "cartItems.ratings": ratings,
                  "cartItems.category": category,
                  // "cartItems.mealQty": mealQty,
                };
                update = {
                  $pull: {
                    cartItems: {
                      mealRate: mealRate,
                      category: category,
                      ratings: ratings,
                      // mealQty: mealQty,
                    },
                  },
                };
                History.findOneAndUpdate(condition, update).exec(
                  (error, _history) => {
                    if (error) return res.status(400).json({ error });
                    if (_history) {
                      res.status(200);
                    }
                  }
                );
              });
            });
            return res.json({
              type: "success",
            });
          
        
      
    } else {
      const _history = new History({
        user: req.auth.id,
        userName: req.auth.fullName,
        userEmail: req.auth.email,
        historyItems,
      });

      _history.save((error, data) => {
        if (error) {
          return res.status(400).json({
            message: error,
          });
        }
        if (data) {
          return res.status(201);
        }
      });
    }
    /* if (meals.length === 0) {
    return res.json({ message: "Select an item", type: "error" });
  }
  });
};
*/

exports.getRecommendations = (req, res) => {
  Cart.findOne({ user: req.auth.id }).exec((error, cart) => {
    if (error) return res.status(400).json({ error });
    if (cart) {
      historyItems = cart.historyItems;
      let mealRates = [];
      let categories = [];
      let ratings = [];
      historyItems.forEach((item) => {
        mealRates.push(item.mealRate);
        categories.push(item.category);
        ratings.push(item.ratings);
      });

      mealRates = [...new Set(mealRates)];
      categories = [...new Set(categories)];
      ratings = [...new Set(ratings)];

      const maxMealRate = Math.max(...mealRates);
      const minMealRate = Math.min(...mealRates);

      Product.find({
        $and: [
          { category: { $in: categories } },
          { ratings: { $in: ratings } },
          {
            price: { $gte: minMealRate },
          },
          {
            price: { $lte: maxMealRate },
          },
        ],
      })
        .select("_id name ratings imgUrl price ")
        .exec((error, products) => {
          if (error) {
            return res.status(400).json({ error });
          }
          res.status(200).json({ products });
        });
    } else {
      return res.status(400).json({
        message: "No items have been added to your cart.",
      });
    }
  });
};

//callback function to add item to cart
exports.postAddToCart = (req, res) => {
  Cart.findOne({ user: req.auth.id }).exec((error, cart) => {
    if (error) return res.status(400).json({ error });
    if (cart) {
      //if cart already exist then update cart by quantity
      const product = req.body.cartItem.product;
      const item = cart.cartItems.find((c) => c.product == product);
      let condition, update;
      if (item) {
        condition = {
          user: req.auth.id,
          "cartItems.product": product,
          "historyItems.product": product,
        };
        update = {
          $set: {
            "cartItems.$": {
              ...req.body.cartItem,
              mealQty: parseInt(item.mealQty + req.body.cartItem.mealQty),
              mealTotalPrice: Number(
                item.mealTotalPrice + req.body.cartItem.mealTotalPrice
              ),
            },

            "historyItems.$": {
              mealRate: req.body.cartItem.mealRate,
              category: req.body.cartItem.category,
              ratings: req.body.cartItem.ratings,
            },
          },
        };
      } else {
        condition = { user: req.auth.id };
        update = {
          $push: {
            cartItems: req.body.cartItem,
            historyItems: req.body.cartItem,
          },
        };
      }

      Cart.findOneAndUpdate(condition, update).exec((error, _cart) => {
        if (error) return res.status(400).json({ error });
        if (_cart) {
          return res.status(201).json({
            message: "Meal has been added to your cart.",
            type: "success",
          });
        }
      });
    } else {
      //if cart not exist then create a new cart
      const cart = new Cart({
        user: req.auth.id,
        cartItems: [req.body.cartItem],
        historyItems: [req.body.cartItem],
      });

      cart.save((error, cart) => {
        if (error) return res.status(400).json({ error });
        if (cart) {
          return res
            .status(201)
            .json({ message: "Meal added to your cart", type: "success" });
        }
      });
    }
  });
};

exports.getCartItems = (req, res) => {
  Cart.findOne({ user: req.auth.id }).exec((error, cart) => {
    if (error) return res.status(400).json({ error });
    if (cart) {
      res.render("cart", {
        ownCSS: "cart",
        title: "My cart",
        cart: cart,
        signedIn: req.cookies ? req.cookies.token : false,
      });
    } else {
      res.render("cart", {
        ownCSS: "cart",
        title: "My cart",
        cart: { cartItems: [] },
        signedIn: req.cookies ? req.cookies.token : false,
      });
    }
  });
};

exports.postRemoveCartItems = (req, res) => {
  console.log(req.body.cartItem);
  Cart.findOne({ user: req.auth.id }).exec((error, cart) => {
    if (error) return res.status(400).json({ error });
    if (cart) {
      const mealId = req.body.cartItem.mealId;
      const item = cart.cartItems.find((c) => c.mealId == mealId);
      let condition, update;
      if (item) {
        condition = { user: req.auth.id, "cartItems.mealId": mealId };
        update = {
          $pull: {
            cartItems: {
              mealId: mealId,
            },
          },
        };
      } else {
        condition = { user: req.auth.id };
        update = {
          $push: {
            cartItems: req.body.cartItem,
          },
        };
      }
      Cart.findOneAndUpdate(condition, update).exec((error, _cart) => {
        if (error) return res.status(400).json({ error });
        if (_cart) {
          res
            .status(200)
            .json({ message: "Item removed successfully.", type: "success" });
        }
      });
    }
  });
};

exports.postAddAddress = (req, res) => {
  const { payload } = req.body;
  if (payload.address) {
    UserAddress.findOneAndUpdate(
      { userId: req.auth.id },
      {
        $push: {
          address: payload.address,
        },
      },
      { new: true, upsert: true }
    ).exec((error, userAddress) => {
      if (error) return res.status(400).json({ error });
      if (userAddress) {
        res.status(201).json({ userAddress });
      }
    });
  } else {
    res.status(400).json({ error: "Params address required" });
  }
};

exports.postAddOrder = (req, res) => {
  Cart.deleteOne({
    user: req.auth.id,
    userName: req.auth.fullName,
  }).exec((error, result) => {
    if (error) return res.status(400).json({ error });
    if (result) {
      req.body.user = req.auth.id;
      req.body.userName = req.auth.fullName;
      req.body.orderStatus = [
        {
          type: "ORDERED",
          date: new Date(),
          isCompleted: true,
        },
        {
          type: "PACKED",
          isCompleted: false,
        },
        {
          type: "SHIPPED",
          isCompleted: false,
        },
        {
          type: "DELIVERED",
          isCompleted: false,
        },
      ];
      const order = new Order(req.body);
      order.save((error, order) => {
        if (error) return res.status(400).json({ error });
        if (order) {
          res.status(201).json({ order });
        }
      });
    }
  });
};

exports.postCheckout = (req, res) => {
  Checkout.findOne({
    user: req.auth.id,
    userName: req.auth.fullName,
    userEmail: req.auth.email,
    deliveryDate: req.body.deliveryDate,
    deliveryTime: req.body.deliveryTime,
    deliveryAddress: req.body.deliveryAddress,
  }).exec(async (error, checkout) => {
    if (error || checkout)
      return res.status(400).json({
        message: "Your order is being proccessed.",
        type: "success",
      });

    const { deliveryDate, deliveryAddress, deliveryTime, meals } = req.body;

    const _checkout = new Checkout({
      user: req.auth.id,
      userName: req.auth.fullName,
      userEmail: req.auth.email,
      deliveryDate,
      deliveryAddress,
      deliveryTime,
      meals,
    });

    if (meals.length !== 0) {
      _checkout.save((error, data) => {
        if (error) {
          return res.status(400).json({
            message: error,
          });
        }

        let condition, update;
        if (data) {
          const meals = req.body.meals;
          meals.forEach((meal) => {
            let mealId = meal.mealId;
            Cart.findOne({ user: req.auth.id }).exec((cart) => {
              condition = { user: req.auth.id, "cartItems.mealId": mealId };
              update = {
                $pull: {
                  cartItems: {
                    mealId: mealId,
                  },
                },
              };
              Cart.findOneAndUpdate(condition, update).exec((error, _cart) => {
                if (error) return res.status(400).json({ error });
                if (_cart) {
                  res.status(200);
                }
              });
            });
          });
          return res.json({
            message: "Order placed successfully.",
            type: "success",
          });
        }
      });
    }
    if (meals.length === 0) {
      return res.json({ message: "Select an item", type: "error" });
    }
  });
};

exports.getReservationsUser = (req, res) => {
  Reservation.find({ user: req.auth.id }).exec((error, reservations) => {
    if (error) return res.status(400).json({ error });
    if (reservations) {
      res.render("my-reservations", {
        ownCSS: "my-reservations",
        title: "My reservations",
        signedIn: req.cookies ? req.cookies.token : false,
        myReservations: reservations,
      });
    } else {
      return res.status(400).json({
        message: "You don't have any reservations.",
      });
    }
  });
};

//Changes
exports.deleteReservation = (req, res) => {
  Reservation.deleteOne({ _id: req.params.reservationID }).exec(
    (error, result) => {
      if (error) return res.status(400).json({ error });
      if (result) {
        res.status(202).json({
          message: "Reservation is cancelled.",
          type: "success",
        });
      } else {
        res.status(400).json({ error: "Params required!" });
      }
    }
  );
};
