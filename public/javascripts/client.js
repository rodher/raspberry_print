


/*  Funcion para enviar formarios cuando se carga la pagina. 
	Usada en momentos de espera a finalización de comandos de terminal */
function submitForm(){

	var form=document.getElementById('redirform');
	if(form){
		form.submit();
	}

}

$(document).ready(function() {
	$(".inkbar").each(function(){
		if($(this).val()<=10) $(this).attr('id', 'emptybar');
	});
});


var socket = io.connect('http://192.168.1.200:3000'); // Conectamos con el servidor

// Callback de progreso
socket.on('progress', function (data) {
	console.log(data);
	$("progress").val(data.progress);
	if(parseInt(data.progress)===parseInt($("progress").attr('max'))){
		$("progress").removeAttr('value');
	}
});

// Callback de mensajes
socket.on('message', function (data) {
	console.log(data);
	$("#msg").html(data.msg);
});

// Callback cuando la impresion finaliza
socket.on('printend', function (data) {
	console.log(data);
	$("progress").hide();
	if(data.success) $("#msg").html("Imprimiendo");
	else $("#msg").html("Error al imprimir");
});

// Callback cuando el escaneado de la imagen finaliza
socket.on('imgend', function (data) {
	console.log(data);
	$("progress").hide();
	if(data.success) $("#msg").html("Descargando archivo");
	else $("#msg").html("Error al escanear");
	$( "#download" ).submit();
});

