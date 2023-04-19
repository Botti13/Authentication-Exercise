require('dotenv').config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const LocalStrategy = require('passport-local');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(express.urlencoded({extended:true}));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb://127.0.0.1:27017/userDB');

userSchema = new mongoose.Schema({
    email: String,
    password: String
}); 

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

passport.use(new LocalStrategy(User.authenticate()));

// use static serialize and deserialize of model for passport session support
passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, {
      id: user.id,
      username: user.username,
    });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.get("/secrets", (req, res) => {
  User.find({secret: {$ne: null}})
	.then((foundUsers) => {
		res.render("secrets", {usersWithSecrets: foundUsers})
	})
	.catch((err) => {
		console.log(err);
	});
});

app.get("/logout", (req, res) => {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

app.post("/register", async (req, res) => {
    try {
      const registerUser = await User.register({username: req.body.username}, req.body.password);
      if(registerUser){
        passport.authenticate("local")(req, res, function(){
          res.redirect("/secrets");
        });
      } else {
        res.redirect("register");
      }
    } catch (error) {
      res.send(error);
    }

});


app.post('/login', (req, res) => {
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
  
  req.login(user, function(err) {
    if (err) { return next(err); }
    return res.redirect("/secrets");
  });
});




app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

