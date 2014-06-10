#!/bin/bash

# Ejemplo de uso: print.sh colormode pagemode pagelist ncopy file

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
		echo "Ha ocurrido un error en el anterior paso. Para más detalles consulta " ${FILE_LOG};
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
	rm ${PRINT_DIR}/${fname}.${ext}
	echo "...hecho. Mira los detalles en ${LOG_DIR}/convertJPG.log"
	echo
}

# Funcion para pasar archivos a blanco y negro
fntBW() 
{

	echo "Pasando imagen a blanco y negro"
	convert ${PRINT_DIR}/${file} -modulate 100,0 ${PRINT_DIR}/${file} &> ${LOG_DIR}/convertBW.log
	fntCheckErrors ${LOG_DIR}/convertBW.log
	echo "...hecho. Mira los detalles en ${LOG_DIR}/convertBW.log"
	echo
}

# Funcion que determina la lista de páginas a imprimir en caso de imprimir pares o impares
fntParImpar(){
	echo "Extrayendo la lista de páginas a imprimir"
	n="`pdftk ${PRINT_DIR}/${file} dump_data output | grep -i Num | grep -E -o [0-9]+`"
	if [[ "${page_mode}" == "impar" ]]; then
		i=1
	elif [[ "${page_mode}" == "par" ]]; then
		i=2
	fi
	page_list=${i}
	for (( i += 2; i <= n; i+=2 )); do
		page_list="${page_list},${i}"
	done
	echo "...hecho."
	echo
}

# funcion que ejecuta el comando de impresion
fntLP() 
{

	echo "Imprimiendo"
	${cmd} -n ${ncopy} ${PRINT_DIR}/${file} &> ${LOG_DIR}/LP.log
	fntCheckErrors ${LOG_DIR}/LP.log
	echo "...hecho. Mira los detalles en ${LOG_DIR}/LP.log"
	echo
}

#########################
#		VARIABLES		#
#########################

if [[ $# != 5 ]]; then
	echo "Número incorrecto de argumentos"
	exit 1
fi

color_mode=$1 		# Valores: color bw
page_mode=$2	 	# Valores: all interval par impar
page_list=$3 		# Lista de páginas a imprimir
ncopy=$4			# Número de copias a imprimir
file=$5				# Archivo a imprimir
cmd="lp"			# Comando a ejecutar
fname="${file%.*}"	# Nombre de archivo sin extension
ext="${file##*.}"	# Extension del archivo


# Obtencion del tipo de archivo: Imagen o PDF
if [[ "$ext" == "pdf" ]]; then
	file_mode="pdf"

elif [[ "$ext" == "jpg" || "$ext" == "jpeg" || "$ext" == "JPG" || "$ext" == "gif" || "$ext" == "GIF" || "$ext" == "bmp" || "$ext" == "BMP" || "$ext" == "tiff" || "$ext" == "TIFF" || "$ext" == "png" || "$ext" == "PNG" ]]; then
	file_mode="img"
else
	echo "Formato de archivo no admitido"
	exit 1
fi

#########################
#		PROGRAMA		#
#########################

echo
find ${PRINT_DIR}/ -mtime +${MAX_DAYS} -delete # Borrado de archivos que llevan más de unos ciertos dias almacenados

if [[ "$file_mode" == "img" ]]; then
	if [[ "$ext" != "jpg" ]]; then
		fntJPG
	fi
fi

if [[ "$color_mode" == "bw" ]]; then
	fntBW
fi

if [[ "$file_mode" == "pdf" ]]; then
	if [[ "$page_mode" == "impar" || "$page_mode" == "par"  ]]; then
		fntParImpar
	fi

	if [[ "$page_mode" != "all" ]]; then
		cmd=${cmd}" -P "${page_list}
	fi
fi

fntLP

exit 0





