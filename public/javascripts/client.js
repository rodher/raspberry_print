
var pages=0;
var id;

/*	Cuando el documento está cargado comprobamos el nivel de tinta de cada color
	y si es menor del 10% cambiamos el color
*/
$(document).ready(function() {
	id = $("#job").val();
	$(".inkbar").each(function(){
		if($(this).val()<=10) $(this).attr('id', 'emptybar');
	});
	$(".botones").hide();
});

var socket = io.connect('http://192.168.1.200:3000'); // Conectamos con el servidor

// Callback de progreso
socket.on('progress', function (data) {
	if(data.jobid===id){
		console.log(data);
		$("progress").val(data.progress);
		if(parseInt(data.progress)===parseInt($("progress").attr('max'))){
			$("progress").removeAttr('value');
		}
	}
});

// Callback de mensajes
socket.on('message', function (data) {
	if(data.jobid===id){
		console.log(data);
		$("#msg").html(data.msg);
	}
});

// Callback cuando la impresion finaliza
socket.on('printend', function (data) {
	if(data.jobid===id){
		console.log(data);
		$("progress").hide();
		if(data.success) $("#msg").html("Imprimiendo");
		else $("#msg").html("Error al imprimir");
	}
});

// Callback cuando el escaneado de la imagen finaliza
socket.on('imgend', function (data) {
	if(data.jobid===id){
		console.log(data);
		$("progress").hide();
		if(data.success){
			$("#msg").html("Descargando archivo");
			$( "#download" ).submit();
		} 
		else $("#msg").html("Error al escanear");
	}
});

// Callback cuando el escaneado del pdf finaliza
socket.on('pdfend', function (data) {
	if(data.jobid===id){
		console.log(data);
		$("progress").hide();
		pages++;
		if(data.success){
			$("#msg").html(pages+(pages===1 ? " página escaneada" : " páginas escaneadas"));
			$(".botones").show();	
		} 
		else $("#msg").html("Error al escanear");
	}
});

function add(){
	socket.emit("add", {fname: $("#fname").val()});
	$(".botones").hide();
	$("progress").show();
}

function download() {
	$(".botones").hide();
	$("#msg").html("Descargando archivo");
}

