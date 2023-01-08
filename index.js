const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();
let db = require("./db.js");

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


app.get('/', (req, res) => {
	res.sendFile(__dirname + '/views/index.html');
});

app.get('/api/users', (req, res, next) => {
	const sql =
	`SELECT
	user.id AS _id,
	user.username AS username
	FROM user`;
	const params = [];
	db.all(sql, params, (err, users) => {
		if (err) {
			res.status(400).json({'error': err.message});
			return;
		}
		res.status(200);
		res.json(users);
	});
});

app.post('/api/users/', (req, res, next) => {
	let errors = [];
	if (!req.body.username){
		errors.push('No username specified');
	}
	if (errors.length){
		res.status(400).json({'error': errors.join(',')});
		return;
	}
	let data = {
		username: req.body.username
	};
	const sql = `INSERT INTO user (username) VALUES (?)`;
	const params = [ data.username ];
	db.run(sql, params, function (err, result) {
		if (err){
			res.status(400).json({'error': err.message});
			return;
		}
		res.json({
			'_id': this.lastID,
			'username': data.username
		});
	});
});

app.post('/api/users/:id/exercises', (req, res, next) => {
	let errors = [];

	if (!req.params.id){
		errors.push('No userId specified');
	}
	if (!req.body.description){
		errors.push('No description specified');
	}
	if (!req.body.duration){
		errors.push('No duration specified');
	}
	// if date is not set use today's date
	if (!req.body.date){
		const today = new Date(); 
		req.body.date = today.toDateString();
	} else {
		if (!isValidDate(req.body.date)) {
			errors.push('Please enter date in a format YYYY-MM-DD');
		}
		const inputDate = new Date(req.body.date); 
		req.body.date = inputDate.toDateString();
	}
	if (errors.length){
		res.status(400).json({'error': errors.join(',')});
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
			res.status(400).json({'error': err.message});
			return;
		}
		res.json({
			'_id': data.userId,
			'description': data.description,
			'duration': data. duration,
			'date': data.date
		});
	});
});

app.get('/api/users/:_id/logs', (req, res) => {
	const { from, to, limit } = req.query;
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
	// if limit is 0 or undefined return first 100 records as limit
	let nonNullLimit = limit === '0' || limit === undefined ? 100 : limit;

	// sql needs to return count of all exercises record even when limit is set
	const sql =
	`SELECT (
		SELECT COUNT(*) FROM exercises WHERE userId = :userId) as count, u.id, u.username, e.*
	FROM exercises e
	JOIN user u ON u.id = e.userId
	WHERE u.id = :userId
	LIMIT ?`;
	const params = [req.params._id, nonNullLimit];
	db.all(sql, params, async (err, data) => {
		if (err) {
			res.status(400).json({'error': 'There is no exercises logs for that user!'});
			return;
		}
		// if there is no user with exercises check if user exist in db
		if (data.length === 0) {
			const result = await getUsers(req.params._id, res);
			res.status(200);
			res.json({'id': result.id, 'username': result.username, 'count': 0, "log": []});
		} else {
			const log = data.filter((data) => {
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
			res.status(200);
			res.json({'_id': data[0].id, 'username': data[0].username, 'count': data[0].count, "log": log});
		}	
	});
})

const getUsers = (id, res) => new Promise((resolve) => {
	const sql = `SELECT username, id FROM user WHERE id = ?`;
	const params = id;
	db.all(sql, params, (err, data) => {
		if (err || data.length === 0) {
			res.status(400).json({'error': 'No user in a db with that id'});
			return;
		}
		resolve(data[0]);
	})
})

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
