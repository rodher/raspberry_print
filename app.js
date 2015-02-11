var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var partials = require('express-partials');
var methodOverride = require('method-override');

var routes = require('./routes/index');
var prints = require('./controllers/print_controller').prints;
var scans = require('./controllers/scan_controller').scans;
var http = require('http');
var child = require('child_process');

var printer = "EPSON_Stylus_DX7400"; // Impresora por defecto del sistema 

var app = express();

var server = http.Server(app);

var io = require('socket.io')(server);

server.listen(3000);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(favicon(path.join(__dirname, '/public/favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(methodOverride('_method'));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(partials());

app.use('/', routes);


/// catch 404 and forwarding to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: false
    });
});

/////////////////////////////////// IMPLEMENTACION DE LOS SOCKETS //////////////////////////////////////

// Socket para el comando de impresión
var printsocket = io.of('/print').on('connection', function (socket){

    var printjob = prints.pop(); // Extraemos lista de argumentos

    if(printjob){

        //Ejecutamos el comando de impresion
        var print = child.spawn('./bin/print.sh', printjob);
        print.setMaxListeners(0); // Evitamos warning de memory leak

        // Enviamos información a través del socket
        print.stdout.on('data', function (chunk) {
          var data = chunk.toString(); // Convertimos de Buffer a String
          var progress = data.match(/[0-9]+/); // Comprobamos que se trata de progreso o no
          if(progress) socket.emit('progress', { progress: progress[0], id: socket.id });
          else socket.emit('message', { msg: data, id: socket.id});
          console.log(data);
        });

        // Avisamos del fin del proceso
        print.on('close',function (code){
            if(code===0) socket.emit('printend', { success: true, id: socket.id});
            else socket.emit('printend', { success: false, id: socket.id});
        });
    } else socket.emit('printend', { success: false, id: socket.id});
});

// Socket para el comando inicial del escaneado
var scansocket = io.of('/scan').on('connection', function (socket){scanbase(socket)});

// Socket para el comando de añadir pagina al escaneado
var cropsocket = io.of('/scan/crop').on('connection', function (socket){scanbase(socket)});

// Socket para el comando de añadir pagina al escaneado
var addsocket = io.of('/scan/add').on('connection', function (socket){scanbase(socket)});

// Funcion base para los sockets de todas las distintas fases del escaneo
var scanbase = function scanbase(socket){

    var job = scans.pop(); //Extraemos lista de argumentos

    if(job){

        // Ejecutamos el comando de escaneado
        var scan = child.spawn('./bin/scan.sh', job.scanjob);

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
            var evt = job.mode+"end"; // Determinamos evento del socket en funcion del formato de escaneo
            console.log("Escaneo terminado con codigo "+code);
            if(code===0) socket.emit( evt, { success: true, id: socket.id});
            else socket.emit( evt, { success: false, id: socket.id});
        });
    }else socket.emit( 'pdfend', { success: false, id: socket.id});    
};

// Socket para los ajustes de la impresora
var settingsocket = io.of('/settings').on('connection', function (socket){
    //Repetimos envio periodicamente
    var ival = setInterval(function(){

        // Obtencion de enable/disable
        child.exec('lpstat -p', function (error, stdout, stderr) {
            if (!error){
                var ready;
                // Obtencion de estado de la actividad de la impresora
                if(stdout.match(/idle/)) ready = "Inactiva";
                else if(stdout.match(/printing/)) ready = "Imprimiendo";
                else if(stdout.match(/disabled/)) ready = false;
                else ready = "Desconocido";
                socket.emit('pstat', { ready: ready});
            }
        });

        // Obtencion de accepting/rejecting
        child.exec('lpstat -a', function (error, stdout, stderr) {
            if (!error){
                var accept=!(stdout.match(/not\saccepting/)); // Si el comando devuelve "aceptando", la impresora acepta trabajos
                socket.emit('pacpt', {accept: accept});
            }
        });

        // Obtencion de lista de trabajos
        child.exec('lpq', function (error, stdout, stderr) {
            if (!error){
                var jobstrings = stdout.match(/[a-z]+[\s]+[0-9]+[\s]+.+?\s+[0-9]+\sbytes$/gm); // Obtiene lineas con los trabajos en un array
                var jobs={};
                for(var i in jobstrings){
                    var jobparams = jobstrings[i].match(/[a-z]+[\s]+([0-9]+)[\s]+(.+?)\s+[0-9]+\sbytes$/); // Separa de cada trabajo el id y el nombre
                    jobs[jobparams[1]]={fname: jobparams[2]};
                }
            }
            // Obtencion del estado de cada trabajo
            child.exec('lpstat -l -U pi', function (error, stdout, stderr) {
                if (!error) {
                    for(var i in jobs){
                        var regex= new RegExp("\-"+i+".*\n(.*)")  // Crea una regexp distinta para cada trabajo
                        var statline=stdout.match(regex);         // Extrae la informacion necesaria de cada trabajo
                        if(statline && statline[1].match(/\:\s([a-z0-9\s\-]+)/i)){
                            var stat = statline[1].match(/\:\s([a-z0-9\s\-]+)/i)[1];      // Extrae el estado
                            if(stat === "job-hold-until-specified") stat = "Pausado";    // Renombramos estado en caso de
                            jobs[i].stat = stat;                                          // estar retenido
                            
                            var prog = statline[1].match(/([0-9]+)\%/);                   // Extrae el progreso
                            if(prog) jobs[i].lvl = prog[1];                               // Si se encuentra progreso, se extrae,
                            else jobs[i].lvl = false;                                     // y si no se pone a false
                        }else jobs[i].stat = "Unknown";
                    }
                    socket.emit('queue', { jobs: jobs});
                }
            });
        });
    },500);

    // Socket de respuesta a Pausar/Reanudar impresora
    socket.on('togrdy', function (data){
        if(data.ready){
            child.exec('cupsdisable '+printer, function (error, stdout, stderr) {
                console.log(stdout);
                console.log(stderr);
            });
        }else{
            child.exec('cupsenable '+printer, function (error, stdout, stderr) {
                console.log(stdout);
                console.log(stderr);
            });
        }
    });

    // Socket de respuesta a Aceptar/Rechazar trabajos
    socket.on('togacpt', function (data){
        if(data.accept){
            child.exec('cupsreject '+printer, function (error, stdout, stderr) {
                console.log(stdout);
                console.log(stderr);
            });
        }else{
            child.exec('cupsaccept '+printer, function (error, stdout, stderr) {
                console.log(stdout);
                console.log(stderr);
            });
        }
    });

    // Socket de respuesta a Pausar/Reanudar trabajo i
    socket.on('toghold', function (data){
        if(data.hold){
            child.exec('lp -i '+data.id+' -H resume', function (error, stdout, stderr) {
                console.log(stdout);
                console.log(stderr);
            });
        }else{
            child.exec('lp -i '+data.id+' -H hold', function (error, stdout, stderr) {
                console.log(stdout);
                console.log(stderr);
            });
        }
    });

    // Socket de respuesta a cancelar trabajo i
    socket.on('cancel', function (data){
        child.exec('lprm '+data.id, function (error, stdout, stderr) {
            console.log(stdout);
            console.log(stderr);
        });
    });

    // Socket de respuesta a cancelar todos los trabajos
    socket.on('cancelAll', function (){
        child.exec('lprm -', function (error, stdout, stderr) {
            console.log(stdout);
            console.log(stderr);
        });
    });

    // Al desconectarnos debemos detener el envio periodico
    socket.on('disconnect', function(){
        clearInterval(ival);
    });    
});

module.exports = app;