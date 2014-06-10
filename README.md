#Raspberry Print

Servidor de impresión casero en una Raspberry Pi

===============

Pasos para desplegar la aplicación:

1. Configuración de IP stática de la Raspberry Pi: https://www.modmypi.com/blog/tutorial-how-to-give-your-raspberry-pi-a-static-ip-address
2. Descarga de paquetes:
    Necesitas instalar CUPS, SANE, Imagemagick, ink y pdftk
    http://www.bartbania.com/index.php/cups-raspberry-printer/?utm_source=feedly
    http://blog.pi3g.com/2013/04/raspberry-pi-sharing-a-scanner-with-the-network-even-windows/
    
    sudo apt-get install imagemagick
    
    sudo apt-get install ink
    
    sudo apt-get install pdftk
3. Copiar proyecto en /home/pi/raspberry_print/
4. Añadir tarea a init.d, copiando el script raspberryprint en /etc/init.d/raspberryprint, y ejecutando:

sudo chmod +x /etc/init.d/raspberryprint

sudo update-rc.d raspberryprint defaults

