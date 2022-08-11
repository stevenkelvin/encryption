require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const md5 = require("md5");



const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

mongoose.connect("mongodb+srv://stevenkelvin:XxuVuEP8vv6bDko8@cluster0.jtqkgzp.mongodb.net/", { useNewUrlParser: true });

const userScheme = new mongoose.Schema({
    email: String,
    password: String
});


const User = mongoose.model("User", userScheme);

app.route("/")
.get(function (req, res) {
    res.render("home");
});

app.route("/login")
.get(function (req, res) {
    res.render("login");
})

.post(function (req, res) {
    User.findOne({email: req.body.username}, function (err, foundedUser) {
        if(!err){
            if(req.body.username != ""){
                if(req.body.password == "")
                    res.render("loginNoPassword");  
                if(foundedUser){
                    if(foundedUser.password == md5(req.body.password))
                        res.redirect("/secrets");
                    else
                        res.render("loginWrongPassword");   
                }
                else
                    res.render("loginUserWarning");
            }
            else
                res.render("loginNoEmail");
        }
    });  
});

app.route("/register")
.get(function (req, res) {
    res.render("register");
})

.post(function (req, res) {
    User.findOne({email: req.body.username}, function (err, foundedUser) {
        if(!err){
            if(!foundedUser){
                if(req.body.password.length >= 8){
                    if(req.body.password === req.body.confirmPassword){
                        const newUser = new User({
                            email: req.body.username,
                            password: md5(req.body.password)
                        });
                        newUser.save(function (err){
                            if(err)
                                res.send(err);
                            else
                            res.redirect("/secrets");
                        });
                    }
                    else
                        res.render("registerPasswordWarning");
                } 
                else if(req.body.password.length < 8 && req.body.password.length > 0)
                    res.render("registerPasswordTooShort");
                else
                    res.render("registerNoPasswordAndEmail");
            }
            else
                res.render("registerWarning"); 
        }
    });  
});

app.route("/secrets")
.get(function (req, res) {
    res.render("secrets");
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port,function (req, res) {
    console.log("Server has started successfully.");
});