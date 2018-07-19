'use strict';

const chai = require('chai');
const chaiHttp =  require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const expect = chai.expect;

const {BlogPost} = require('../models.js');
const {app, runServer, closeServer} = require('../server.js');
const {TEST_DATABASE_URL} = require('../config.js');

chai.use(chaiHttp);

//Seed Db
function seedBlogData() {
	console.info('Seeding blog data');
	const seedData = [];
	//make 10 entries in the DB
	for (let i=0; i<=10; i++){
		seedData.push(generateBlogData());
	}
	//return a promise
	return BlogPost.insertMany(seedData);
}

//Make Test blog posts
function generateBlogData() {
	return {
		author: {
			firstName: faker.name.firstName(),
			lastName: faker.name.lastName()
		},
		content: faker.lorem.paragraph(),
		title: faker.name.findName(),
		created: faker.date.past()
	}
}

//tear down db
function tearDownDb() {
	console.warn('Deleting database');
	return mongoose.connection.dropDatabase();
}

//describe blog api
describe('Blog API resource', function() {
//before and after statements
	before(function() {
		return runServer(TEST_DATABASE_URL);
	});

	beforeEach(function() {
		return seedBlogData();
	});

	afterEach(function() {
		return tearDownDb();
	});

	after(function() {
		return closeServer();
	});
//GET Requests
	describe('GET endpoint', function() {
		//get back all blog posts
		//prove res has right status
		//prove the number of posts we get back is equal to number in db
		it('should return all blog posts', function() {
			let res;
			return chai.request(app)
			.get('/posts')
			.then(function(response) {
				res = response;
				expect(res).to.have.status(200);
				expect(res.body).to.have.lengthOf.at.least(1);
				return BlogPost.count();
			})
			.then(function(count) {
				expect(res.body).to.have.lengthOf(count)
			});
		});

		it('should return all the right fields', function() {
			let resPost;
			return chai.request(app)
				.get('/posts')
				.then(function(res) {
					expect(res).to.have.status(200);
					expect(res).to.be.json;
					expect(res.body).to.be.a('array');
					expect(res.body).to.have.lengthOf.at.least(1);
					res.body.forEach(function(post) {
						expect(post).to.be.a('object');
						expect(post).to.include.keys('id','author','content','title','created');
					});
					resPost = res.body[0];
					return BlogPost.findById(resPost.id);
				})
				.then(function(post) {
					let nameArray = resPost.author.split(" ")
					expect(resPost.id).to.equal(post.id);
					expect(nameArray[0]).to.equal(post.author.firstName);
					expect(nameArray[1]).to.equal(post.author.lastName);
					expect(resPost.content).to.equal(post.content);
					expect(resPost.title).to.equal(post.title);
				});
		});
	});

//POST Requests
	describe('POST endpoint', function() {
		//we need to prove the post gives back correct keys from the new post
		it('should add a new post to then blog', function() {
			const newPost = generateBlogData();
			return chai.request(app)
			.post('/posts')
			.send(newPost)
			.then(function(res) {
				expect(res).to.have.status(201);
				expect(res).to.be.json;
				expect(res.body).to.be.a('object');
				expect(res.body).to.include.keys(
					'id','title','content','author','created');
				expect(res.body.id).to.not.be.null;
				expect(res.body.title).to.equal(newPost.title);
				expect(res.body.content).to.equal(newPost.content);
				return BlogPost.findById(res.body.id);
			})
			.then(function(post) {
				expect(post.title).to.equal(newPost.title);
				expect(post.content).to.equal(newPost.content);
				expect(post.author.firstName).to.equal(newPost.author.firstName);
				expect(post.author.lastName).to.equal(newPost.author.lastName)

			})
		})
	})

//PUT Requests
	describe('PUT endpoint', function () {
		// get existing post 
		// make a put request with that id
		// prove it is correct
		it('should update the fields you send over', function() {
			const updateData = {
				title: 'Updated',
				content: 'Changed this text'
			};
			return BlogPost.findOne()
				.then(function(post) {
					updateData.id = post.id;
					return chai.request(app)
						.put(`/posts/${post.id}`)
						.send(updateData)
			})
				.then(function(res) {
					expect(res).to.have.status(204)
					return BlogPost.findById(updateData.id)
				})
				.then(function(post) {
					expect(post.title).to.equal(updateData.title);
					expect(post.content).to.equal(updateData.content);
					expect(post.id).to.equal(updateData.id);
				})
		})
	})

//DELETE Requests
	describe('DELETE endpoint', function() {
		it('delete a post by id', function() {
			let post;
			return BlogPost.findOne()
			.then(function(newPost) {
				post = newPost;
				return chai.request(app).delete(`/posts/${post.id}`);
			})
			.then(function(res) {
				expect(res).to.have.status(204);
				return BlogPost.findById(post.id);
			})
			.then(function(response) {
				expect(response).to.be.null;
			});
		});
	});
});