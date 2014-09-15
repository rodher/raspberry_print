var express = require('express');
var router = express.Router();

// Controladores de la aplicacion
var printController = require('../controllers/print_controller');
var scanController = require('../controllers/scan_controller');
var fileController = require('../controllers/file_controller');

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index');
});

// Rutas de impresion
router.get('/print/index',  printController.index);
router.post('/print',  printController.print);

// Ruta de comprobacion de tinta
router.get('/ink',  printController.inklevels);

//Rutas de escaneado
router.get('/scan/index',  scanController.index);
router.post('/scan',  scanController.scan);
router.post('/scan/crop', scanController.crop); 
router.get('/scan/download',  scanController.download);
router.post('/scan/add', scanController.add);

// Rutas de muestra de archivos
router.get('/print/files', fileController.listPrint);
router.get('/print/show/:file', fileController.showPrint);
router.get('/scan/files', fileController.listScan);
router.get('/scan/show/:file', fileController.showScan);
router.get('/files', fileController.index);

// Ruta de ayuda
router.get('/help', function(req, res, next){
	res.render('help');
});


module.exports = router;
