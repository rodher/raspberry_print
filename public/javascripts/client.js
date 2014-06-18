


/*  Funcion para enviar formarios cuando se carga la pagina. 
	Usada en momentos de espera a finalización de comandos de terminal */
function submitForm(){

	var form=document.getElementById('redirform');
	if(form){
		form.submit();
	}

}

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

// Callback cuando el comando finaliza
socket.on('cmdend', function (data) {
	console.log(data);
	$("progress").hide();
	$("#msg").html(data.msg);
});