
var pages=0;
var id;

/*	Cuando el documento está cargado:
	1. 	Guardamos el pid como id de nuestra conversacion
	2. 	Comprobamos el nivel de tinta de cada color
		y si es menor que el 10% cambiamos el color
	3.	Ocultamos los botones de escaneado de pdf
*/
$(document).ready(function() {
	id = parseInt($("#job").val()); 
	$(".inkbar").each(function(){
		if($(this).val()<=10) $(this).attr('id', 'emptybar');
	});
	$(".botones").hide();
});

// Funcion onclick de "Añadir otra pagina"
function add(){
	socket.emit("add", {fname: $("#fname").val()}); // Mandamos orden de imprimir otra pagina
	$(".botones").hide(); 							// Ocultamos botones de accion
	$("progress").show();							// Mostramos barra de progreso
}

// Funcion onsubmit del formulario de scan/pdf.ejs
function download() {
	$(".botones").hide();					// Ocultamos botones de accion
	$("#msg").html("Descargando archivo");	// Cambiamos el mensaje
}

var socket = io.connect('http://192.168.1.200:3000'); // Conectamos con el servidor


/*	CALLBACKS DEL SOCKET
	En todos ellos debemos comprobar si la conversacion esta marcada
	con nuestro mismo PID para hacer caso al envio o no
*/

// Callback de progreso
socket.on('progress', function (data) {
	if(data.jobid===id){
		$("progress").val(data.progress);
		if(parseInt(data.progress)===parseInt($("progress").attr('max'))){ // Si llegamos al valor máximo
			$("progress").removeAttr('value');							  // cambiamos la barra a estado 
		}																  // indeterminado
	}
});

// Callback de mensajes
socket.on('message', function (data) {
	if(data.jobid===id){
		$("#msg").html(data.msg);
	}
});

// Callback cuando la impresion finaliza
socket.on('printend', function (data) {
	if(data.jobid===id){
		$("progress").hide(); 							// Ocultamos la barra de progreso
		if(data.success) $("#msg").html("Imprimiendo");	// Informamos si ha habido error o no
		else $("#msg").html("Error al imprimir");
	}
});

// Callback cuando el escaneado de la imagen finaliza
socket.on('imgend', function (data) {
	if(data.jobid===id){
		$("progress").hide();	// Ocultamos la barra de progreso
		if(data.success){		// Si ha habido exito descargamos el archivo
			$("#msg").html("Descargando archivo");
			$( "#download" ).submit();
		} 
		else $("#msg").html("Error al escanear");
	}
});

// Callback cuando el escaneado del pdf finaliza
socket.on('pdfend', function (data) {
	if(data.jobid===id){
		$("progress").hide(); // Ocultamos la barra de progreso
		pages++;			  // Aumentamos la cuenta de paginas escaneadas
		if(data.success){
			$("#msg").html(pages+(pages===1 ? " página escaneada" : " páginas escaneadas"));
			$(".botones").show();	// Mostramos los botones de accion
		} 
		else $("#msg").html("Error al escanear");
	}
});