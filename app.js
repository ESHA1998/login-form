var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var exphbs = require('express-handlebars');
var expressValidator = require('express-validator');
var Flash = require('connect-flash');
var session = require('express-session');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var mongo = require('mongodb');
var mongoose = require('mongoose');
var nodemailer=require('nodemailer');
var async=require('async');
var crypto = require('crypto');
var flash=require('express-flash');
var fs=require('fs');

mongoose.connect('mongodb://localhost/login-form');
var db = mongoose.connection;

var routes = require('./routes/index');
var users = require('./routes/users');

// Init App
var app = express();

var User=require('./models/user');
// View Engine
app.set('views', path.join(__dirname, 'views'));
app.engine('handlebars', exphbs({defaultLayout:'layout'}));
app.set('view engine', 'handlebars');

// BodyParser Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// Set Static Folder
app.use(express.static(path.join(__dirname, 'public')));

// Express Session
app.use(session({
    secret: 'secret',
    saveUninitialized: true,
    resave: true
}));

// Passport init
app.use(passport.initialize());
app.use(passport.session());


// Express Validator
app.use(expressValidator({
  errorFormatter: function(param, msg, value) {
      var namespace = param.split('.')
      , root    = namespace.shift()
      , formParam = root;

    while(namespace.length) {
      formParam += '[' + namespace.shift() + ']';
    }
    return {
      param : formParam,
      msg   : msg,
      value : value
    };
  }
}));

// Connect Flash
app.use(flash());

// Global Vars
app.use(function (req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.user || null;
  next();
});

app.use('/', routes);
app.use('/users', users);
//app.use('/leaderboard',routes/users);
// Set Port
app.set('port', (process.env.PORT || 3000));

app.get('/forgot-password',function(req,res){
  res.render('forgot-pass',{
    user:req.user
  });
});

app.get('/leaderboard',function(req,res,next){
  User.find({}).sort({question:-1}).exec(function(err,docs){
    if(err){
      console.log(err);
    }else{
      res.render('index',{user:docs,css:['instruction.css','style.css','animate.css','bootstrap.min.css','util.css','select2.min.css']});
    }
  });
});

app.get('/instruction',function(req,res,next){
  res.render('instruction',{css:['instruction.css','style.css']});
})


app.post('/forgot-password',function(req,res,next){
   async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/forgot-password');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token,user,done){
  var transporter = nodemailer.createTransport({
          service: 'gmail',
          secure: false,
            port: 25,
          auth: {
                user: 'esha251298@gmail.com',
                pass:'innerve2018'
            },
            tls:{
              rejectUnauthorized:false
            }
        });

          const mailOptions = {
           from: '"Innerve Contact"<esha251298@gmail.com>', // we will put innerve's address here
             to: user.email, // list of receivers can be put if reqd
             subject: 'Forgot password', 
             html: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
        };

        transporter.sendMail(mailOptions, function (err) {
          //console.log('sent mail');
           req.flash('success_msg', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
            done(err, 'done');
          
        });
    }
    ],
    function(err){
      if(err) return next(err);
            res.redirect('/forgot-password');
    }
    );
    });



app.get('/reset/:token', function(req, res) {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now()} }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot-password');
    }
    res.render('reset',{user:req.user});
  });
});



app.post('/reset/:token', function(req, res) {
  async.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now()} }, function(err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }
            if(req.body.password === req.body.password2) {
          User.setPassword(user,req.body.password, function(err) {       
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
          });
        }else{
          req.flash("error", "Passwords do not match.");
            return res.redirect('back');
        }
        user.save(function(err) {
          req.logIn(user, function(err) {
          //req.flash('error','You can now login with new password');
            done(err, user);
          });
        });
      });
    },
    function(user, done) {
      var transport = nodemailer.createTransport({
        service: 'gmail',
        secure: false,
            port: 25,
          auth: {
                user: 'esha251298@gmail.com',
                pass:'innerve2018'
            },
            tls:{
              rejectUnauthorized:false
            }
      });
      var mailOptions = {
        to: user.email,
        from: 'INNERVE <esha251298@gmail.com>',
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      transport.sendMail(mailOptions, function(err) {
        req.flash('success_msg', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ], function(err) {
    //req.flash('success_msg', 'Success! Your password has been changed.');
    res.redirect('/question');
  });
});



app.listen(app.get('port'), function(){
	console.log('Server started on port '+app.get('port'));
});