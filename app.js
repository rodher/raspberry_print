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

// Implementacion de los sockets

// Socket para el comando de impresión
var printsocket = io.of('/print').on('connection', function (socket){

    var print = prints.pop(); // Extraemos comando

    if(print){
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

    var scan = scans.pop(); //Extraemos comando

    if(scan){
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
            var evt = scan.mode+"end"; // Determinamos evento del socket en funcion del formato de escaneo
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
        // Obtencion de estado de impresora
        child.exec('lpstat -p', function (error, stdout, stderr) {
            if (!error){
                var pstat = stdout.match(/está\s([a-z]+)/); // Obtencion de estado de la actividad de la impresora
                if(pstat !== null){
                  var ready;
                  if(pstat[1]==="deshabilitada") ready=false;
                  else ready=pstat[1];
                  var accept=!(stdout.match(/Rejecting\sJobs/)); // Si el comando devuelve "Rejecting Jobs", la impresora no acepta trabajos
                  socket.emit('pstat', { ready: ready, accept: accept});
                }
            }
        });

        // Obtencion de lista de trabajos
        child.exec('lpq', function (error, stdout, stderr) {
            if (!error){
                var jobstrings = stdout.match(/pi[\s]+[0-9]+[\s]+[^\s]+/gm); // Obtiene lineas con los trabajos en un array
                var jobs={};
                for(var i in jobstrings){
                    var jobparams = jobstrings[i].match(/pi[\s]+([0-9]+)[\s]+([^\s]+)/); // Separa de cada trabajo el id y el nombre
                    jobs[jobparams[1]]={fname: jobparams[2]};
                }
            }
            // Obtencion del estado de cada trabajo
            child.exec('lpstat -l -U pi', function (error, stdout, stderr) {
                if (!error) {
                    for(var i in jobs){
                        var regex= new RegExp("\-"+i+".*\n(.*)")  // Crea una regexp distinta para cada trabajo
                        var statline=stdout.match(regex);         // Extrae la informacion necesaria de cada trabajo
                        if(statline){
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
        console.log("Enviando por socket "+socket.id);
    },500);
    socket.on('disconnect', function(){
        clearInterval(ival);
    });    
});

module.exports = app;
