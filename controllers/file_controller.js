var fs = require('fs');

exports.index = function(req, res, next){
	res.render('files');
};

exports.listPrint = function(req, res, next){
	fs.readdir('prints',function(err, files){
		console.log(files);
		res.render("print/files", {files: files, kind: "print"});
	});
};

exports.showPrint = function(req, res, next){
	res.sendfile('prints/'+req.params.file, function(err){
		if(err) next(err);
	});
};

exports.listScan = function(req, res, next){
	fs.readdir('scans',function(err, files){
		console.log(files);
		res.render("scan/files", {files: files, kind: "scan"});
	});
};

exports.showScan = function(req, res, next){
	res.sendfile('scans/'+req.params.file, function(err){
		if(err) next(err);
	});
};