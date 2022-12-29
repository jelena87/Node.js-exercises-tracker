const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require("body-parser");
require('dotenv').config();
let db = require("./db.js");

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


app.get('/', (req, res) => {
	res.sendFile(__dirname + '/views/index.html');
});

app.get("/api/users", (req, res, next) => {
	const sql =
	`SELECT
	user.id AS _id,
	user.username AS username
	FROM user`;
	const params = [];
	db.all(sql, params, (err, users) => {
		if (err) {
			res.status(400).json({"error": err.message});
			return;
		}
		res.status(200);
		res.json(users);
	});
});

app.post("/api/users/", (req, res, next) => {
	let errors = [];
	if (!req.body.username){
		errors.push("No username specified");
	}
	if (errors.length){
		res.status(400).json({"error": errors.join(",")});
		return;
	}
	let data = {
		username: req.body.username
	};
	const sql ='INSERT INTO user (username) VALUES (?)'
	const params = [ data.username ]
	db.run(sql, params, function (err, result) {
		if (err){
			res.status(400).json({"error": err.message});
			return;
		}
		res.json({
			"_id": this.lastID,
			"username": data.username
		});
	});
});

app.post("/api/users/:id/exercises", (req, res, next) => {
	let errors = [];

	if (!req.params.id){
		errors.push("No userId specified");
	}
	if (!req.body.description){
		errors.push("No description specified");
	}
	if (!req.body.duration){
		errors.push("No duration specified");
	}
	// if date is not set use today's date
	if (!req.body.date){
		const today = new Date(); 
		req.body.date = today.toDateString();
	} else {
		if (!isValidDate(req.body.date)) {
			errors.push("Please enter date in a format YYYY-MM-DD");
		}
		const inputDate = new Date(req.body.date); 
		req.body.date = inputDate.toDateString();
	}
	if (errors.length){
		res.status(400).json({"error": errors.join(",")});
		return;
	}
	let data = {
		userId: +req.params.id,
		description: req.body.description,
		duration: +req.body.duration,
		date: req.body.date
	};
	const sql =
	`INSERT INTO exercises 
	(userId, description, duration, date)
	VALUES (?, ?, ?, ?)`;
	const params =[req.params.id, data.description, data.duration, data.date]
	db.run(sql, params, function (err, result) {
		if (err){
			res.status(400).json({"error": err.message});
			return;
		}
		res.json({
			"_id": data.userId,
			"description": data.description,
			"duration": data. duration,
			"date": data.date
		});
	});
});

app.get("/api/users/:_id/logs", (req, res) => {
	const sql =
	`SELECT
		user.username AS username,
		user.id AS _id
	FROM user
	WHERE _id = ?`;
	const params = [req.params._id];
	db.all(sql, params, async (err, userData) => {
		if (err || userData.length === 0) {
			res.status(400).json({"error": "This user does not exist!"});
			return;
		}
		const result = await getExercisesDetails(+req.params._id, userData, req.query);
		res.status(200);
		res.json({
			"_id": result._id,
			"username": result.username,
			"count": result.count,
			"log": result.log
		});
	});
})

const getExercisesDetails = (id, userData, query) => new Promise((resolve, reject) => {
	const { from, to, limit } = query;
	let fromDate;
	let toDate;
	if(from){
		const dateFrom = new Date(from);
		fromDate = dateFrom.getTime();
	}
	if(to){
		const dateTo = new Date(to);
		toDate = dateTo.getTime();
	}
	let nonNullLimit = limit ?? 100
	const sql =
	`SELECT * FROM exercises 
	WHERE userId = ?
	LIMIT ?`;
	const params = [id, nonNullLimit]
	db.all(sql, params, (err, data) => {
		if (err || !data) {
			res.status(400).json({"error": "No exercises for this user"});
			return;
		} else {
		const count = data.length;
		const rawLog = data;
		const log = rawLog.filter((data) => {
			let date = new Date(data.date);
			date.toDateString();
			if (fromDate && toDate) {
			return (date >= fromDate && date <= toDate);
			}
			return data.date;
		}).map((l) => ({
			description: l.description,
			duration: l.duration,
			date: l.date
		}));
		resolve({"username": userData[0].username, count, "_id": userData[0]._id, log})
		}
	});
});

function isValidDate(date) {
	const matches = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(date);
	if (matches == null) return false;
	const d = matches[3];
    const m = matches[2] - 1;
    const y = matches[1];
  
	let composedDate = new Date(y, m, d);
	return ((composedDate.getMonth() == m) &&
			(composedDate.getDate() == d) &&
			(composedDate.getFullYear() == y));
}

const listener = app.listen(process.env.PORT || 3000, () => {
	console.log('Your app is listening on port ' + listener.address().port);
})
