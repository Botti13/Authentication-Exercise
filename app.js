require('dotenv').config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const LocalStrategy = require('passport-local');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

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
    password: String,
    googleId: String,
    secret: String
}); 

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

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

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
function(accessToken, refreshToken, profile, cb) {
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));

app.get("/", (req, res) => {
  res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect('/secrets');
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

app.get("/submit", (req, res) => {
  if (req.isAuthenticated()) {
		res.render("submit");
	} else {
		res.redirect("/login");
	}
});

app.post("/submit", async (req, res) => {
  const submittedSecret = req.body.secret;

  User.findById(req.user.id)
	.then((foundUser) => {
		if (foundUser) {
			foundUser.secret = submittedSecret;
			foundUser.save()
			.then(()=>{
				res.redirect("/secrets");
			})
			.catch((err)=> {
				console.log(err);
			});
		}
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

