#Raspberry Print

Servidor de impresión casero en una Raspberry Pi

===============

Pasos para desplegar la aplicación:

1. Configuración de IP stática de la Raspberry Pi: https://www.modmypi.com/blog/tutorial-how-to-give-your-raspberry-pi-a-static-ip-address
2. Descarga de paquetes:
    Necesitas instalar CUPS, SANE, Nodejs, Imagemagick, ink y pdftk

    http://www.bartbania.com/index.php/cups-raspberry-printer/?utm_source=feedly
    
    http://blog.pi3g.com/2013/04/raspberry-pi-sharing-a-scanner-with-the-network-even-windows/
    
    http://revryl.com/2014/01/04/nodejs-raspberry-pi/
    
    sudo apt-get install imagemagick
    
    sudo apt-get install ink
    
    sudo apt-get install pdftk
3. Copiar proyecto en /home/pi/raspberry_print/. Crear carpetas "log","scans" y "prints", además de generar los módulos de node con "npm install"

4. Despliegue de servidor de impresión en nube con Google Cloud Print: http://www.howtogeek.com/169566/how-to-turn-a-raspberry-pi-into-a-google-cloud-print-server/
5. Añadir tareas de la carpeta init a init.d, copiando los respectivos scripts raspberryprint en /etc/init.d/raspberryprint, y ejecutando:

	chmod +x /home/pi/raspberry_print/init/*

	sudo cp /home/pi/raspberry_print/init/* /etc/init.d/

	sudo update-rc.d raspberryprint defaults

	sudo update-rc.d chromium defaults
6. Añadir control diario para matar procesos zombies de chromium. Copia los scripts de la carpeta chromium en sus respectivos sitios:
	
	chmod +x  /home/pi/raspberry_print/chromium/*
	
	sudo cp /home/pi/raspberry_print/chromium/cloudchromium /usr/bin/

	sudo cp /home/pi/raspberry_print/chromium/chromium /etc/cron.daily/
