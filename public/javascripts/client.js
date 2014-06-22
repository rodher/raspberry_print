
var pages=0;
var id;

/*	Cuando el documento está cargado:
	1. 	Guardamos el pid como id de nuestra conversacion
	2. 	Comprobamos el nivel de tinta de cada color
		y si es menor que el 10% cambiamos el color
	3.	Ocultamos los botones de escaneado de pdf
	4. 	Ocultamos la entrada de la lista de páginas a imprimir
	5. 	Ocultamos la seleccion de area en scan/pre
	6. 	Añadimos logica de seleccion al modo de escaneado, para mostrar o no el checkbox de vista previa
*/
$(document).ready(function() {
	id = parseInt($("#job").val()); 
	$(".inkbar").each(function(){
		if($(this).val()<=10) $(this).attr('id', 'emptybar');
	});
	$(".botones").hide();
	$("#interval").hide();
	$("#crop").hide();
	$('input[name="scan_mode"]').change(function() {
		if($(this).val()==="img") $('#preview').show();
		else if($(this).val()==="pdf"){
			$('#preview').hide();
			$('#cbox').attr('checked', false); // Si el modo es pdf, deseleccionamos el checkbox
		}
	});
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

// Funcion onchange del formulario de modo de paginas de impresion
function checkInterval() {
	if($("#pagemode").val()==="interval") $("#interval").show();	// Si se ha elegido interval se muestra la entrada de texto
	else $("#interval").hide();										// En cualquier otro caso se oculta
}

// Funcion que cancela seleccion del area de la imagen en scan/pre
function cancelSelection(){
	$("#imagen").imgAreaSelect({instance: true})	// Cancelamos la seleccion
				.cancelSelection();
	$('input[name="left"]').val(0);					// Restauramos valores por defecto
	$('input[name="top"]').val(0);
	$('input[name="width"]').val(208.5);
	$('input[name="height"]').val(295.5);

}

// Funcion que pasa de pixeles a centimetros, dividiendo por la escala de 2 y redondeando a un decimal
function toCms(pixels){
	return (pixels/2).toFixed(1);
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

socket.on('preend', function (data) {
	if(data.jobid===id){
		$("progress").hide();	// Ocultamos la barra de progreso
		if(data.success){		// Si ha habido exito cargamos la imagen y preparamos la selección de área
			$("#msg").html("Vista previa completada. Selecciona el área que quieres escanear.");
			$("#imagen").attr('src', '/images/'+$("#fname").val()+'_pre.jpg');
			$("#imagen").imgAreaSelect({
				onSelectEnd: function (img, selection) {
					if(!selection.width || !selection.height) cancelSelection();
					else{
	            		$('input[name="left"]').val(toCms(selection.x1));
	            		$('input[name="top"]').val(toCms(selection.y1));
	            		$('input[name="width"]').val(toCms(selection.width));
	            		$('input[name="height"]').val(toCms(selection.height));  						
					};
        		}
			});
			$("#crop").show();
		} 
		else $("#msg").html("Error al escanear");
	}
});