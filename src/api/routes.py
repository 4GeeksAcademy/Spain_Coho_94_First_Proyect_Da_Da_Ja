from flask import request, jsonify, url_for, Blueprint, session
from api.models import db, User, Logo
from api.utils import generate_sitemap, APIException
from flask_cors import CORS
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from flask import send_from_directory
from api.upload_routes import upload
import os
from datetime import timedelta

from werkzeug.utils import secure_filename

api = Blueprint('api', __name__)


@api.route('/home')
def sitemap():
    return generate_sitemap(api)


@api.route('/', methods=['POST', 'GET'])
def handle_hello():
    response_body = {
        "message": "Hello! I'm a message that came from the backend, check the network tab on the google inspector and you will see the GET request"
    }
    return jsonify(response_body), 200


# Ruta para registrarse un usuario y loguearse automáticamente (signup)
@api.route('/signup', methods=['POST'])
def create_user():
    try:
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

        # Creamos el nuevo usuario
        new_user = User(
            firstname=firstname,
            lastname=lastname,
            shopname=shopname,
            email=email,
            password=password,  # El modelo debe encriptar automáticamente
            is_active=True
        )

        db.session.add(new_user)
        db.session.commit()  # Aquí se le asigna un ID

        # Creamos un logo por defecto para el usuario
        default_logo_path = "/static/logos/default.jpg"
        new_logo = Logo(image_logo_url=default_logo_path, user_id=new_user.id)
        db.session.add(new_logo)
        db.session.commit()

        # Creamos el token con la información del usuario
        token_data = {
            "id": new_user.id,
            "email": new_user.email,
            "logo_url": default_logo_path
        }
        
        access_token = create_access_token(identity=token_data, expires_delta=timedelta(days=365))
        
        return jsonify({
            "msg": "Usuario creado con éxito", 
            "user_id": new_user.id,
            "access_token": access_token
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error en signup: {str(e)}")  # Para depuración
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
            return jsonify({"error": "Usuario incorrecto"}), 401

        if not user.check_password(password):
            return jsonify({"error": "Password incorrecto"}), 401

        # Obtener logo si existe
        logo = Logo.query.filter_by(user_id=user.id).first()
        logo_url = logo.image_logo_url if logo else None
        
        # Incluir información en el token
        token_data = {
            "id": user.id,
            "email": user.email,
            "logo_url": logo_url
        }
        
        access_token = create_access_token(identity=token_data,expires_delta=timedelta(days=365))

        return jsonify({
            "access_token": access_token,
            "user": user.serialize(),
            "logo_url": logo_url
        }), 200
    except Exception as e:
        return jsonify({"error": f"Error en login: {str(e)}"}), 500
    

# Ruta del acceso settings del usuario
@api.route('/settings', methods=['GET'])
@jwt_required()
def get_user_info():
    try:
        # Obtener datos del usuario desde el token
        current_user = get_jwt_identity()
        current_user_id = current_user["id"] if isinstance(current_user, dict) else current_user
        
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({"error": "Usuario no encontrado"}), 404

        return jsonify({
            "user": user.serialize()
        }), 200
    except Exception as e:
        return jsonify({"error": f"Error al obtener información del usuario: {str(e)}"}), 500


# Borrar un usuario existente
@api.route('/settings/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    try:
        # Verificar que el usuario actual puede eliminar este usuario
        current_user = get_jwt_identity()
        current_user_id = current_user["id"] if isinstance(current_user, dict) else current_user
        
        if current_user_id != user_id:
            return jsonify({"error": "No autorizado para eliminar este usuario"}), 403
            
        # Buscamos al usuario por ID
        user = User.query.get(user_id)

        # Verificar si el usuario existe
        if not user:
            return jsonify({"error": "Usuario no encontrado"}), 404

        # Eliminamos el usuario de la base de datos
        db.session.delete(user)
        db.session.commit()

        # Devolver mensaje de éxito
        return jsonify({"message": f"Usuario {user_id} eliminado correctamente"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f"Error al eliminar el usuario: {str(e)}"}), 500


def allowed_file(filename):
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# Ruta para subir y guardar el logo
@api.route('/post_logos', methods=['POST'])
@jwt_required()
def post_logos():
    try:
        current_user = get_jwt_identity()
        current_user_id = current_user["id"] if isinstance(current_user, dict) else current_user
        
        # Verificar si el archivo ha sido subido
        if 'logo' not in request.files:
            return jsonify({'error': 'No se proporcionó logo'}), 400

        logo_file = request.files['logo']

        # Verificar si se seleccionó un archivo
        if logo_file.filename == '':
            return jsonify({'error': 'No se seleccionó ningún archivo'}), 400

        # Verificar si el archivo tiene una extensión permitida
        if not allowed_file(logo_file.filename):
            return jsonify({'error': 'Tipo de archivo no permitido. Solo PNG, JPG, JPEG, GIF están permitidos.'}), 400

        user = User.query.get(current_user_id)
        if not user:
            return jsonify({"error": "Usuario no encontrado"}), 404

        # Crear un nombre de archivo único basado en el ID del usuario y la extensión original
        extension = logo_file.filename.rsplit('.', 1)[1].lower()
        logo_filename = f"user_{current_user_id}.{extension}"
        logo_path = os.path.join('static', 'logos', logo_filename)
        
        # Asegurarse de que el directorio existe
        logos_dir = os.path.join('static', 'logos')
        if not os.path.exists(logos_dir):
            os.makedirs(logos_dir)

        # Guardar el archivo en el servidor
        try:
            logo_file.save(logo_path)
        except Exception as e:
            return jsonify({"error": f"Error al guardar el logo: {str(e)}"}), 500
        
        # Buscar si ya existe un logo para este usuario
        logo = Logo.query.filter_by(user_id=current_user_id).first()
        
        # Si ya existe un logo, actualizamos la URL; si no, creamos uno nuevo
        if logo:
            logo.image_logo_url = logo_path
        else:
            new_logo = Logo(image_logo_url=logo_path, user_id=current_user_id)
            db.session.add(new_logo)

        db.session.commit()
        
        # Actualizar el token con la nueva URL del logo
        token_data = {
            "id": user.id,
            "email": user.email,
            "logo_url": logo_path
        }
        
        new_access_token = create_access_token(identity=token_data,expires_delta=timedelta(days=365))
        
        return jsonify({
            "message": "Logo actualizado correctamente",
            "logo_url": logo_path,
            "access_token": new_access_token
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Error al actualizar el logo: {str(e)}"}), 500


# Ruta para obtener el logo de un usuario
@api.route('/get_logo', methods=['GET'])
@jwt_required()
def get_logo():
    try:
        current_user = get_jwt_identity()
        current_user_id = current_user["id"] if isinstance(current_user, dict) else current_user
        
        # Buscar si existe un logo para el usuario
        logo = Logo.query.filter_by(user_id=current_user_id).first()

        if not logo or not logo.image_logo_url:
            return jsonify({"error": "Logo no encontrado"}), 404
        
        # Obtener la ruta del logo y devolver la imagen
        logo_path = logo.image_logo_url
        
        # Servir la imagen desde el directorio donde se encuentra
        return send_from_directory(os.path.dirname(logo_path), os.path.basename(logo_path))
    except Exception as e:
        return jsonify({"error": f"Error al servir el logo: {str(e)}"}), 500
    
    #--------------------------------------------------------------------------------------------

   