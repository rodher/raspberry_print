var child = require('child_process');	// Modulo para procesos de terminal
var fs = require('fs');					// Modulo de archivos de sistema

var s_dir = "scans/"; // Directorio donde se almacenan los escaneos


// GET /scan/index
exports.index = function(req, res, next) {

  res.render("scan/index");

};

// POST /scan
exports.scan = function(req,res,next){

    // Determinamos la extension del archivo resultante
	switch (req.body.scan_mode){
		case "img" :
			ext=".jpg"
			break;

		case "pdf" :
			ext=".pdf";
			break;

		default :
			break;
	}

	var fname = req.body.filename || String(Date.now()); // Obtenemos el nombre

	// Comprobamos si existe un archivo de igual nombre
  	if(fs.existsSync(s_dir+fname.replace(/\s/g,"_")+ext)){

  		var i=0
  		var name;
  		// Compruebo cuantos archivos de igual nombre existen y le pongo "nombre(n).ext"
  		do{
  			i++;
  			name=fname+"("+i+")";
  		}while(fs.existsSync(s_dir+name.replace(/\s/g,"_")+ext))
  		fname = name;
  	}

  	// Ejecutamos el comando de escaneado
	var scan = child.spawn('./bin/scan.sh', [req.body.scan_mode, fname.replace(/\s/g,"_")]);

	// Conectamos con el socket
	req.io.on('connection', function (socket){
		communication(socket, scan, req.body.scan_mode, scan.pid);
	});

	// Enviamos la respuesta y marcamos la conversacion con el pid
	res.render("scan/"+req.body.scan_mode, { fname: fname, jobid: scan.pid});
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

/* Funcion que implementa la comunicacion por sockets.
	usa como parametros el socket creado, el child process, el modo de
	escaneado y el pid del proceso para identificar el socket
*/
communication = function communication (socket, scan, mode, pid) {
	// Enviamos la salida de datos como mensajes en el cliente
    scan.stdout.on('data', function (chunk) {
    	console.log(chunk.toString());
      	socket.emit('message', { msg: chunk.toString(), jobid: pid});
    });
    // Enviamos la salida de error, donde se imprime el progreso, como muestra del progreso
    scan.stderr.on('data', function (chunk) {
    	console.log(chunk.toString());
    	//Comprobamos que la salida es numerica
    	var progress = chunk.toString().match(/^Progress: ([0-9]+)\.[0-9]%/); 
    	if(progress) socket.emit('progress', { progress: progress[1], jobid: pid });
    });
    // Al cerrar avisamos de que el proceso ha terminado, con exito o no
  	scan.on('close',function(code){
  		var evt = mode+"end"; // Determinamos evento del socket en funcion del formato de escaneo
    	console.log("Escaneo terminado con codigo "+code);
        if(code===0) socket.emit( evt, { success: true, jobid: pid});
        else{ 
          socket.emit( evt, { success: false, jobid: pid});
          next(new Error("Error de impresión"));
        }
  	});

  	// Si el formato es pdf nos preparamos para añadir nuevas hojs
  	if(mode==="pdf"){
	  	socket.on('add', function (data){
	  		scan = child.spawn('./bin/scan.sh', [data.fname.replace(/\s/g,"_")]);
	  		communication(this, scan, mode, pid); // Llamada recursiva a communication
	  	});
  	}
}