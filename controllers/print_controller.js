var multiparty = require('multiparty'); // Modulo para subir archivos a traves de formularios
var child = require('child_process');   // Modulo para procesos de terminal
var fs = require('fs');                 // Modulo de archivos de sistema

var p_dir = "prints/";  // Directorio donde se almacenan las impresiones

var printer = "EPSON_Stylus_DX7400"; // Impresora por defecto del sistema

var prints=[];          // Pila de argumentos de comando a exportar
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

      prints.push(printjob);       // Añadimos la lista de argumentos a la pila   

      // Enviamos respuesta
      res.render("print/sent", { msg: fname+" enviado con éxito. Preparando archivo para imprimir."}); 
    } else{
      next(new Error('Formulario mal rellenado'));
    }
  });
};

// GET /settings
exports.settings= function(req,res, next){

  // Obtencion de enable/disable
  child.exec('lpstat -p', function (error, stdout, stderr) {
    console.log('printer stat stdout: ' + stdout);
    console.log('printer stat stderr: ' + stderr);
    if (error) next(error);
    var ready;
    // Obtencion de estado de la actividad de la impresora
    if(stdout.match(/idle/)) ready = "Inactiva";
    else if(stdout.match(/printing/)) ready = "Imprimiendo";
    else if(stdout.match(/disabled/)) ready = false;
    else ready = "Desconocido";
    
    // Obtencion de accepting/rejecting
    child.exec('lpstat -a', function (error, stdout, stderr) {
      console.log('printer stat stdout: ' + stdout);
      console.log('printer stat stderr: ' + stderr);
      if (error) next(error);
      var accept=!(stdout.match(/not\saccepting/)); // Si el comando devuelve "aceptando", la impresora acepta trabajos

      // Obtencion de lista de trabajos
      child.exec('lpq', function (error, stdout, stderr) {
        console.log('jobs queue stdout: ' + stdout);
        console.log('jobs queue stderr: ' + stderr);
        if (error) next(error);
        var jobstrings = stdout.match(/[a-z]+[\s]+[0-9]+[\s]+.+?\s+[0-9]+\sbytes$/gm); // Obtiene lineas con los trabajos en un array
        var jobs={};
        for(var i in jobstrings){
          var jobparams = jobstrings[i].match(/[a-z]+[\s]+([0-9]+)[\s]+(.+?)\s+[0-9]+\sbytes$/); // Separa de cada trabajo el id y el nombre
          jobs[jobparams[1]]={fname: jobparams[2]};
        }

        // Obtencion del estado de cada trabajo
        child.exec('lpstat -l -U pi', function (error, stdout, stderr) {
          console.log('job status stdout: ' + stdout);
          console.log('job status stderr: ' + stderr);
          if (error) next(error);
          for(var i in jobs){
            var regex= new RegExp("\-"+i+".*\n(.*)")  // Crea una regexp distinta para cada trabajo
            var statline=stdout.match(regex);         // Extrae la informacion necesaria de cada trabajo
            if(statline){
              var stat = statline[1].match(/\:\s([a-z0-9\s\-]+)/i)[1];      // Extrae el estado
              if(stat === "job-hold-until-specified") stat = "Pausado";    // Renombramos estado en caso de estar retenido
              jobs[i].stat = stat;
              var prog = statline[1].match(/([0-9]+)\%/);                   // Extrae el progreso
              if(prog) jobs[i].lvl = prog[1];                               // Si se encuentra progreso, se extrae,
              else jobs[i].lvl = false;                                     // y si no se pone a false
            }else jobs[i].stat = "Unknown";
          }

          //Ejecutamos comando de comprobacion de niveles de tinta
          child.exec('ink -p usb', function (error, stdout, stderr) {

            var inklevels ={success: true}; // Añadimos Variable para indicar si se han podido hallar niveles de tinta o no

            console.log('ink stdout: ' + stdout);
            console.log('ink stderr: ' + stderr);
            if ( error || stdout.match(/Could\snot/) ) inklevels.success = false;
            else{

              // Rellenamos la informacion de nivel de los distintos colores
              inklevels.cyan=stdout.match(/Cyan:[\s]+([0-9]+)%/)[1];
              inklevels.magenta=stdout.match(/Magenta:[\s]+([0-9]+)%/)[1];
              inklevels.yellow=stdout.match(/Yellow:[\s]+([0-9]+)%/)[1];
              inklevels.black=stdout.match(/Photoblack:[\s]+([0-9]+)%/)[1]; 
            }
            
            res.render("settings", {ready: ready, accept: accept, jobs: jobs, inklevels: inklevels }); //Enviamos la respuesta
          });              
        });      
      });
    });
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