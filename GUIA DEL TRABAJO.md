PRUENBA DE SUBIDA A LA RAMA Styles_Dani_2

David 14/04/2025 13:36
Modificado la tabla facturas y compras, y hechas las relaciones
También he añadido las rutas GET, PUT y  DELETE para compras y facturas

David 18/04/2025 15:09
Pasos para hacer el restablecimiento de contraseña
1. Instalar una librería que implementa el envío con el mail. Comando: pipenv install flask-mail
2. Configurar flask-mail en app.py (Líneas 46-54)
3. Enviar email con el token mediante Endpoint /api/request-reset (ubicado en las últimas líneas de código en routes.py)
4. Añadir un componente nuevo (PasswordReset.jsx) que intente conectar a la api