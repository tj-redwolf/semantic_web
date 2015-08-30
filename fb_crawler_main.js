var fb = require('fbgraph');
var mongo = require('mongoose');
var Mongo_FV = null;
var Mongo_FV_category = null;
var Mongo_Node = null;
var db_connectionString = 'mongodb://localhost:3456/datasets';
var fb_postseeds = [];
var regex1 = /not|nt|no/g;
var regex2 = /not only|nt only/g;
fb.setAccessToken("CAACEdEose0cBAGXUGZCXb5kE4hsOrMz9lu3ZBIqPQ0v0FeF7uLuqspwcAaZApotWqZAkV5dZCRFhFWixZBN1YmKLZBJQItMU9Ys6wJgL6a3NsXlZCqpdQw649nUbtYRlwRmOZBrVxVCp4dFAymZAwLIQcjy7ZBo3kT5Lmz0CbFmavkCvqVZBUrnOheN3BRnlU6mbaER3bRyubknf0pWwopyHhGfCnUwfv9S3XbwZD");
//*********************************************************************** Sentiment Analyzer Contructor function
var SentimentAnalyzer = function(){
};

//  ******************************************************************** crawler dynamics
var lastUrl;
var fb_postsVisited = 0;
var fb_commentsVisited = 0;

//  *************************************************************************** operations
var mongo_model_node = function(mongoose){
	var nodeSchema =  mongoose.Schema({
		"source": String,
		"id" : String,
		"data" : Object,
		"timestamp" : Date,
		"tags" : Object,
		"comments" : Object,
		"likes" : Number,
		"spread" : Number,
		"ps" : Number
	});
	var node = mongoose.model("Node_Bank", nodeSchema, "Node_Bank");
	if(node == null) {
		console.error("Error creating the Node model");
		return null;
	}
	else return node; 
};
var mongo_model_terms = function(mongo, colName){
	var result = {};
	var schema = mongo.Schema({
		"word" : String,
		"freq" : Number
	});
	var model = mongo.model(colName, schema, colName);
	// check if the model is not present in the db, if not create a new collection
	model.find({},function(err, data){
		data.every(function(ele, idx, array){
			result[ele['word']] = ele['freq'];
			return true;	
		});
		//console.log("h:" + colName,Object.keys(result).length); 
	});
	
	return result;
}
var mongo_create_node = function(Node, data){
	if(data == null) {
		console.error("Null object recieved, Node");
		return;
	}
	var shares = data['shares'];
	var new_node = new Node({
		"source": "fb",
		"id" : data["id"],
		"data" : data,
		"timestamp": convert_DateToJF(data['updated_time']),
		"tags" : null,
		"comments" : null,
		"spread" : parseInt(shares['count']),
		"ps" : null
		
	});	
	//new_node.save();
	return new_node;
}; 
var mongo_model_lexicons = function(mongoObj, collectionName){
	var col = mongoObj.model(collectionName,new mongoObj.Schema({ word: String, value: Number}), collectionName);
	var result = {};
	col.find({},function(err, data){
		
		data.every(function(ele, idx, array){
			result[ele['word']] = ele['value']; 
			return true;
		});
		//console.log(Object.keys(result).length);
	});
	
	return result;
};
var init_FV = function(){
	Mongo_FV = [];
	Mongo_FV_category = [];
	Mongo_FV['kholi'] = ["virat","kholi"];
	Mongo_FV_category['kholi'] = "Player";
	Mongo_FV['msdhoni'] = ["",""];
	Mongo_FV_category['msdhoni'] = "Player";
	return Mongo_FV;
};
var mongo_model_fv = function(mongoose){
	var fv_schema = mongoose.Schema({
		"key" : String,
		"category" : String,
		"alias" : Object
	});	
	var fv = mongoose.model("feature_vectors", fv_schema, "feature_vectors");
	// demo queries
	Mongo_FV = {};
	Mongo_FV_category = {};
	fv.find({}, function(err, data){
		data.every(function(ele, idx, array){
			Mongo_FV[ele['key']] = ele['alias'];
			Mongo_FV_category[ele['key']] = ele['category'];
			return true;
		});
	});
	
	return fv;
};
var fb_seeds_init = function(seeds){
	//fb_postseeds.push("505510849485097");
	fb_postseeds.push("69553328633");
	return fb_postseeds;
};

var convert_DateToJF = function(date){
	var str = date.slice(0,19);
	return new Date(str.split('T')[0] + " " + str.split('T')[1] + " GMT").toUTCString();
};

var compare_time = function(date){
	// check if the given date is latest by 2 hours
	var post_date = new Date(date);
	var low_date = new Date();
	low_date.setHours(-24);
	if(post_date > low_date) return true;
	else return false;
};
var graph_get = function(url,callback){
	fb.get(url,function(err,res){
		if(err) {
			//console.log(err);
			callback(null);
		}
		else callback(res);
	});
};
var fb_post_createTags = function(FV, node) {
	// this function is specific to the facebook post structure, parse its comments for feature extraction
	// Normalization cannot be used
	// input params: FV= feature vector, of all the features in the system, 
	// 				 node= 
	var results = [];
	var fv_score = [];
	var w_title = 3;
	var w_comment = 0.2;
	var threshold = 10;
	
	
	var message = node['data']['message'].toString();
	message = message.trim();
	message = message.toLowerCase();
	var msg_tokens = message.split(' ');
	msg_tokens.every(function(ele, idx, array) {
		for(var fv in Mongo_FV){
			var alias = Mongo_FV[fv];
			if(alias.indexOf(ele) > -1){
				if(results.indexOf(fv) == -1) results.push(fv);
				else break;
			}
		}
		return true;
	});	
	return results;
};
var evaluate_PopularityScore = function(post_node){
	var scale_factor = 0.01;
	var like_factor = 0;
	var comment_factor = 0;
	var spread_factor = 0;
	var time_current  =  new Date();
	var time_post = new Date(post_node['timestamp']);
	var time_decay = Math.pow(Math.E, (time_post.getTime() - time_current.getTime()) * scale_factor / 3600000);
	
	
	if(post_node['likes']) like_factor = 0.2 * parseInt(post_node['likes']);
	if(post_node['spread']) spread_factor = 0.7 * parseInt(post_node['spread']);
	if(post_node['comments']) comment_factor = 0.5 * post_node['comments'].length;
	
	var score  = (like_factor + spread_factor + comment_factor) * time_decay;

	// further scaling down the pop[ularity] score * 0.2
	score = score * 0.05;
	return score;
	
};
var match_negation = function(str){
	//check if it is the NOT ONLY POS, we ignore that case for negation
	if(str.match(regex2) != null) return false;
	// check if it is NOT/NO/NT negation, 
	if(str.match(regex1) != null) return true;
}
SentimentAnalyzer.prototype.evaluate = function(statement){
		statement = statement.trim();
		var flag_negation = match_negation(statement);
		var apply_negation = false;
		var score = 0;
		statement.split(' ').every(function(ele,idx,array){
			if(flag_negation && ele.toLowerCase() == 'not' || ele.toLowerCase() == 'no' || ele.toLowerCase() == 'nt')
				return apply_negation = true;
			//check for the postive words
			if(SentimentAnalyzer.prototype.pos_lexicon[ele])
				if(!apply_negation)
					score += SentimentAnalyzer.prototype.pos_lexicon[ele]; 
				else
					score -= SentimentAnalyzer.prototype.pos_lexicon[ele];
			
	
			//check for the negative words	
			if(SentimentAnalyzer.prototype.neg_lexicon[ele])
				if(!apply_negation)
					score += SentimentAnalyzer.prototype.neg_lexicon[ele]; 
				else
					score -= SentimentAnalyzer.prototype.neg_lexicon[ele];
			
			return true;
			//debugging for single iteration
			//return false;
		});
		return score;
};
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
	
};
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
	
};
var graph_crawl = function(input){
	//if(input == null) return;
	var posts = input['data'];
	// process every post and fetch other details 
	posts.every(function(ele,idx,array){
		if(typeof ele['id'] == "undefined" || typeof ele['created_time'] == "undefined") return true;
		
		var d_flag  = compare_time(convert_DateToJF(ele['created_time']));
		console.log(ele['id'],ele['created_time'], d_flag);
		// if the post is created within the required range, fetch the post data
		if(d_flag && ele['id']){
			graph_get(ele['id'],function(postdata){
				if(postdata == null) return;
				// ***************************************************** create new post document and update basic details
				// create the node , without the tags, comments, likes
				var post_node = mongo_create_node(Mongo_Node, postdata);
				// ***************************************************** crawl all the likes of the post
				var url_likes = ele['id'] + "/likes?limit=1000";
				graph_get(url_likes,function(res_likes){
					if(res_likes == null) return;
					crawl_likes(ele['id'], res_likes, [], function(id_l, o_likes){
						//console.log(o_likes);
						
						// ************************************************* crawl all the comments of the post
						var url_comments = ele['id'] + "/comments?limit=1000";
						graph_get( url_comments,function(res_comments){
							if(res_comments == null ) return;
							crawl_comments(ele['id'], res_comments, [], function(id_c, o_comments){
								//console.log("Comments Counted:", o_comments.length);
								//console.log("Likes Counted:", o_likes.length);
								//console.log("Shares Counted:", post_node['spread']);
								// *********************************************** update the comments and likes
								post_node["likes"]  = o_likes.length;
								post_node["comments"] = o_comments;
								// *********************************************** feature extraction
								var tags = fb_post_createTags(Mongo_FV, post_node);
								post_node["tags"] = tags;
								//console.log(post_node);
								
								// *********************************************** sentiment analysis
								var sa =  new SentimentAnalyzer();
								var s_score = sa.evaluate(post_node['data']['message']);
								// iterate through comments 
								if(post_node['comments']!= null){
									post_node['comments'].every(function(ele, idx, array){
										s_score += sa.evaluate(ele['message']);
									});
								}
								
								// *********************************************** popularity analysis
								var ps = evaluate_PopularityScore(post_node);
								post_node["ps"] = ps; 
								//post_node.save();
								// *************************************************debug display
									console.log("Post Id:", post_node['id']);
									console.log("PS",post_node["ps"]);
									//console.log("tags", post_node["tags"]);
									
									//console.log("Senitment score", s_score);
								// ************************************************update the statistics variables
								
								fb_commentsVisited += o_comments.length;
								

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
			fb_postsVisited++;
		return true;
	});
	console.log("trace ended");
	console.log("Totol Post Found:", fb_postsVisited);
	console.log("Total comments crawled:", fb_commentsVisited);
	// check for the paging, if paging exist.. fetch the next page
	/*if(input['paging'] && input['paging']['next']) 
		graph_get(input['paging']['next'].toString(),function(response){
			if(response == null) return;
			graph_crawl(response);
		});*/
	/*
	else {
		console.log("trace ended");
		console.log("Totol Post Found:", fb_postsVisited);
		console.log("Total comments crawled:", fb_commentsVisited);
	} */
};
mongo.connect(db_connectionString);
mongo.connection.on('error',function(err){
	console.log('Connection to db failed');
});
mongo.connection.on('open', function(err){
	if(err) return;
	console.log('connection to db sucessful');
	// ************************************************************************ variables intialization
	//once connection is successful, add the seeds source of fb data
	var seeds = fb_seeds_init();
	Mongo_Node = mongo_model_node(mongo);
	var fv = mongo_model_fv(mongo);
	console.log(Object.keys(Mongo_FV));
	SentimentAnalyzer.prototype.pos_lexicon = mongo_model_lexicons(mongo, 'pos_word2000');
	SentimentAnalyzer.prototype.neg_lexicon = mongo_model_lexicons(mongo, 'neg_word4000');
	SentimentAnalyzer.prototype.pos_terms = mongo_model_terms(mongo, 'tm_pos');
	SentimentAnalyzer.prototype.neg_terms = mongo_model_terms(mongo, 'tm_neg');
	SentimentAnalyzer.prototype.neutral_terms = mongo_model_terms(mongo, 'tm_neutral');
	
	if(Mongo_Node == null || Mongo_FV == null) {
		console.log("System initialization failure");
	}
	
	//iterate through all the seed groups and crawl the fb graph for the post
	// get all the node id [post] present in the group, then crawl againt to get the details of the posts
	seeds.every(function (ele, index, array) {
		var graph_query = ele + "/posts?fields=id";
		graph_get(graph_query, function(response){
			if(response == null) { 
				console.error("no response from the fb server");
				return;
			}
			graph_crawl(response);
		});
		return true;
	});
	
});