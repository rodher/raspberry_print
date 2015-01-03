#Raspberry Print

Servidor de impresión casero en una Raspberry Pi

===============

Pasos para desplegar la aplicación:

1. Configuración de IP stática de la Raspberry Pi:
	sudo cp /home/pi/raspberry_print/conf/interfaces /etc/network/interfaces 
	
2. Descarga de paquetes:
    Necesitas instalar CUPS, SANE, Nodejs, Imagemagick, ink y pdftk

    sudo apt-get install cups
    
    sudo usermod -a -G lpadmin pi
    
    sudo cp /home/pi/raspberry_print/conf/cupsd.conf /etc/cups/cupsd.conf
    
    sudo /etc/init.d/cups restart
    
    Añade impresora en 192.168.1.200:631
    
    sudo lpadmin -d EPSON_Stylus_DX7400
    
    lpadmin -d EPSON_Stylus_DX7400
    
    
    sudo aptitude update
    
    sudo aptitude install xinetd sane-utils
    
    sudo cp /home/pi/raspberry_print/conf/saned /etc/default/saned 
    
    
    wget http://node-arm.herokuapp.com/node_latest_armhf.deb
    
    sudo dpkg -i node_latest_armhf.deb
    
    rm node_latest_armhf.deb
    
    
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
	
Referencias:

https://www.modmypi.com/blog/tutorial-how-to-give-your-raspberry-pi-a-static-ip-address
http://www.howtogeek.com/169679/how-to-add-a-printer-to-your-raspberry-pi-or-other-linux-computer/
http://blog.pi3g.com/2013/04/raspberry-pi-sharing-a-scanner-with-the-network-even-windows/
http://revryl.com/2014/01/04/nodejs-raspberry-pi/

