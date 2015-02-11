var pages;

var sizes ={full: "28.5", a5: "21", frame: "15", carnet: "3.2"};	// Array de tamaños de impresion

/*	Cuando el documento está cargado:
	1.	Le damos el valor de las paginas escaneadas a pages
	2. 	Comprobamos el nivel de tinta de cada color
		y si es menor que el 10% cambiamos el color
	3.	Ocultamos los botones de escaneado de pdf
	4. 	Ocultamos parte del formulario de impresion
	5. 	Ocultamos la seleccion de area en scan/pre
	6. 	Ocultamos el link de Inicio mientras haya impresiones o escaneos en proceso
	7. 	Añadimos cambio automatico de la lista de tamaños de impresion al modificar la entrada de texto del tamaño
	8. 	Añadimos logica de seleccion al modo de escaneado, para mostrar o no el checkbox de vista previa
*/
$(document).ready(function() {
	pages=parseInt($("#pages").val());
	$(".inkbar").each(function(){
		if($(this).val()<=10) $(this).attr('id', 'emptybar');
	});
	$(".botones").hide();
	$(".printhid").hide();
	$("#crop").hide();
	$("#back").hide();
	var fsize = function(){$("#sizelist").val("custom");};
	$("#size").change(fsize);
	$("#size").keydown(fsize);
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
	$("#pdfscan").attr('method', 'post'); 		// Cambiamos el metodo REST a POST
	$("#pdfscan").attr('action', '/scan/add');	// y la ruta a /scan/add
	$("#pdfscan").submit();						// Y enviamos el formulario
}

// Funcion onclick del botón de Descarga de scan/pdf.ejs
function download() {
	$(".botones").hide();					// Ocultamos botones de accion
	$("#back").show(); 						// Mostramos el link de Inicio
	$("#msg").html("Descargando archivo");	// Cambiamos el mensaje
	$("#pdfscan").submit();					// Enviamos formulario
}

// Funcion onchange del boton de subida de archivos para imprimir
function fileSelected() {
	var ext = $("#printing").val().match(/\.[0-9a-z]+$/i);	// Extraemos la extension del archivo subido
	if(ext){
		if(ext[0]===".pdf"){				// Si se trata de un pdf, ocultamos seleccion de tamaño y borramos valor
			$("#divsize").hide();
			$("#size").val("");
		}
		else{
			$("#sizelist").val("full");		// Si se trata de una imagen, mostramos seleccion de tamaño y
			$("#size").val(sizes["full"]);	// seleccionamos el tamaño de pagina completa
			$("#divsize").show();
		}		
	}
}

// Funcion onchange del selector de tamaño de impresion
function checkSize() {
	var pagesize = $("#sizelist").val();		// Si el valor es Altura personalizada, cambiamos foco a la caja de texto
	if(pagesize==="custom") $("#size").focus();	// En cualquier otro caso escribimos en la caja de texto el tamaño
	else $("#size").val(sizes[pagesize]);		// correspondiente buscandolo en el array de tamaños de impresion
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

// Funcion que envia el formulario de borrado de archivos
function submitDelete(kind, file){
	$("form[action='/"+kind+"/"+file+"?_method=DELETE']").submit();
}

var socket = io.connect($(location).attr('href')); // Conectamos con el servidor usando la ruta cliente

///////////////FUNCIONES QUE EMITEN A TRAVES DEL SOCKET///////////////////

// Funcion onclick de Pausar/Reanudar impresora
function togrdy(rdy){
	socket.emit('togrdy', {ready: rdy});
}

// Funcion onclick de Aceptar/Rechazar Trabajos
function togacpt(acpt){
	socket.emit('togacpt', {accept: acpt});
}

// Funcion onclick de Liberar/Pausar Trabajo
function toghold(id, hold){
	socket.emit('toghold', {id: id, hold: hold});
}

// Funcion onclick de Cancelar trabajo
function cancel(id){
	socket.emit('cancel', {id: id});
}

// Funcion onclick de Cancelar todos los trabajos
function cancelAll(){
	socket.emit('cancelAll');
}

/*	CALLBACKS DEL SOCKET
	En todos ellos debemos comprobar si la conversacion esta marcada
	con nuestro mismo id de socket para hacer caso al envio o no
*/

// Callback de progreso
socket.on('progress', function (data) {
	if(data.id===socket.io.engine.id){
		$("progress").val(data.progress);
		if(parseInt(data.progress)===parseInt($("progress").attr('max'))){ // Si llegamos al valor máximo
			$("progress").removeAttr('value');							  // cambiamos la barra a estado 
		}																  // indeterminado
	}
});

// Callback de mensajes
socket.on('message', function (data) {
	if(data.id===socket.io.engine.id){
		$("#msg").html(data.msg);
	}
});

// Callback cuando la impresion finaliza
socket.on('printend', function (data) {
	if(data.id===socket.io.engine.id){
		$("progress").hide(); 							// Ocultamos la barra de progreso
		if(data.success){ 
			$("#msg").html("Imprimiendo");	// Informamos si ha habido error o no
			window.location.replace("/settings#printjobs") // Redirigimos a ajustes
		}else{ 
			$("#msg").html('Error al imprimir. Dirígete al <a href="/help#problemas">Solucionador de problemas</a>.');
			$("#back").show(); // Mostramos el link de Inicio
		}
	}
});

// Callback cuando el escaneado de la imagen finaliza
socket.on('imgend', function (data) {
	$("#back").show(); // Mostramos el link de Inicio
	if(data.id===socket.io.engine.id){
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
	if(data.id===socket.io.engine.id){
		$("progress").hide(); // Ocultamos la barra de progreso
		if(data.success){
			$("#msg").html(pages+(pages===1 ? " página escaneada" : " páginas escaneadas"));
			$(".botones").show();	// Mostramos los botones de accion
		} 
		else $("#msg").html("Error al escanear");
	}
});

// Callback cuando el escaneado de la vista previa finaliza
socket.on('preend', function (data) {
	if(data.id===socket.io.engine.id){
		$("progress").hide();	// Ocultamos la barra de progreso
		if(data.success){		// Si ha habido exito cargamos la imagen y preparamos la selección de área
			$("#msg").html("Vista previa completada. Selecciona el área que quieres escanear.");
			$("#imagen").attr('src', '/images/'+$("#fname").val()+'_pre.jpg');
			$("#imagen").imgAreaSelect({
				onSelectEnd: function (img, selection) {
					if(!selection.width || !selection.height) cancelSelection(); 	// Si no se ha seleccionado nada
					else{															// cancelamos la seleccion
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

// Callback al envio del estado de la impresora
socket.on('pstat', function (data){

	$("#togglerdy").removeAttr("onclick"); // Eliminamos el onclick original del boton

	$("#togglerdy").off("click").click( function(){togrdy(data.ready&&true)}); //Cambiamos el parametro de la funcion onclick

	$("#rdy").html(data.ready || "Pausada");					// Cambiamos la informacion y el nombre del boton
	if(data.ready) $("#togglerdy").html("Pausar Impresora");
	else $("#togglerdy").html("Reanudar Impresora");
});

// Callback al envio de la aceptacion de trabajos
socket.on('pacpt', function (data){

	$("#toggleacpt").removeAttr("onclick"); // Eliminamos el onclick original del boton

	$("#toggleacpt").off("click").click( function(){togacpt(data.accept)}); //Cambiamos el parametro de la funcion onclick

	if(data.accept){ 
		$("#acpt").html("Aceptando trabajos");			// Cambiamos la informacion y el nombre del boton
		$("#toggleacpt").html("Rechazar trabajos");
	}
	else{
		$("#acpt").html("Rechazando trabajos");
		$("#toggleacpt").html("Aceptar trabajos");
	}
});

// Calback al envio de la cola de trabajos
socket.on('queue', function (data){
	
	$("#pqueue tr").each(function(i){	// Borra la tabla actual, dejando solo la fila de encabezado
		if(i>0){
			$(this.remove());
		}
	});
	for(var i in data.jobs){										// El bucle itera tantas veces como trabajos haya en la cola
		var flag = data.jobs[i].stat==="Pausado";					// Determina si el trabajo esta liberado o pausado
		var hbtn =  flag ? "Liberar Trabajo" : "Pausar Trabajo";
		$("#pqueue").append('<tr><td>'+data.jobs[i].fname +'</td><td>'+data.jobs[i].stat+'</td>'	// Rellena la columna con
			+'<td><progress value='+(data.jobs[i].lvl||0)+' max="100"></progress></td>'				// cada celda y con las
			+'<td><button type="button" onclick="toghold('+i+','+flag+')">'+hbtn+'</button>'		// funciones onclick
			+'<button type="button" onclick="cancel('+i+')" >Cancelar Trabajo</button></td></tr>');
	}
});