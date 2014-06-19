#!/bin/bash

# Ejemplo de uso: scan.sh scanmode fname || scan.sh fname

#########################
#		CONSTANTES		#
#########################

SCAN_DIR='./scans'	# Directorio donde se almacenan los escaneos
LOG_DIR='./log'		# Directorio donde se almacenan los logs
MAX_DAYS=30			# Máximo intervalo de días durante los que se almacena un archivo en la aplicacion

#########################
#		FUNCIONES		#
#########################

# Funcion para revisar errores
fntCheckErrors()
{	
	FILE_LOG=$1;
	if [ -n "`grep \"Error:\" ${FILE_LOG}`" ]; then
		echo "Ha ocurrido un error en el anterior paso. Para más detalles consulta " ${FILE_LOG} >&2 ;
		exit -1;
	fi
}

# Funcion para añadir paginas a un pdf
fntAddPage()
{
	echo "Añadiendo página a ${doc}.pdf"
	pdftk A=${SCAN_DIR}/${doc}.pdf B=${SCAN_DIR}/${fname}.pdf cat A1-end B output ${SCAN_DIR}/${doc}_total.pdf &> ${LOG_DIR}/addPage.log
	fntCheckErrors ${LOG_DIR}/addPage.log
	mv ${SCAN_DIR}/${doc}_total.pdf  ${SCAN_DIR}/${doc}.pdf
	rm ${SCAN_DIR}/${fname}.pdf

}

# Funcion para escanear
fntScan()
{	
	echo "Escaneando ${fname}"
	scanimage -p --format=tiff --mode Color --resolution=300 > ${SCAN_DIR}/${fname}.tiff
	echo "Convirtiendo a ${ext}"
	convert ${SCAN_DIR}/${fname}.tiff  ${SCAN_DIR}/${fname}.${ext} &>> ${LOG_DIR}/scan.log
	fntCheckErrors ${LOG_DIR}/scan.log
	rm ${SCAN_DIR}/${fname}.tiff

}

#########################
#		PROGRAMA		#
#########################

find ${SCAN_DIR}/ -mtime +${MAX_DAYS} -delete # Borrado de archivos que llevan más de unos ciertos dias almacenados

# Comportamiento si solo se usa un parametro: Modo escanear y añadir pagina
if [[ $# == 1 ]]; then
	doc=$1
	fname=$1_parcial
	ext="pdf"
	fntScan
	fntAddPage

# Comportamiento si se usan dos parametros: Modo escanear
elif [[ $# == 2 ]]; then

	fname=$2

	if [[ "$1" == "pdf" ]]; then
		ext="pdf"

	elif [[ "$1" == "img" ]]; then
		ext="jpg"
	else
		echo "Formato de archivo no admitido" >&2 
		exit 1
	fi

	fntScan

else
	echo "Número de argumentos incorrecto" >&2
	exit 1
fi

exit 0






