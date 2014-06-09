var express = require('express');
var router = express.Router();

var printController = require('../controllers/print_controller');
var scanController = require('../controllers/scan_controller');
var fileController = require('../controllers/file_controller');

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index');
});

router.get('/print/index',  printController.index); 
router.get('/print/result', printController.result);
router.post('/print',  printController.print);

router.get('/ink',  printController.inklevels);

router.get('/scan/index',  scanController.index);
router.post('/scan',  scanController.scan);
router.get('/scan/result', scanController.result); 
router.get('/scan/pdf/result', scanController.resultPDF); 
router.get('/scan/download',  scanController.download);
router.post('/scan/add', scanController.add);

router.get('/print/files', fileController.listPrint);
router.get('/print/show/:file', fileController.showPrint);
router.get('/scan/files', fileController.listScan);
router.get('/scan/show/:file', fileController.showScan);
router.get('/files', fileController.index);

router.get('/help', function(req, res, next){
	res.render('help');
});


module.exports = router;
