var child = require('child_process');	// Modulo para procesos de terminal
var fs = require('fs');					// Modulo de archivos de sistema

var s_dir = "scans/"; // Directorio donde se almacenan los escaneos

var jobs={}; // Trabajos pendientes: {close, fname, mode, pages, ival}

// GET /scan/index
exports.index = function(req, res, next) {

  res.render("scan/index");

};

// POST /scan
exports.scan = function(req,res,next){
	
	var id=Date.now(); // Creamos id para el trabajo

	// Añadimos trabajo a la lista de trabajos pendientes
    jobs[id]={close: false, fname: req.body.filename || String(id) , mode: req.body.scan_mode, pages: 1};
    var ext;

    // Determinamos la extension del archivo resultante
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

	var fname = req.body.filename;
	// Comprobamos si existe un archivo de igual nombre
  	if(fs.existsSync(s_dir+fname.replace(/\s/g,"_")+ext)){

  		var i=0
  		var name;
  		// Compruebo cuantos archivos de igual nombre existen y le pongo "nombre(n).ext"
  		do{
  			i++;
  			name=fname+"("+i+")";
  		}while(fs.existsSync(s_dir+name.replace(/\s/g,"_")+ext))
  		jobs[id].fname=name;
  		fname = name;
  	}

  	// Ejecutamos el comando de escaneado
	var scan = child.spawn('./bin/scan.sh', [req.body.scan_mode, fname.replace(/\s/g,"_")]);


	// Conectamos con el socket
	req.io.on('connection', function (socket){
        scan.stdout.on('data', function (chunk) {
          socket.emit('message', { msg: chunk.toString()});
          console.log("stdout: "+chunk);
        });
        scan.stderr.on('data', function (chunk) {
        	var progress = chunk.toString().match(/^Progress: ([0-9]+)\.[0-9]%$/);
        	if(progress) socket.emit('progress', { progress: progress[1] });
        	console.log("stderr: "+chunk);
        });
      	scan.on('close',function(code){
      		var evt = req.body.scan_mode+"end";
        	jobs[id].close=true; // Cuando se termina de ejecutar ponemos como verdadero el flag close
        	console.log("Trabajo terminado con codigo "+code);
            if(code===0) socket.emit( evt, { success: true});
            else{ 
              socket.emit( evt, { success: false});
              next(new Error("Error de impresión"));
            }
      	});
	});

	// Enviamos la respuesta: "Archivo escaneandose"
	//res.render("scan/sent", {sc_mode: req.body.scan_mode, scanid: id});
	res.render("scan/"+req.body.scan_mode, { fname: fname});



}

// GET /scan/result
exports.result = function(req, res, next){

	// Creamos la funcion de comprobacion de trabajo finalizado
	var funcion = function(){
	    if(jobs[req.query.scanid].close){

	    	clearInterval( jobs[req.query.scanid].ival); // Terminamos la comprobacion periodica

	    	// Enviamos respuestas distintas dependiendo del modo de escaneado
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

	jobs[req.query.scanid].ival=setInterval(funcion,0); // Comprobamos periodicamente
}

// POST /scan/add
exports.add = function(req, res, next){

	jobs[req.body.scanid].close=false; 	// Volvemos a poner como falso el flag close
	jobs[req.body.scanid].pages++;		// y aumentamos el numero de paginas

	// Ejecuamos nuevamente el comando de escaneo
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
    	jobs[req.body.scanid].close=true; // Cuando se termina de ejecutar ponemos como verdadero el flag close
  	});

	// Enviamos respuesta: "Archivo escaneandose"
	res.render("scan/sent", {sc_mode: jobs[req.body.scanid].mode, scanid: req.body.scanid});
}

// GET /scan/pdf/result
exports.resultPDF = function(req, res, next){
	res.render("scan/result", {	fname:jobs[req.query.scanid].fname+'.pdf',
												scanid: req.query.scanid});
}

// GET /scan/download
exports.download = function(req, res, next){

	// Enviamos el archivo escaneado con su extension correspondiente
	res.download(s_dir+req.query.fname.replace(/\s/g,"_")+'.'+req.query.ext, 
				req.query.fname+'.'+req.query.ext, 
				function(err){
	  				if (err) {
			    		next(err);
		  			} else {
		    			console.log("Operación realizada con éxito");
		  			}
				}
	);
}