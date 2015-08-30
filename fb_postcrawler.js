//script to crawl facebook graph for sample data collection , 
//from group [id 505510849485097]
// use date_min, date_max to restrict the crawling
var mongoose = require('mongoose');
var fb = require('fbgraph');
var crawl_startUrl = "505510849485097/posts?fields=id";
var db_connectionUrl = "mongodb://localhost:3456/datasets";
var date_min = "2014-01-01 00:00:00 GMT";
var date_max = "2014-12-31 23:59:00 GMT";
var post_document;
//set this access token:
fb.setAccessToken("");

//  ******************************************************************** crawler dynamics
var lastUrl;
var count_postsVisited = 0;
var count_commentsVisited = 0;
var const_collectionName = "page_505510849485097_2014";

//  *************************************************************************** operations
var graph_get = function(url,callback){
	fb.get(url,function(err,res){
		if(err) {
			//console.log(err);
			callback(null);
		}
		else callback(res);
	});
}
var crawl_likes = function(id, obj,likes,callback){
	//writeLine(obj);
	if(obj['data']){
		obj['data'].every(function(ele, idx, array){
			likes.push(ele);
			return true;
		});
	}
	
	// resolve all the paging to get total count on likes
	if(obj['paging'] && obj['paging']['next']){
		var url = obj['paging']['next'].toString();
		//writeLine(obj['data'].length);
			//writeLine("hit");
		graph_get(url,function(res){
			//handles if response is not recieved			
			if(!res) return; 
			obj = res;
			crawl_likes(id, obj, likes, callback);	
		});		
	}
	else callback(id, likes);
	
}
var crawl_comments = function(id, obj,comments,callback){
	
	if(obj['data']){
		obj['data'].every(function(ele, idx, array){
			comments.push(ele);
			return true;
		});
	}
	
	// resolve all the paging to get total count on likes
	if(obj['paging'] && obj['paging']['next']) {
		var url = obj['paging']['next'].toString();
		//writeLine(obj['data'].length);
			//writeLine("hit");
		graph_get(url,function(res){
			//handles if response is not recieved			
			if(!res) return; 
			obj = res;
			crawl_comments(id, obj, comments, callback);	
		});		
	}
	else callback(id, comments);
	
}
var graph_crawl = function(input){
	//if(input == null) return;
	var posts = input['data'];
	// process every post and fetch other details 
	posts.every(function(ele,idx,array){
		if(typeof ele['id'] == "undefined" || typeof ele['created_time'] == "undefined") return true;
		
		var d_flag  = compare_time(convert_DateToJF(ele['created_time']));
		console.log(ele['id'], d_flag);
		// if the post is created within the required range, fetch the post data
		if(d_flag && ele['id']){
			graph_get(ele['id'],function(postdata){
				if(postdata == null) return;
				// ***************************************************** create new post document and update basic details
				var post = new post_document({
					"id": postdata['id'],
					"from" : postdata['from'],
					"story" : postdata['story'] || null,
					"picture" : postdata['picture'] || null,
					"name" : postdata['name'] || null,
					"description" : postdata['description'] || postdata['message'] || null,
					"created_time" : postdata['created_time'],
					"updated_time" : postdata['updated_time'],
					"shares" : postdata['shares']['count'],
				});
				// ***************************************************** crawl all the likes of the post
				var url_likes = ele['id'] + "/likes?limit=1000";
				graph_get(url_likes,function(res_likes){
					if(res_likes == null) return;
					crawl_likes(ele['id'], res_likes, [], function(id_l, o_likes){
						//console.log(o_likes);
						post.likes = o_likes;
						// ************************************************* crawl all the comments of the post
						var url_comments = ele['id'] + "/comments?limit=1000";
						graph_get( url_comments,function(res_comments){
							if(res_comments == null ) return;
							crawl_comments(ele['id'], res_comments, [], function(id_c, o_comments){
								post.comments = o_comments;
								//console.log("Likes Count:", o_likes.length, id_l);
								//console.log("Comments Count:", o_comments.length, id_c);
								// ************************************************update the statistics variables
								count_postsVisited++;
								count_commentsVisited += o_comments.length;

								//**************************************************** update the document to mongodb collection
								/*post.save(function(er, data){
									if(er) {
										console.error("mongodb insertion failed");
									}
								}); */
							});
						});

					});

					
				});
			});
			
		}

		// maintain the statistics
		if(d_flag)
			count_postsVisited++;
		return true;
	});
	// check for the paging, if paging exist.. fetch the next page
	if(input['paging'] && input['paging']['next']) 
		graph_get(input['paging']['next'].toString(),function(response){
			if(response == null) return;
			graph_crawl(response);
		});
	else {
		console.log("trace ended");
		console.log("Totol Post Found:", count_postsVisited);
		console.log("Total comments crawled:", count_commentsVisited);
	}
}
var convert_DateToJF = function(date){
	var str = date.slice(0,19);
	return new Date(str.split('T')[0] + " " + str.split('T')[1] + " GMT").toUTCString();
}
var compare_time = function(date){
	// compare the give date with the min and max date, return true if the given date falls in the range
	var post_date = new Date(date);
	if(post_date > new Date(date_min) && post_date < new Date(date_max)) return true;
	else return false;
}
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
	var post_model = mongoObj.model('datasets', schema_post, const_collectionName);
	return post_model;
}

// we will start the crawler once the connection with Mongo is complete
mongoose.connect(db_connectionUrl);
mongoose.connection.on('error',function(err){
	console.error(err); return;
});

mongoose.connection.on('open',function(err){
	if(err) console.error(err);
	console.log("connection to mongo open");
	//  **************************** check the status of DB model
	post_document = db_getCollectionModel(mongoose);
	
	//  *************************** start the crawler
	
	graph_get(crawl_startUrl, function(obj){
		if( obj == null )
			console.error("Error: Could not connect to the FB server");
		else{
			//console.log(typeof obj);
			var dummy = {
			  "data": [
			    {
			      "id": "505510849485097_665683250134522", 
			      "created_time": "2014-04-10T02:24:44+0000"
			    }]
			}; 
			graph_crawl(obj);

		} 
			
	});
	

});