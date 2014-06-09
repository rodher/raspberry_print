var child = require('child_process');
var fs = require('fs');

var s_dir = "scans/";
var jobs={}; // Trabajos pendientes: {close, fname, mode, pages, ival}

exports.index = function(req, res, next) {

  res.render("scan/index");

};

exports.scan = function(req,res,next){
	
	var id=Date.now();
    jobs[id]={close: false, fname: req.body.filename || String(id) , mode: req.body.scan_mode, pages: 1};
    var ext;

	switch (jobs[id].mode){
		case "img" :
			ext=".jpg"
			break;

		case "pdf" :
			ext=".pdf";
			break;

		default :
			break;
	}

  	if(fs.existsSync(s_dir+jobs[id].fname.replace(/\s/g,"_")+ext)){
  		console.log("Primero compruebo si existe");
  		var i=0
  		var name;
  		do{
  			i++;
  			name=jobs[id].fname+"("+i+")";
  		}while(fs.existsSync(s_dir+name.replace(/\s/g,"_")+ext))
  		jobs[id].fname=name;
  	}
  	console.log("Luego ejecuto scan");
	child.execFile('./bin/scan.sh', [req.body.scan_mode, jobs[id].fname.replace(/\s/g,"_")] ,
		function (error, stdout, stderr) {
	      if(error!==null){
	        next(error);
	      }
	      console.log('scan stdout:');
	      console.log(stdout);
	      if(stderr){
	        console.log('scan stderr:');
	        console.log(stderr);
	      }
		})
		.on('close',function(code,signal){
        	jobs[id].close=true;
      	});


	res.render("scan/sent", {sc_mode: req.body.scan_mode, scanid: id});

}

exports.result = function(req, res, next){
	var funcion = function(){
	    if(jobs[req.query.scanid].close){
	    	clearInterval( jobs[req.query.scanid].ival);
			switch (jobs[req.query.scanid].mode){
				case "img" :
					res.render("scan/result", {	fname:jobs[req.query.scanid].fname+'.jpg',
												scanid: req.query.scanid});
					break;

				case "pdf" :
					res.render("scan/pdf", {scanid: req.query.scanid, 
											pages: jobs[req.query.scanid].pages });
					break;

				default :
					break;
			}
	    }
	};

	jobs[req.query.scanid].ival=setInterval(funcion,0);

}

exports.download = function(req, res, next){

	switch (jobs[req.query.scanid].mode){
		case "img" :
			res.download(s_dir+jobs[req.query.scanid].fname.replace(/\s/g,"_")+'.jpg', 
									jobs[req.query.scanid].fname+'.jpg', function(err){
				  				if (err) {
						    		next(err);
					  			} else {
					    			console.log("Operación realizada con éxito");
					  			}
							});
			break;

		case "pdf" :
			res.download(s_dir+jobs[req.query.scanid].fname.replace(/\s/g,"_")+'.pdf', 
									jobs[req.query.scanid].fname+'.pdf', function(err){
				  				if (err) {
						    		next(err);
					  			} else {
					    			console.log("Operación realizada con éxito");
					  			}
							});
			break;
		default:
			break;
	}



	delete jobs[req.query.scanid];
	
}

exports.add = function(req, res, next){

	jobs[req.body.scanid].close=false;
	jobs[req.body.scanid].pages++;

	child.execFile('./bin/scan.sh', [jobs[req.body.scanid].fname.replace(/\s/g,"_")] ,
	function (error, stdout, stderr) {
      if(error!==null){
        next(error);
      }
      console.log('scan stdout:');
      console.log(stdout);
      if(stderr){
        console.log('scan stderr:');
        console.log(stderr);
      }
	})
	.on('close',function(code,signal){
    	jobs[req.body.scanid].close=true;
  	});

	res.render("scan/sent", {sc_mode: jobs[req.body.scanid].mode, scanid: req.body.scanid});

}

exports.resultPDF = function(req, res, next){
	res.render("scan/result", {	fname:jobs[req.query.scanid].fname+'.pdf',
												scanid: req.query.scanid});
}
