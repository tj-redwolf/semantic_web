// program to create / update the trained model for polarity analysis
// tm_pos, tm_neutral, tm_neg are the datasets which are created and updated
var mongoose = require('mongoose');
var fs = require('fs');
// ***********************************************global constants
var db_conn_str = "mongodb://localhost:3456/datasets";


// ************************************************operations
var get_collection = function(name, mongoObj){
	var schema = mongoObj.Schema({
		"word" : String,
		"freq" : Number
	});
	var model = mongoObj.model(name, schema, name);
	// check if the model is not present in the db, if not create a new collection
	if(model == null)
		model = new mongoObj.model(name, schema);
	//console.log(model.collection)
	return model;
}
var update_collection = function(model, sentence){
	// description: parse the sentence word by word, update each word freq in the collection
	sentence = sentence.trim();
	sentence.split(' ').every(function(ele,idx,array){
		// *************************************************************** adding case insensitivity
		ele = ele.toLowerCase();
		// check if element is already present in the collection
		model.findOne({word: ele},function(err, data){
			if(err) console.error("Error while accessing collection");
			if(data == null){
				var lex = new model({
					"word" : ele,
					"freq" : 1
				});
				lex.save();
			}
			else {
				data["freq"] = data["freq"] + 1;
				data.save();
			} 
		});	
		return true;
	});
	
}
var readJsonFile = function(name){
	var file = readFileSync(name);
	if(file == null) { 
		console.error("Error reading file");
		return;
	}

	var jfile = JSON.parse(file);
	if(jfile["data"]) return jfile["data"];
	else {
		console.error("invalid file format");
		return null;
	}

}
mongoose.connect(db_conn_str);
mongoose.connection.on('open',function(err){
	console.log("connection to mongo successful");
	var trainingdata = readJsonFile("filename");
	var model_pos = get_collection("tm_pos", mongoose);
	var model_neutral = get_collection("tm_neutral", mongoose);
	var model_neg = get_collection("tm_neg", mongoose);
	
	trainingdata.every(function(ele, idx, array){
		if(ele["value"] == "pos") update_collection(model_pos, ele);
		else if(ele["value"] == "neutral") update_collection(model_neutral, ele);
		else if(ele["value"] == "neg") update_collection(model_neg, ele);
		return true;
	});
	
	update_collection(model, "you have to get angry HULK");
});
mongoose.connection.on('error',function(err){
	console.error("connection to mongo failed");
});
