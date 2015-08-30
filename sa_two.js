var fs = require('fs');
var mongoose = require('mongoose');


var const_collectionName = "page_505510849485097_2014";
var db_connectionUrl = "mongodb://localhost:3456/datasets";
var count_totalCommentsRead = 0;
// ********************************************************************operations
var db_getCollectionModel = function(mongoObj){
	var schema_post = mongoObj.Schema({
		"id": String,
		"from" : Object,
		"story" : String,
		"picture" : String,
		"name" : String,
		"description" : String,
		"created_time" : String,
		"updated_time" : String,
		"shares" : Number,
		"likes" : Object,
		"comments" : Object
	});
	var post_model = mongoObj.model(const_collectionName, schema_post, const_collectionName);
	return post_model;
}
var fs_open = function(fileName){
	return fs.openSync(fileName,'w');
}
var fs_write = function(fd, data){
	try{
		return fs.writeSync(fd,data + "\r\n");
	}
	catch(e){
		console.error(e);
		return "error"
	}
}
mongoose.connect(db_connectionUrl);
mongoose.connection.on('error',function(err){
	if(err) console.log(err);
});
mongoose.connection.on('open',function(error){
	if(error) {
		console.log("error while opening connection:", error);
		return;
	}
	console.log("connection to db open");
	var post_collection = db_getCollectionModel(mongoose);
	
	if(post_collection.count() == 0 ) return;
	var fileObj = fs_open("facebook_comments_corpse.txt");
	console.log(fileObj);
	post_collection.find({},function(err,data){
		if(err) console.error(err);
		// *************************************************************************iterate all the post objects
		for(var idx in data){
			var post = data[idx];
			// **********************************************************************moniter post id and coumments count
			console.log("post: %s ; comments count: %s", post['id'],post['comments'].length);
			post['comments'].every(function(ele, idx, array){
				//console.log(ele['message']);
				// *****************************************************************write the comment to facebook post corpse file
				//fs_write(fileObj,ele['message'].toString());
				count_totalCommentsRead++;
				return true;
			});
		}
		console.log("Total comments processed:", count_totalCommentsRead);
	});
});