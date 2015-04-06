var http = require("http"),
	express = require("express"),
	bodyParser = require("body-parser"),
	redis = require("redis"),
	app, redisClient;

//create a 4 digit shortened URL
function getShortURL () {
	//base 36 characters
	var alphanumeric = ['0','1','2','3','4','5','6','7','8','9','A','B',
						'C','D','E','F','G','H','I','J','K','L','M','N',
						'O','P','Q','R','S','T','U','V','W','X','Y','Z'];
	var urlString = "http://localhost:3000/";
	for (i = 0; i < 4; i++) {
		var num = randomNum(0,35);
		urlString = urlString + alphanumeric[num];
	}

	return urlString;
}

//get random number
function randomNum (low, high) {
	return Math.floor(Math.random() * (high - low + 1) + low);
}

//add url to redis
function addURL (longurl) {
	var shorturl;

	shorturl = getShortURL();

	//add to redis short/long
	redisClient.set(shorturl,longurl, function(err, reply) {
		console.log("short/long: " + reply);
	});

	//add to redis long/short
	redisClient.set(longurl,shorturl, function(err,reply) {
		console.log("long/short: " + reply);
	});

	//add shortURL to count
	redisClient.zadd("countShort", 0, shorturl, function(err, reply) {
		console.log("zadd: " + reply);
	});

	return shorturl;
}

//see if url exists
function checkURL (res, url) {
	
	redisClient.get(url, function(err, reply) {
		
		if (reply !== null) {
			res.json({"returnURL":reply});
		}
		else {
			if (url.indexOf("http://localhost:3000/") > -1) {
				res.json({"returnURL":"Shortened URL not found"});
			} else {
				var shorturl = addURL(url);
				res.json({"returnURL":shorturl});
			}
		} 
	}); 
}

function redirectURL (req, res) {
	var url = "http://localhost:3000/" + req.param(0);
	console.log(url);
	
	redisClient.get(url, function(err, reply) {
		
		if (reply !== null) {
			redisClient.zincrby("countShort", 1, url);
			res.redirect(reply);
		}
		else {
			res.redirect("http://localhost:3000/");
		} 
	});
}

function topten(res) {
	redisClient.zrange("countShort", 0, 9, function(err, reply) {
		res.json(reply);
	});
}

//create redis client
redisClient = redis.createClient();

app = express();
http.createServer(app).listen(3000);

app.use(express.static(__dirname + "/client"));
app.use(bodyParser.urlencoded({extended: false}));

app.get("/*", function (req, res) {
	if (req.param(0) === "displayTopTen") {
		topten(res);
	}
	else {
		redirectURL(req,res);
	}
	
});

app.post("/geturl", function (req, res) {
	var urlinfo = req.body;
	checkURL(res, urlinfo.url);
});

console.log("Server is listening at http://localhost:3000/");
