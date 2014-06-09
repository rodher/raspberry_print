#!/bin/bash

# Ejemplo de uso: scan.sh scanmode fname || scan.sh fname

SCAN_DIR='./scans' 
LOG_DIR='./log'
MAX_DAYS=30

#########################
#		FUNCIONES		#
#########################

fntCheckErrors()
{	
	FILE_LOG=$1;
	if [ -n "`grep \"Error:\" ${FILE_LOG}`" ]; then
		echo "Ha ocurrido un error en el anterior paso. Para más detalles consulta " ${FILE_LOG};
		exit -1;
	fi
}

fntAddPage()
{
	echo "Añadiendo página a ${doc}.pdf"
	pdftk A=${SCAN_DIR}/${doc}.pdf B=${SCAN_DIR}/${fname}.pdf cat A1-end B output ${SCAN_DIR}/${doc}_total.pdf &> ${LOG_DIR}/addPage.log
	fntCheckErrors ${LOG_DIR}/addPage.log
	mv ${SCAN_DIR}/${doc}_total.pdf  ${SCAN_DIR}/${doc}.pdf
	rm ${SCAN_DIR}/${fname}.pdf
	echo "...hecho. Mira los detalles en ${LOG_DIR}/addPage.log"
	echo
}

fntScan()
{	
	echo "Escaneando imagen"
	scanimage --format=tiff --mode Color > ${SCAN_DIR}/${fname}.tiff 2> ${LOG_DIR}/scan.log
	echo "Convirtiendo a ${ext}"
	convert ${SCAN_DIR}/${fname}.tiff  ${SCAN_DIR}/${fname}.${ext} &>> ${LOG_DIR}/scan.log
	fntCheckErrors ${LOG_DIR}/scan.log
	rm ${SCAN_DIR}/${fname}.tiff
	echo "...hecho. Mira los detalles en ${LOG_DIR}/scan.log"
	echo

}


#########################
#		PROGRAMA		#
#########################

echo
find ${SCAN_DIR}/ -mtime +${MAX_DAYS} -delete

if [[ $# == 1 ]]; then
	doc=$1
	fname=$1_parcial
	ext="pdf"
	fntScan
	fntAddPage

elif [[ $# == 2 ]]; then

	fname=$2

	if [[ "$1" == "pdf" ]]; then
		ext="pdf"

	elif [[ "$1" == "img" ]]; then
		ext="jpg"
	else
		echo "Formato de archivo no admitido"
		exit 1
	fi

	fntScan

else
	echo "Número de argumentos incorrecto"
	exit 1
fi

exit 0






