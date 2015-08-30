 process.stdin.resume();
 process.stdin.setEncoding('utf8');
 var _input = "";
 var fs = require('fs');
 var writeLine = function(data){
	process.stdout.write(data.toString());
	process.stdout.write("\r\n");
}
var initialize_SentimentLexicons = function(obj_pos,obj_neg){
	var default_score = 0.5;
	var temp;
	var input_pos = fs.readFileSync("positive_lexicons.txt");
	var input_neg = fs.readFileSync("negative_lexicons.txt");
	var temp = input_pos.toString().split('\r\n');
	for(var i = 0 ; i < temp.length ; i++){
		if( typeof obj_pos[temp[i].toLowerCase()] != "undefined") continue;
		obj_pos[temp[i].toLowerCase()] = default_score;
	}
	temp = input_neg.toString().split('\r\n');
	for(var i = 0 ; i < temp.length ; i++){
		if( typeof obj_pos[temp[i].toLowerCase()] != "undefined") continue;
		obj_neg[temp[i].toLowerCase()] = default_score;
	}
}
var calculate_SentimentValue = function(string,o_pos,o_neg){
	var score = 0;
	var temp_words = [];
	string.split(' ').every(function(ele,idx,array){
		if(typeof o_pos[ele] != "undefined") {
			score += o_pos[ele];
			temp_words.push(ele);
		}
		if(typeof o_neg[ele] != "undefined") {
			score -= o_neg[ele];
			temp_words.push(ele);
		}
		return true;
	});
	//writeLine(temp_words);
	return score;
}
var obj1 = {}, obj2 = {}
var sentence = 
initialize_SentimentLexicons(obj1, obj2);
var inputFile = fs.readFileSync("quotes.txt");
var trainingData = inputFile.toString().split('\n');
trainingData.every(function(ele,idx,array){
	if(idx > 100) return false;
	var score = calculate_SentimentValue(ele,obj1,obj2);
	writeLine("Score:" + score);
	return true;
});

process.exit(0);
