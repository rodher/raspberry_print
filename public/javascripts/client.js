


/*  Funcion para enviar formarios cuando se carga la pagina. 
	Usada en momentos de espera a finalización de comandos de terminal */
function submitForm(){

	var form=document.getElementById('redirform');
	if(form){
		form.submit();
	}

}

var socket = io.connect('http://localhost:3000');
socket.on('news', function (data) {
console.log(data);
socket.emit('my other event', { my: 'data' });
});