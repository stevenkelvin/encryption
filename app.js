require('dotenv').config();
const dotenv=require('dotenv');
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session"); 
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
    secret: process.env.GOOGLE_CLIENT_SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb+srv://stevenkelvin:J3xEha3qYImOn6Tk@cluster0.jtqkgzp.mongodb.net/?retryWrites=true&w=majority", { useNewUrlParser: true });

const secretsScheme = new mongoose.Schema({
    _id: String
});

const userScheme = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    facebookId: String,
    secret: [secretsScheme]
});

userScheme.plugin(passportLocalMongoose);
userScheme.plugin(findOrCreate);

const User = mongoose.model("User", userScheme);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user);
  });
  
  passport.deserializeUser(function(user, done) {
    done(null, user);
  });

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://secrets-leungkakit.herokuapp.com/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    callbackURL: "https://secrets-leungkakit.herokuapp.com/auth/facebook/secrets",
    profileFields: ['id', 'displayName', 'email']
  },
  function (accessToken, refreshToken, profile, cb) {
    console.log(profile.emails[0].value);
    
    User.findOrCreate({ facebookId: profile.id, username: profile.emails[0].value }, function (err, user) {
            return cb(err, user);
        });
    }
));


app.route("/")
.get(function (req, res) {
    res.render("home");
});

app.route("/login")
.get(function (req, res) {
    res.render("login");
})

.post(function (req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, function (err) {
        if(!err){
            User.findOne({username: req.body.username}, function (err, foundedUser) {
                if(!err){
                    if(foundedUser){
                        passport.authenticate("local", {successRedirect: "/secrets", failWithError: true})(req, res, function () {
                            return res.render("loginWrongPassword");
                        });
                    }
                    else{
                        res.render("loginNoUser");
                    }
                }
            });   
        }
        else{
            console.log(err);
        }
    });
});

app.route("/register")
.get(function (req, res) {
    res.render("register");
})

.post(function (req, res) {
    if(req.body.password.length < 8){
        res.render("registerPasswordTooShort");
    }
    
    if(req.body.password != req.body.confirmPassword){
        res.render("registerPasswordWarning");
    }
    if(req.body.password === req.body.confirmPassword && req.body.password.length >= 8){

        User.register({username: req.body.username}, req.body.password, function (err, user){  
       
            if(err){
                console.log(err);
                res.render("registerWarning");
            }
            else{
                passport.authenticate("local")(req, res, function () {
                    res.redirect("/secrets");
                });
            }
        });
    }
});

app.route("/secrets")
.get(function (req, res) {
    User.find({"secret": {$ne: null}}, function (err, foundedUser){
        if(err){
            console.log(err);
        }
        else{
            if(foundedUser){
                res.render("secrets", {title: foundedUser , usersWithSecrets: foundedUser});
            }
        }
    })
});

app.route("/logout")
.get(function (req, res) {
    req.logout(function (err) {
        if(!err){
            res.redirect("/");
        }
    });
    
});

app.route("/submit")
.get(function (req, res) {
    if(req.isAuthenticated())
        res.render("submit");
    else
        res.redirect("/login");
})

.post(function (req, res) {
    const submittedSecret = req.body.secret;
    let converedSecerts = "";

    User.findById(req.user, function (err, foundedUser) {
        if(err){
            console.log(err);
        }
        if(foundedUser){
            foundedUser.secret.push(submittedSecret);
            foundedUser.save(function (err) {
                if(!err){
                    res.redirect("/secrets");
                }
                else{
                    console.log(err);
                }
            });
            for(let i = 0; i < foundedUser.secret.length; i++){
                converedSecerts = foundedUser.secret[i]._id;
                console.log(converedSecerts);
            }
            
        }
    })
});

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] }));

app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect secrets page.
    res.redirect("/secrets");
  });

app.get("/auth/facebook",
  passport.authenticate('facebook'));

app.get("/auth/facebook/secrets",
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secrets page.
    res.redirect('/secrets');
  });


let port = process.env.PORT;
if (port == null || port == "") {
  port = 8000;
}

app.listen(port,function (req, res) {
    console.log("Server has started successfully.");
});