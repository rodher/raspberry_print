var fs = require('fs'); // Modulo de archivos de sistema

// GET /files
exports.index = function(req, res, next){
	res.render('files');
};

// GET /print/files
exports.listPrint = function(req, res, next){
	fs.readdir('prints',function(err, files){
		console.log(files);
		res.render("print/files", {files: files, kind: "print"});
	});
};

// GET /print/show/Hola.pdf
exports.showPrint = function(req, res, next){
	res.sendfile('prints/'+req.params.file, function(err){
		if(err) next(err);
	});
};

// GET /print/download/Hola.pdf
exports.downloadPrint = function(req, res, next){
	res.download('prints/'+req.params.file, function(err){
		if(err) next(err);
	});
};

// DELETE /print/Hola.pdf
exports.destroyPrint = function(req, res, next){
	fs.unlink('prints/'+req.params.file, function (err) {
	  if (err) next(err);
	  else console.log(req.params.file+" eliminado con exito");
	});
	fs.readdir('prints',function(err, files){
		console.log(files);
		res.render("print/files", {files: files, kind: "print"});
	});
};

// GET /scan/files
exports.listScan = function(req, res, next){
	fs.readdir('scans',function(err, files){
		console.log(files);
		res.render("scan/files", {files: files, kind: "scan"});
	});
};

// GET /scan/show/Hola.pdf
exports.showScan = function(req, res, next){
	res.sendfile('scans/'+req.params.file, function(err){
		if(err) next(err);
	});
};

// GET /scan/download/Hola.pdf
exports.downloadScan = function(req, res, next){
	res.download('scans/'+req.params.file, function(err){
		if(err) next(err);
	});
};

// DELETE /scan/Hola.pdf
exports.destroyScan = function(req, res, next){
	fs.unlink('scans/'+req.params.file, function (err) {
	  if (err) next(err);
	  else console.log(req.params.file+" eliminado con exito");
	});
	fs.readdir('scans',function(err, files){
		console.log(files);
		res.render("scan/files", {files: files, kind: "scan"});
	});
};