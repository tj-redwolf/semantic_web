//create the data set for sentiment bearing words: 
//Input: read words from filesystem
//output: save the list in mongodb

var mongoose = require('mongoose');
var fs = require('fs');

//connect to the mongoose:

var readFS_lex = function(fileName){
	var data = fs.readFileSync(fileName).toString();
	return data.split('\n');
}
var write_lex = function(data, mongoObj, collectionName){
	// paramaters integrity check
	if(data.length < 1) return;

	// create schema object
	var schema = mongoObj.Schema({
		word : String,
		value : Number
	});
	// create collection using the above created schema
	var lexicon_model = mongoObj.model(collectionName,schema);
	var count_insertion = 0;
	data.every(function(ele,idx,array){
		var lexicon = new lexicon_model({
			word : ele.toLowerCase(),
			value : 0.6
		});
		lexicon.save(function(err,data){
			if(err) console.error("insertion failed:", err);
			else count_insertion++;
		});
		return true;
	});
	//logging 
	console.log("Total Insertions at %s : %s", collectionName, count_insertion);
	return;
}
var read_lex = function(mongoObj,collectionName,c1){
	var col = mongoObj.model('lexicons',new mongoObj.Schema({ word: String, value: Number}), collectionName);
	console.log("reading data from the mongo");
	
	col.find({"word": "zealous"},function(err,data){
		if(err) console.error(err);
		else {
			c1(data);
		}
	});
}
mongoose.connect('mongodb://admin:base1103@ds045107.mongolab.com:45107/dbase');
//mongoose.connect('mongodb://localhost:3456/datasets');
mongoose.connection.on('error',function(err){
	console.error(err);
});
mongoose.connection.on('open',function(err){
	// read the files and update the database for datasets
	console.log("connection to DB successful");
	console.log(mongoose);
	// reading and writing positive lexicons
	var data = readFS_lex("opinion-lexicon-English/positive-words.txt");
	//write_lex(data, mongoose, "pos_word2000");

	// reading and writing negative lexicons
	var data = readFS_lex("opinion-lexicon-English/negative-words.txt");
	//write_lex(data, mongoose, "neg_word4000");

	//logging
	//console.log("operation completed");

	//reading the lexicons
	//read_lex(mongoose,"pos_words",function(data){
	//	console.log(Object.keys(data).length);
	//});

});