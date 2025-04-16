from flask import request, jsonify, url_for, Blueprint, session
from api.models import db, User, Logo, Compras, Facturas, Cliente
from api.utils import generate_sitemap, APIException
from flask_cors import CORS
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from flask import send_from_directory
from api.upload_routes import upload
import os
import random
import string
import time
from werkzeug.utils import secure_filename  # Línea 9

api = Blueprint('api', __name__)

CORS(api)

@api.route('/home')
def sitemap():
    return generate_sitemap(api)

@api.route('/', methods=['POST', 'GET'])
def handle_hello():
    response_body = {
        "message": "Hello! I'm a message that came from the backend, check the network tab on the google inspector and you will see the GET request"
    }
    return jsonify(response_body), 200

# Endpoint para generar usuario anónimo
@api.route('/anonymous/create', methods=['POST'])
def create_user_anonymous():
    existing_token = request.cookies.get('anonymousToken')

    if existing_token:
        return jsonify({
            'message': "El usuario anónimo ya existe",
            'isNew': False,
            
        }), 200

    # Crear usuario anónimo con un email temporal y una contraseña aleatoria
   
    timestamp = int(time.time())
    random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    temp_email = f"anonymous_{timestamp}_{random_suffix}@temp.com"
    temp_password = ''.join(random.choices(string.ascii_letters + string.digits, k=12))

    # Crear el usuario anónimo
    anonymous_user = User(
        email=temp_email,
        password=temp_password,  # Se encriptará automáticamente gracias al setter
        shopname="Anonymous Shop",
        is_active=True
    )

    try:
        db.session.add(anonymous_user)
        db.session.commit()

        # Crear un logo por defecto para el usuario anónimo
        logo = Logo(user_id=anonymous_user.id)
        db.session.add(logo)
        db.session.commit()

        # Generar token para el usuario anónimo
        token_data = {
            "id": anonymous_user.id,
            "email": anonymous_user.email,
            "is_anonymous": True
        }
        anonymous_token = create_access_token(identity=token_data)

        # Preparar respuesta (en una aplicación real, establecerías el token como cookie)
        response = jsonify({
            'message': "Usuario anónimo creado exitosamente",
            'isNew': True,
            'token': anonymous_token,
            'user': anonymous_user.serialize()
        })

        # Establecer la cookie con el token anónimo
        response.set_cookie('anonymousToken', anonymous_token, max_age=86400*30, secure=True, httponly=True, samesite='Strict')  # Línea 48

        return response, 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f"Error al crear usuario anónimo: {str(e)}"}), 500

# Ruta para registrarse un usuario y loguearse automáticamente (signup)

@api.route('/signup', methods=['POST'])
def create_user():
    body = request.get_json()
    firstname = body.get('firstname')
    lastname = body.get('lastname')
    shopname = body.get('shopname')
    email = body.get('email')
    password = body.get('password')

    # Verifica si no existen los campos
    if not firstname or not lastname or not email or not password or not shopname:
        return jsonify({"msg": "Todos los campos son obligatorios"}), 400

    # Verifica si el usuario existe
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"msg": "El usuario ya existe"}), 403

    try:
        # Encriptamos la contraseña antes de guardarla
        hashed_password = User.hash_password(password)

        # Creamos el nuevo usuario
        new_user = User(
            firstname=firstname,
            lastname=lastname,
            shopname=shopname,
            email=email,
            password=hashed_password,
            logo = Logo(new_user.id),  
            is_active=True  # Asumiendo que el usuario está activo por defecto
        )

        db.session.add(new_user)
        db.session.flush()
        db.session.commit()

        # Creamos el token de acceso
        access_token = create_access_token(identity=new_user.id)

        return jsonify({
            "message": "Usuario creado exitosamente",
            "access_token": access_token,
            "user": new_user.serialize()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Ocurrió un error al crear el usuario: {str(e)}"}), 500

# Ruta para logearse y creación de token

@api.route('/login', methods=['POST'])
def login():
    try:
        body = request.get_json()
        if not body:
            return jsonify({"error": "No se proporcionaron datos"}), 400
            
        email = body.get("email")
        password = body.get("password")

        if not email or not password:
            return jsonify({"error": "Email y password son requeridos"}), 400

        user = User.query.filter_by(email=email).first()

        if not user:
            return jsonify({"error": "usuario incorrecto"}), 401

        if not user.check_password(password):
            return jsonify({"error": "password incorrecto"}), 401

        # Crear token con información del usuario (incluyendo URL del logo si existe)
        user_data = user.serialize()
        
        # Obtener logo si existe
        logo = Logo.query.filter_by(user_id=user.id).first()
        logo_url = logo.image_logo_url if logo else None
        
        # Incluir información en el token
        token_data = {
            "id": user.id,
            "email": user.email,
            "logo_url": logo_url
        }
        
        access_token = create_access_token(identity=token_data)

        return jsonify({
            "access_token": access_token,
            "user": user_data,
            "logo_url": logo_url

        }), 200
    except Exception as e:
        return jsonify({"error": f"Error en login: {str(e)}"}), 500
    
# Ruta del acceso settings del usuario
@api.route('/settings', methods=['GET'])
@jwt_required()  # Precisa de token para acceder
def get_user_info():
    # Devuelve el ID porque se lo he pasado al crear access_token
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)

    return jsonify({
        "name": user.serialize()["username"]
    }), 200


def allowed_file(filename):
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# Ruta para subir y guardar el logo
@api.route('/post_logos', methods=['POST'])
def post_logos():
    current_user_id = get_jwt_identity()  # Obtener el id del usuario desde el token JWT
    
    # Verificar si el archivo ha sido subido
    if 'logo' not in request.files:
        return jsonify({'error': 'No logo provided'}), 400

    logo_file = request.files['logo']

    # Verificar si se seleccionó un archivo
    if logo_file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    # Verificar si el archivo tiene una extensión permitida
    if not allowed_file(logo_file.filename):
        return jsonify({'error': 'File type not allowed. Only PNG, JPG, JPEG, GIF are allowed.'}), 400

    user = User.query.get(current_user_id)

    if not user:
        return jsonify({"message": "User not found"}), 404

    # Buscar si ya existe un logo para este usuario
    logo = Logo.query.filter_by(user_id=current_user_id).first()

    # Definir la ruta donde se guardará el logo
    logo_filename = secure_filename(logo_file.filename)
    logo_path = os.path.join('static', 'logos', logo_filename)

    # Asegurarse de que el directorio existe
    if not os.path.exists(os.path.dirname(logo_path)):
        os.makedirs(os.path.dirname(logo_path))

    # Guardar el archivo en el servidor
    try:
        logo_file.save(logo_path)
    except Exception as e:
        return jsonify({"message": f"Error saving the logo: {str(e)}"}), 500
    
    # Si ya existe un logo, actualizamos la URL; si no, creamos uno nuevo
    if logo:
        logo.image_logo_url = logo_path  # Actualizamos la URL del logo
    else:
        new_logo = Logo(image_logo_url=logo_path, user_id=current_user_id)
        db.session.add(new_logo)

    try:
        db.session.commit()
        return jsonify({"message": "Logo updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error updating logo: {str(e)}"}), 500


# Ruta para obtener el logo de un usuario
@api.route('/get_logo', methods=['GET'])
def get_logo():
    current_user_id = get_jwt_identity()  # Obtener el id del usuario desde el token JWT
    
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404

    # Buscar si existe un logo para el usuario
    logo = Logo.query.filter_by(user_id=current_user_id).first()

    if not logo:
        return jsonify({"message": "Logo not found"}), 404
    
    # Obtener la ruta del logo y devolver la imagen
    logo_path = logo.image_logo_url
    
    # Servir la imagen desde el directorio donde se encuentra
    try:
        return send_from_directory(os.path.dirname(logo_path), os.path.basename(logo_path))
    except Exception as e:
        return jsonify({"message": f"Error serving logo: {str(e)}"}), 500
    
#
# --- USUARIO ---
# Muestra todos los usuarios
#
@api.route('/users', methods=['GET'])
def get_all_users():

    users = User.query.all()

    if not users:
        return jsonify({ "msg": "Users not found"}), 404
    
    response_body = [user.serialize() for user in users]

    return jsonify(response_body), 200

#
# Muestra los datos de un usuario
#
@api.route('/users/<int:user_id>', methods=['GET'])
def get_user(user_id):

    user = User.query.get(user_id)

    if user is None:
        return jsonify({ "msg": "User not found"}), 404
    
    response_body = user.serialize()
    
    return jsonify(response_body), 200


#
# Actualizar un usuario existente
#
@api.route('/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    # Buscamos al usuaruio por su ID
    user = User.query.get(user_id)

    # Verificamos si el usuario existe
    if not user:
        return jsonify({"error": "Usuario no encontrada"}), 404
    
    # Obtenemos los datos de la request
    request_data = request.get_json()

    # Actualizamos los campos si estan presentes en la solicitud
    if "firstname" in request_data:
        user.firstname = request_data['firstname']
    
    if "lastname" in request_data:
        user.lastname = request_data['lastname']

    if "shopname" in request_data:
        user.shopname = request_data['shopname']

    if "email" in request_data:
        user.email = request_data['email']

    if "password" in request_data:
        user.password = request_data['password']

    # Si sale error al actualizar especie, hacemos try/except
    try:
        # Guardamos los cambios en la base de datos
        db.session.commit()

        # Devolvemos (retornamos) la especie actualizada
        return jsonify(user.serialize()), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f"Error al actualizar el usuario: {str(e)}"}), 500

#
# Borra un usuario
#
@api.route('/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    # Buscamos al usuario por ID
    user = User.query.get(user_id)

    # Verificar si el usuario existe
    if not user:
        return jsonify({"error": "Usuario no encontrado"}), 404
    
    # Si sale error al eliminar usuario, hacemos try/except
    try:
        # Eliminamos el usuario de la base de datos
        db.session.delete(user)
        db.session.commit()

        # Devolver mensaje de exito
        return jsonify({"message": f"Usuario {user_id} eliminado correctamente"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f"Error al eliminar el usuario: {str(e)}"}), 500
    
#
# --- COMPRAS ---
# Muestra todas las compras
#
@api.route('/compras', methods=['GET'])
def get_all_compras():

    compras = Compras.query.all()

    if not compras:
        return jsonify({ "msg": "No hay compras"}), 404
    
    response_body = [compra.serialize() for compra in compras]

    return jsonify(response_body), 200

#
# Muestra los datos de una compra
#
@api.route('/compras/<int:compra_id>', methods=['GET'])
def get_compra(compra_id):

    compra = Compras.query.get(compra_id)

    if compra is None:
        return jsonify({ "msg": "Compra no encontrada"}), 404
    
    response_body = compra.serialize()
    
    return jsonify(response_body), 200


#
# Actualizar una compra existente
#
@api.route('/compras/<int:compra_id>', methods=['PUT'])
def update_compra(compra_id):
    # Buscamos la compra por su ID
    compra = Compras.query.get(compra_id)

    # Verificamos si la compra existe
    if not compra:
        return jsonify({"error": "Compra no encontrada"}), 404
    
    # Obtenemos los datos de la request
    request_data = request.get_json()

    # Actualizamos los campos si estan presentes en la solicitud
    if "fecha_compra" in request_data:
        compra.fecha_compra = request_data['fecha_compra']
    
    if "proveedor" in request_data:
        compra.proveedor = request_data['proveedor']

    if "numero_factura" in request_data:
        compra.numero_factura = request_data['numero_factura']

    if "total" in request_data:
        compra.total = request_data['total']

    if "estado" in request_data:
        compra.estado = request_data['estado']

    # Si sale error al actualizar especie, hacemos try/except
    try:
        # Guardamos los cambios en la base de datos
        db.session.commit()

        # Devolvemos (retornamos) la especie actualizada
        return jsonify(compra.serialize()), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f"Error al actualizar la compra: {str(e)}"}), 500

#
# Borrar una compra
#
@api.route('/compras/<int:compra_id>', methods=['DELETE'])
def delete_compra(compra_id):
    # Buscamos la compra por ID
    compra = Compras.query.get(compra_id)

    # Verificar si la compra existe
    if not compra:
        return jsonify({"error": "Compra no encontrada"}), 404
    
    # Si sale error al eliminar compra, hacemos try/except
    try:
        # Eliminamos la compra de la base de datos
        db.session.delete(compra)
        db.session.commit()

        # Devolver mensaje de exito
        return jsonify({"message": f"Compra nº{compra_id} eliminado correctamente"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f"Error al eliminar la compra: {str(e)}"}), 500
    
#
# --- FACTURAS ---
# Muestra todas las facturas
#
@api.route('/facturas', methods=['GET'])
def get_all_bills():

    bills = Facturas.query.all()

    if not bills:
        return jsonify({ "msg": "No hay facturas"}), 404
    
    response_body = [bill.serialize() for bill in bills]

    return jsonify(response_body), 200

#
# Muestra los datos de una factura
#
@api.route('/facturas/<int:bill_id>', methods=['GET'])
def get_bill(bill_id):

    bill = Facturas.query.get(bill_id)

    if bill is None:
        return jsonify({ "msg": "Factura no encontrada"}), 404
    
    response_body = bill.serialize()
    
    return jsonify(response_body), 200


#
# Actualizar una factura existente
#
@api.route('/facturas/<int:bill_id>', methods=['PUT'])
def update_bill(bill_id):
    # Buscamos la factura por su ID
    bill = Facturas.query.get(bill_id)

    # Verificamos si la factura existe
    if not bill:
        return jsonify({"error": "Factura no encontrada"}), 404
    
    # Obtenemos los datos de la request
    request_data = request.get_json()

    # Actualizamos los campos si estan presentes en la solicitud
    if "num_factura" in request_data:
        bill.num_factura = request_data['num_factura']
    
    if "fecha_emision" in request_data:
        bill.fecha_emision = request_data['fecha_emision']

    if "fecha_vencimiento" in request_data:
        bill.fecha_vencimiento = request_data['fecha_vencimiento']

    if "cliente_nombre" in request_data:
        bill.cliente_nombre = request_data['cliente_nombre']

    if "cliente_direccion" in request_data:
        bill.cliente_direccion = request_data['cliente_direccion']

    if "cliente_email" in request_data:
        bill.cliente_email = request_data['cliente_email']

    if "cliente_telefono" in request_data:
        bill.cliente_telefono = request_data['cliente_telefono']

    if "cif_cliente" in request_data:
        bill.cif_cliente = request_data['cif_cliente']

    if "cif_empresa" in request_data:
        bill.cif_empresa = request_data['cif_empresa']

    if "subtotal" in request_data:
        bill.subtotal = request_data['subtotal']

    if "impuestos" in request_data:
        bill.impuestos = request_data['impuestos']

    if "total" in request_data:
        bill.total = request_data['total']

    if "estado" in request_data:
        bill.estado = request_data['estado']

    if "notas" in request_data:
        bill.notas = request_data['notas']

    # Si sale error al actualizar factura, hacemos try/except
    try:
        # Guardamos los cambios en la base de datos
        db.session.commit()

        # Devolvemos (retornamos) la factura actualizada
        return jsonify(bill.serialize()), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f"Error al actualizar la factura: {str(e)}"}), 500

#
# Borrar una factura
#
@api.route('/facturas/<int:factura_id>', methods=['DELETE'])
def delete_factura(factura_id):
    # Buscamos la factura por ID
    factura = Facturas.query.get(factura_id)

    # Verificar si la factura existe
    if not factura:
        return jsonify({"error": "Factura no encontrada"}), 404
    
    # Si sale error al eliminar factura, hacemos try/except
    try:
        # Eliminamos la factura de la base de datos
        db.session.delete(factura)
        db.session.commit()

        # Devolver mensaje de exito
        return jsonify({"message": f"Factura nª{factura_id} eliminado correctamente"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f"Error al eliminar la factura: {str(e)}"}), 500
    
#
# --- Cliente ---
# Muestra todos los clientes
#
@api.route('/clientes', methods=['GET'])
def get_all_clientes():

    clientes = Cliente.query.all()

    if not clientes:
        return jsonify({ "msg": "Clients not found"}), 404
    
    response_body = [cliente.serialize() for cliente in clientes]

    return jsonify(response_body), 200

#
# Muestra los datos de un cliente
#
@api.route('/clientes/<int:cliente_id>', methods=['GET'])
def get_cliente(cliente_id):

    cliente = Cliente.query.get(cliente_id)

    if cliente is None:
        return jsonify({ "msg": "Client not found"}), 404
    
    response_body = cliente.serialize()
    
    return jsonify(response_body), 200


#
# Actualizar un cliente existente
#
@api.route('/clientes/<int:cliente_id>', methods=['PUT'])
def update_cliente(cliente_id):
    # Buscamos al cliente por su ID
    cliente = Cliente.query.get(cliente_id)

    # Verificamos si el ciente existe
    if not cliente:
        return jsonify({"error": "Cliente no encontrado"}), 404
    
    # Obtenemos los datos de la request
    request_data = request.get_json()

    # Actualizamos los campos si estan presentes en la solicitud
    if "nombre" in request_data:
        cliente.nombre = request_data['nombre']
    
    if "direccion" in request_data:
        cliente.direccion = request_data['direccion']

    if "email" in request_data:
        cliente.email = request_data['email']

    if "telefono" in request_data:
        cliente.telefono = request_data['telefono']

    if "cif" in request_data:
        cliente.cif = request_data['cif']

    # Si sale error al actualizar cliente, hacemos try/except
    try:
        # Guardamos los cambios en la base de datos
        db.session.commit()

        # Devolvemos (retornamos) el cliente actualizada
        return jsonify({
            'msg': "Cliente actualizado con éxito",
            'update': cliente.serialize()
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f"Error al actualizar el cliente: {str(e)}"}), 500

#
# Borra un cliente
#
@api.route('/clientes/<int:cliente_id>', methods=['DELETE'])
def delete_cliente(cliente_id):
    # Buscamos al cliente por ID
    cliente = Cliente.query.get(cliente_id)

    # Verificar si el cliente existe
    if not cliente:
        return jsonify({"error": "Cliente no encontrado"}), 404
    
    # Si sale error al eliminar cliente, hacemos try/except
    try:
        # Eliminamos el cliente de la base de datos
        db.session.delete(cliente)
        db.session.commit()

        # Devolver mensaje de exito
        return jsonify({"message": f"Cliente {cliente_id} eliminado correctamente"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f"Error al eliminar el cliente: {str(e)}"}), 500