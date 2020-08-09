const express = require("express");
const app = express();
//const hbs = require("hbs");
const path = require("path");
const mongoose = require("mongoose");
const PORT = process.env.PORT || 5000;
const User = require("../models/Users.js");
const bcrypt = require("bcryptjs");
const flash = require("connect-flash");
const session = require("express-session");
const passport = require("passport");
const Course = require("../models/Courses");
var multer = require("multer");

const expressLayouts = require("express-ejs-layouts");
const { ensureAuthenticated } = require("../config/auth");
const { forwardAuthenticated } = require("../config/auth");

// DB config
const db1 = require("../config/keys.js").MongoURI;

//Passport config
require("../config/passport")(passport);
// Connect to Mongo
mongoose
  .connect(db1, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("Mongo Connected"))
  .catch((err) => console.log(err));

//Paths ..
const publicLocation = path.join(__dirname, "../public");
const viewsLocation = path.join(__dirname, "../templates/views");
const partialPath = path.join(__dirname, "../templates/partials");
const destinationPath = path.join(__dirname, "../uploads/");
//Setup ejs and views Location
// Middlewares
//app.use(expressLayouts);
app.set("view engine", "ejs");
app.set("views", viewsLocation);
//hbs.registerPartials(partialPath);

app.use(express.static(publicLocation));
// Body Parser
app.use(express.urlencoded({ extended: false }));
// Set Storage engine
const storage = multer.diskStorage({
  destination: destinationPath,
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});
// Init Upload
const upload = multer({
  storage,
  limits: { fileSize: 1000000 },
  fileFilter: (req, file, cb) => {
    checkFileType(file, cb);
  },
}).single("myImage");

// checkFileType
const checkFileType = (file, cb) => {
  // Allowed Types
  const filetypes = /jpeg|jpg|png|gif|pdf/;
  // check ext
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  //check mimeType
  const mimetype = filetypes.test(file.mimetype);
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb("Error: Images and PDF Only!");
  }
};

// Express-session
app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: true,
  })
);

// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect- Flash
app.use(flash());

//Global Vars
app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.error = req.flash("error");
  next();
});

app.get("/", forwardAuthenticated, (req, res) => {
  res.render("welcome.ejs");
});

app.get("/login", forwardAuthenticated, (req, res) => {
  res.render("login.ejs");
});
//Login Handle
app.post("/login", (req, res, next) => {
  passport.authenticate("local", {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
    failureFlash: true,
  })(req, res, next);
});

app.get("/register", forwardAuthenticated, (req, res) => {
  res.render("register.ejs");
});
// Register Handle
app.post("/register", (req, res) => {
  const { name, email, password, repassword } = req.body;
  let errors = [];
  if (password != repassword) {
    errors.push({ msg: "Passwords do not match" });
  }

  if (password.length < 6) {
    errors.push({ msg: "password should be atleast 6 characters long" });
  }
  if (errors.length > 0) {
    res.render("register.ejs", {
      errors,
      name,
      email,
      password,
      repassword,
    });
  } else {
    User.findOne({ email: email }).then((user) => {
      if (user) {
        errors.push({ msg: "E-mail is already registered" });
        res.render("register.ejs", {
          errors,
          name,
          email,
          password,
          repassword,
        });
      } else {
        const newUser = new User({
          name,
          email,
          password,
        });
        // Hash the Password
        bcrypt.genSalt(10, (err, salt) =>
          bcrypt.hash(newUser.password, salt, (err, hash) => {
            if (err) throw err;
            //Set Password
            newUser.password = hash;
            //Save User
            newUser
              .save()
              .then((user) => {
                req.flash("success_msg", "You are registered and can log in");
                res.redirect("/login");
              })
              .catch((err) => console.log(err));
          })
        );
      }
    });
  }
});

app.get("/dashboard", ensureAuthenticated, (req, res) => {
  res.render("dashboard.ejs", {
    user: req.user,
  });
});

app.get("/dashboard/grades", ensureAuthenticated, (req, res) => {
  res.render("grades.ejs", {
    course: req.course,
    user: req.user,
  });
});

app.post("/dashboard/courses", ensureAuthenticated, async (req, res) => {
  const course = new Course({
    ...req.body,
    owner: req.user._id,
  });
  try {
    await course.save();
    res.status(201).send(course);
  } catch (e) {
    res.status(400).send(e);
  }
});

app.get("/dashboard/courses", ensureAuthenticated, (req, res) => {
  res.render("courses.ejs", {
    user: req.user,
  });
});
app.post("/dashboard/upload", ensureAuthenticated, (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      res.render("dashboard.ejs", {
        msg: err,
      });
    } else {
      res.render("dashboard.ejs", {
        msg: "File Uploaded",
        file: "uploads/" + req.file.filename,
      });
    }
  });
});
app.get("/logout", (req, res) => {
  req.logout();
  req.flash("success_msg", "You are Logged out");
  res.redirect("/login");
});

app.listen(PORT, () => {
  console.log("Server starting in port " + PORT);
});
