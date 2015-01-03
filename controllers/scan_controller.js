var child = require('child_process');	// Modulo para procesos de terminal
var fs = require('fs');					// Modulo de archivos de sistema

var s_dir = "scans/"; // Directorio donde se almacenan los escaneos
var img_dir = "public/images/"; //Directorio donde se almacenan las imagenes publicas

var scans=[];          // Pila de comandos a exportar
exports.scans = scans;


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

	// Enviamos la respuesta
	res.render("scan/"+mode, { fname: fname, pages: 1});

	// Ejecutamos el comando de escaneado
	var scan = child.spawn('./bin/scan.sh', [mode, fname.replace(/\s/g,"_")]);
	scan.mode = mode; // Añadimos el modo de escaneado
	scans.push(scan); // Añadimos el comando a la pila
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

	// Enviamos la respuesta
	res.render("scan/img", { fname: fname});

	// Ejecutamos el comando de escaneado
	var scan = child.spawn('./bin/scan.sh', scanjob);
	scan.mode = "img"; // Añadimos el modo de escaneado
	scans.push(scan); // Añadimos el comando a la pila
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

	// Enviamos la respuesta
	res.render("scan/pdf", { fname: fname, pages: pages});
	
	// Ejecutamos el comando de escaneado
	var scan = child.spawn('./bin/scan.sh', [fname.replace(/\s/g,"_")]);
	scan.mode = "pdf"; // Añadimos el modo de escaneado
	scans.push(scan); // Añadimos el comando a la pila	
}