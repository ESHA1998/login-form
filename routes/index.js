var express = require('express');
var path=require('path');
var passport = require('passport');
var router = express.Router();
var readQuiz={
	"id": 1,
    "description": "Arcane Quiz",
    "questions": [
        {
            "question":1,
            "text": "What town is Matt Armstrong from?",
            "correct_answer": "gurgaon",
            "image": "/img/arrow.png",

        },
        {
            "question":2,
            "text": "What sport does Matt Armstrong play?",
            "correct_answer": "cricket",
			"image":"/img/arrow.png",            
        },
        {
            "question":3,
            "text": "refer to image",
            "correct_answer": "gurgaon",
            "image":"C:\Users\Public\Pictures\Sample Pictures\Deserts.jpg",
        },
        {
        	"question":4,
        	"text":"whats your name?",
        	"correct_answer":"esha",
        	"image":"C:\Users\Public\Pictures\Sample Pictures\Deserts.jpg",
        },

        {
        	"question":5,
        	"text":"whats your name?",
        	"correct_answer":"esha",
        	"image":"C:\Users\Public\Pictures\Sample Pictures\Deserts.jpg",
        },
        
    ]
}
var obj2=readQuiz["questions"];
var curr_obj;
var user;
var index;
// Get Homepage
router.get('/',function(req, res,next){
	res.render('main',{css:['index.css','font-awesome.min.css','ripples.min.css','responsive.css','material.min.css']});
});
router.get('/question', ensureAuthenticated, function(req, res,next){
	user=req.user;
	var q=req.user.question;
	for(var i=0;i<obj2.length;i++){
			if(obj2[i].question===q){
				index=i;
				curr_obj=obj2[i];
				res.render('question',{css:['game.css'],q:obj2[i]});
			}
	}
});
router.post('/submit',ensureAuthenticated,function(req,res,next){
	var answer=req.body.Answer;
	if(answer==curr_obj.correct_answer){
		user.question++;
		 user.save(user.question);
		 res.render('question',{q:obj2[index+1],css:['game.css']});
	}else{
		req.flash('error_msg','Wrong answer');
		 res.render('question',{q:curr_obj,css:['game.css']});
	}
})
function ensureAuthenticated(req, res, next){
	if(req.isAuthenticated()){
		return next();
	} else {
		res.render('/users/login',{css:['login.css']});
	}
}

module.exports = router;