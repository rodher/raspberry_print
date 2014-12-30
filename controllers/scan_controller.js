var child = require('child_process');	// Modulo para procesos de terminal
var fs = require('fs');					// Modulo de archivos de sistema

var s_dir = "scans/"; // Directorio donde se almacenan los escaneos
var img_dir = "public/images/"; //Directorio donde se almacenan las imagenes publicas


// GET /scan/index
exports.index = function(req, res, next) {

  res.render("scan/index");

};

// POST /scan
exports.scan = function(req,res,next){

	var ext;

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

  	var mode;

  	if(req.body.preview) mode="pre";
  	else mode=req.body.scan_mode;

  	// Ejecutamos el comando de escaneado
	var scan = child.spawn('./bin/scan.sh', [mode, fname.replace(/\s/g,"_")]);

	// Conectamos con el socket
	req.io.of('/scan').on('connection', function (socket){
		communication(socket, scan, mode, next);
	});

	// Enviamos la respuesta
	res.render("scan/"+mode, { fname: fname, pages: 1});
}

// POST /scan/crop
exports.crop = function(req, res, next){

	var fname = req.body.fname;

	// Eliminamos la vista previa
	fs.unlink(img_dir+fname.replace(/\s/g,"_")+"_pre.jpg", function (err) {
	  if (err) next(err);
	  else console.log("Vista previa de "+fname+" eliminada con exito");
	});

	// Preparamos los argumentos de scan
	scanjob = [	req.body.left, 
				req.body.top,
				req.body.width, 
				req.body.height, 
				fname.replace(/\s/g,"_")];

	// Ejecutamos el comando de escaneado
	var scan = child.spawn('./bin/scan.sh', scanjob);

	// Conectamos con el socket
	req.io.of('/scan/crop').on('connection', function (socket){
		communication(socket, scan, "img", next);
	});

	// Enviamos la respuesta
	res.render("scan/img", { fname: fname});
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

// POST /scan/add
exports.add = function(req, res, next){
	var fname = req.body.fname;		// Extraemos del body el nombre del archivo
	var pages = ++req.body.pages;	// y el numero de paginas escaneadas, aumentandolo en 1
	scan = child.spawn('./bin/scan.sh', [fname.replace(/\s/g,"_")]);

	// Conectamos con el socket
	req.io.of('/scan/add').on('connection', function (socket){
		communication(socket, scan, "pdf", next);
	});

	// Enviamos la respuesta
	res.render("scan/pdf", { fname: fname, pages: pages});	
}

/* Funcion que implementa la comunicacion por sockets.
	usa como parametros el socket creado, el child process, y el modo de
	escaneado
*/
communication = function communication (socket, scan, mode, next) {
	// Enviamos la salida de datos como mensajes en el cliente
    scan.stdout.on('data', function (chunk) {
    	console.log(chunk.toString());
      	socket.emit('message', { msg: chunk.toString(), id: socket.id});
    });
    // Enviamos la salida de error, donde se imprime el progreso, como muestra del progreso
    scan.stderr.on('data', function (chunk) {
    	console.log(chunk.toString());
    	//Comprobamos que la salida es numerica
    	var progress = chunk.toString().match(/^Progress: ([0-9]+)\.[0-9]%/); 
    	if(progress) socket.emit('progress', { progress: progress[1], id: socket.id });
    });
    // Al cerrar avisamos de que el proceso ha terminado, con exito o no
  	scan.on('exit',function(code){
  		var evt = mode+"end"; // Determinamos evento del socket en funcion del formato de escaneo
    	console.log("Escaneo terminado con codigo "+code);
        if(code===0) socket.emit( evt, { success: true, id: socket.id});
        else{ 
          socket.emit( evt, { success: false, id: socket.id});
          next(new Error("Error de impresión"));
        }
  	});
}