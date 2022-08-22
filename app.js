require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session'); 
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://stevenkelvin:J3xEha3qYImOn6Tk@cluster0.jtqkgzp.mongodb.net/?retryWrites=true&w=majority", { useNewUrlParser: true });

const userScheme = new mongoose.Schema({
    email: String,
    password: String
});

userScheme.plugin(passportLocalMongoose);

const User = mongoose.model("User", userScheme);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());



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
    if(req.isAuthenticated())
        res.render("secrets");
    else
        res.redirect("/login");
});

app.route("/logout")
.get(function (req, res) {
    req.logout(function (err) {
        if(!err){
            res.redirect("/");
        }
    });
    
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port,function (req, res) {
    console.log("Server has started successfully.");
});