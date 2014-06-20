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
	scanimage -p -x 210 -y 297 --mode Color --resolution=300 > ${SCAN_DIR}/${fname}.pnm
}

# Funcion para convertir a jpg
fntJPG()
{	
	echo "Convirtiendo a jpg"
	convert -quality 75 ${SCAN_DIR}/${fname}.pnm  ${SCAN_DIR}/${fname}.jpg &> ${LOG_DIR}/convertJPG.log
	fntCheckErrors ${LOG_DIR}/convertJPG.log
	rm ${SCAN_DIR}/${fname}.pnm
}

# Funcion para convertir a pdf
fntPDF(){
	echo "Convirtiendo a imagen"
	convert -quality 75 ${SCAN_DIR}/${fname}.pnm  ${SCAN_DIR}/${fname}_tmp.jpg &> ${LOG_DIR}/convertJPG.log
	fntCheckErrors ${LOG_DIR}/convertJPG.log
	rm ${SCAN_DIR}/${fname}.pnm
	echo "Convirtiendo a pdf"
	convert ${SCAN_DIR}/${fname}_tmp.jpg ${SCAN_DIR}/${fname}.pdf &> ${LOG_DIR}/convertPDF.log
	fntCheckErrors ${LOG_DIR}/convertPDF.log
	rm ${SCAN_DIR}/${fname}_tmp.jpg
}

#########################
#		PROGRAMA		#
#########################

find ${SCAN_DIR}/ -mtime +${MAX_DAYS} -delete # Borrado de archivos que llevan más de unos ciertos dias almacenados

# Comportamiento si solo se usa un parametro: Modo escanear y añadir pagina
if [[ $# == 1 ]]; then
	doc=$1
	fname=$1_parcial
	fntScan
	fntPDF
	fntAddPage

# Comportamiento si se usan dos parametros: Modo escanear
elif [[ $# == 2 ]]; then

	fname=$2
	fntScan

	if [[ "$1" == "pdf" ]]; then
		fntPDF
	elif [[ "$1" == "img" ]]; then
		fntJPG
	else
		echo "Formato de archivo no admitido" >&2 
		exit 1
	fi
	
else
	echo "Número de argumentos incorrecto" >&2
	exit 1
fi

exit 0






