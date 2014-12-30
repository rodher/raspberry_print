var multiparty = require('multiparty'); // Modulo para subir archivos a traves de formularios
var child = require('child_process');   // Modulo para procesos de terminal
var fs = require('fs');                 // Modulo de archivos de sistema

var p_dir = "prints/";  // Directorio donde se almacenan las impresiones

var prints=[];          // Pila de comandos a exportar
exports.prints = prints;

// GET /print
exports.index = function(req, res, next) {

  res.render("print/index");

};

// POST /print
exports.print = function(req, res, next) {
  
  var form = new multiparty.Form();

  // Callbacks a eventos de envio de formularios

  form.on('error', function(error) {
    console.log(error);
    next(error);
  });

  form.on('part', function(part) {
    // Envia los datos de archivos enviados directamente a un archivo en la Raspberry Pi
    if (part.filename) {
      console.log(part);
      var out_stream = fs.createWriteStream(p_dir+part.filename.replace(/\s/g,"_"), {flags: 'w', encoding: 'binary', mode: 0644});
      part.pipe(out_stream);
    }
  });

  // Parseamos la informacion
  form.parse(req,function(err, fields, files) {
    if(err){ 
      console.log(err);
      next(err);
    }

    var fname=files.archivo[0].originalFilename;  // Extraemos nombre de archivo
    var size=parseFloat(fields.psize[0]) || 28.5; // Extraemos tamaño de impresion; usamos por defecto 28.5 cm
    size=Math.round(100*size/28.5);               // Convertimos tamaño de impresion en porcentaje sobre la pagina completa

    // Creamos el array de argumentos para el comando de impresion
    var printjob=[fields.mode[0], 
                  fields.page_mode[0], 
                  fields.page_interval[0],
                  size.toString(),
                  fields.ncopy[0],
                  fname.replace(/\s/g,"_") ];

    console.log(printjob);


    // Comprobamos que el formulario esta bien rellenado
    if(validate(printjob)){

      //Ejecutamos el comando de impresion
      var print = child.spawn('./bin/print.sh', printjob);
      print.setMaxListeners(0); // Evitamos warning de memory leak
      prints.push(print);       // Añadimos el comando a la pila

      // Enviamos respuesta
      res.render("print/sent", { msg: fname+" enviado con éxito. Preparando archivo para imprimir."});    
    } else{
      next(new Error('Formulario mal rellenado'));
    }
  });
};

// GET /ink
exports.inklevels = function(req,res, next){

  //Ejecutamos comando de comprobacion de niveles de tinta
  child.exec('ink -p usb', function (error, stdout, stderr) {
    console.log('ink stdout: ' + stdout);
    console.log('ink stderr: ' + stderr);
    if (error !== null) next(error);
    if(stdout.match(/Could\snot/)) next(new Error("No se pueden obtener niveles de tinta"));
    else{
      var inklevels ={};

      // Rellenamos la informacion de nivel de los distintos colores
      inklevels.cyan=stdout.match(/Cyan:[\s]+([0-9]+)%/)[1];
      inklevels.magenta=stdout.match(/Magenta:[\s]+([0-9]+)%/)[1];
      inklevels.yellow=stdout.match(/Yellow:[\s]+([0-9]+)%/)[1];
      inklevels.black=stdout.match(/Photoblack:[\s]+([0-9]+)%/)[1]; 

      res.render("ink",{inklevels: inklevels}); //Enviamos la respuesta
    }
  });

};

validate =function(printjob){

  // No se valida si no hay ningun archivo subido
  if(!printjob[5]){
    return false;
  }

  // No se valida si la lista de paginas no es sintacticamente correcta
  if (printjob[2].match(/([^0-9,\-])|([\-,]{2,})|(^[\-,])|([\-,]$)/)) {
    return false;
  };
  
  return true;
};