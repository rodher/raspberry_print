#!/bin/bash

# Ejemplo de uso: print.sh colormode pagemode pagelist ncopy file
# Profundidad de progreso 3

#########################
#		CONSTANTES		#
#########################

PRINT_DIR='./prints' 	# Directorio donde se guardan las impresiones
LOG_DIR='./log'			# Directorio donde se guardan los logs
MAX_DAYS=30				# Máximo intervalo de días durante los que se almacena un archivo en la aplicacion

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

# Funcion para pasar imagenes a formato jpg
fntJPG()
{
	echo "Convirtiendo imagen a jpg"
	convert ${PRINT_DIR}/${fname}.${ext} -background white -alpha remove ${PRINT_DIR}/${fname}.jpg &> ${LOG_DIR}/convertJPG.log
	file="${fname}.jpg"
	fntCheckErrors ${LOG_DIR}/convertJPG.log
	echo 1 # Primer hito de progreso
	rm ${PRINT_DIR}/${fname}.${ext}
}

# Funcion que extrae las páginas a imprimir en caso de imprimir pares o impares
fntParImpar(){
	echo "Extrayendo lista de páginas a imprimir"
	n="`pdftk ${PRINT_DIR}/${file} dump_data output | grep -i Num | grep -E -o [0-9]+`"
	if [[ "${page_mode}" == "impar" ]]; then
		i=1
	elif [[ "${page_mode}" == "par" ]]; then
		i=2
	fi
	
	pages="A${i}"
	for (( i += 2; i <= n; i+=2 )); do
		pages="${pages} A${i}"
	done
	pdftk A=${PRINT_DIR}/${file} cat ${pages} output ${PRINT_DIR}/${fname}_pagelist.pdf &> ${LOG_DIR}/pageList.log
	fntCheckErrors ${LOG_DIR}/pageList.log
	echo 1 # Primer hito de progreso
	mv ${PRINT_DIR}/${fname}_pagelist.pdf ${PRINT_DIR}/${file}
}

# Funcion que extrae las paginas a imprimir a partir de un intervalo de páginas
fntInterval(){
	echo "Extrayendo lista de páginas a imprimir"
	pages="A"
	for (( i=0; i<${#page_list}; i++ )); do
		if [[ "${page_list:$i:1}" == "," ]]; then
			pages="${pages} A"
		else
			pages=${pages}${page_list:$i:1}
		fi
	done
	pdftk A=${PRINT_DIR}/${file} cat ${pages} output ${PRINT_DIR}/${fname}_pagelist.pdf &> ${LOG_DIR}/pageList.log
	fntCheckErrors ${LOG_DIR}/pageList.log
	echo 1 # Primer hito de progreso
	mv ${PRINT_DIR}/${fname}_pagelist.pdf ${PRINT_DIR}/${file}
}

# Funcion para pasar imagenes a blanco y negro
fntBWimg() 
{

	echo "Pasando imagen a blanco y negro"
	convert ${PRINT_DIR}/${file} -modulate 100,0 ${PRINT_DIR}/${file} &> ${LOG_DIR}/convertBW.log
	fntCheckErrors ${LOG_DIR}/convertBW.log
	echo 2 # Segundo hito de progreso
}

# Funcion para pasar documentos a blanco y negro
fntBWpdf() 
{

	echo "Pasando documento a blanco y negro"
	gs -sOutputFile=${PRINT_DIR}/bw_${file} -sDEVICE=pdfwrite -sColorConversionStrategy=Gray -dProcessColorModel=/DeviceGray -dCompatibilityLevel=1.4 -dNOPAUSE -dBATCH ${PRINT_DIR}/${file} &> ${LOG_DIR}/convertBW.log
	fntCheckErrors ${LOG_DIR}/convertBW.log
	echo 2 # Segundo hito de progreso
	mv ${PRINT_DIR}/bw_${file} ${PRINT_DIR}/${file}
}

# Funcion que ejecuta el comando de impresion
fntLP() 
{

	echo "Mandando impresión"
	lp -n ${ncopy} ${PRINT_DIR}/${file} &> ${LOG_DIR}/LP.log
	fntCheckErrors ${LOG_DIR}/LP.log
	echo 3 # Tercer hito de progreso
}

#########################
#		VARIABLES		#
#########################

if [[ $# != 5 ]]; then
	echo "Número incorrecto de argumentos" >&2
	exit 1
fi

color_mode=$1 		# Valores: color bw
page_mode=$2	 	# Valores: all interval par impar
page_list=$3 		# Lista de páginas a imprimir
ncopy=$4			# Número de copias a imprimir
file=$5				# Archivo a imprimir
fname="${file%.*}"	# Nombre de archivo sin extension
ext="${file##*.}"	# Extension del archivo


# Obtencion del tipo de archivo: Imagen o PDF
if [[ "$ext" == "pdf" ]]; then
	file_mode="pdf"

elif [[ "$ext" == "jpg" || "$ext" == "jpeg" || "$ext" == "JPG" || "$ext" == "gif" || "$ext" == "GIF" || "$ext" == "bmp" || "$ext" == "BMP" || "$ext" == "tiff" || "$ext" == "TIFF" || "$ext" == "png" || "$ext" == "PNG" ]]; then
	file_mode="img"
else
	echo "Formato de archivo no admitido" >&2
	exit 1
fi

#########################
#		PROGRAMA		#
#########################

find ${PRINT_DIR}/ -mtime +${MAX_DAYS} -delete # Borrado de archivos que llevan más de unos ciertos dias almacenados

if [[ "$file_mode" == "img" ]]; then
	if [[ "$ext" != "jpg" ]]; then
		fntJPG
	fi
	
	if [[ "$color_mode" == "bw" ]]; then
		fntBWimg
	fi
elif [[ "$file_mode" == "pdf" ]]; then
	if [[ "$page_mode" == "impar" || "$page_mode" == "par"  ]]; then
		fntParImpar
	elif [[ "$page_mode" == "interval" ]]; then
		fntInterval
	fi

	if [[ "$color_mode" == "bw" ]]; then
		fntBWpdf
	fi
fi

fntLP

exit 0





