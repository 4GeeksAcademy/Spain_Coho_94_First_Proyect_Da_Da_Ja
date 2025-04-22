from flask_jwt_extended import jwt_required, get_jwt_identity
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from api.models import db, User, Logo, Shop, Productos
from flask_cors import CORS
import uuid
import re
import os

store = Blueprint('store', __name__)


def slugify(text):
   
    text = text.lower().strip()
    text = re.sub(r'\s+', '-', text)

    text = re.sub(r'[^\w\-]', '', text)
    return text


def generate_store_url(store_name):
    """Genera una URL única basada en el nombre de la tienda"""
   
    base_slug = slugify(store_name)

    
    slug = base_slug
    counter = 1

    while User.query.filter_by(store_slug=slug).first() is not None:
        
        slug = f"{base_slug}-{counter}"
        counter += 1

    return slug

@store.route('/<string:store_name>', methods=['GET'])
def get_store_details(store_name):
    """
    Obtiene los detalles de una tienda por su nombre, 
    incluyendo información del usuario e información de productos
    """
    # Buscar la tienda por nombre
    shop = Shop.query.filter_by(storename=store_name).first()
    
    if not shop:
        return jsonify({"error": "Tienda no encontrada"}), 404
    
    # Obtener el usuario asociado a la tienda
    user = shop.user
    
    # Obtener los productos del usuario
    products = Productos.query.filter_by(user_id=user.id).all()
    
    
    
    # Preparar la respuesta
    store_details = {
        "store": shop.serialize(),
        "user": user.serialize(),
        "products": [product.serialize() for product in products],
    }
    
    return jsonify(store_details), 200

@store.route('/create-store', methods=['POST'])
@jwt_required()
def create_store():
    """
    Crea una nueva tienda para el usuario autenticado
    """
    user_id = get_jwt_identity()
    
    # Buscar el usuario
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Usuario no encontrado"}), 404
    
    # Obtener datos del request
    data = request.get_json()
    
    # Validar datos requeridos
    required_fields = ['storename', 'storeemail', 'description', 'phone', 'bankaccount', 'theme', 'shopurl']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"El campo {field} es requerido"}), 400
    
    # Verificar si ya existe una tienda con ese nombre o email
    existing_shop_name = Shop.query.filter_by(storename=data['storename']).first()
    existing_shop_email = Shop.query.filter_by(storeemail=data['storeemail']).first()
    
    if existing_shop_name:
        return jsonify({"error": "Ya existe una tienda con este nombre"}), 400
    
    if existing_shop_email:
        return jsonify({"error": "Ya existe una tienda con este correo electrónico"}), 400
    
    try:
        # Crear nueva tienda
        new_store = Shop(
            storename=data['storename'],
            storeemail=data['storeemail'],
            description=data['description'],
            phone=data['phone'],
            bankaccount=data['bankaccount'],
            theme=data['theme'],
            shopurl=data['shopurl'],
            logourl=data['logourl'],
            user_id=user_id
        )
        
        # Añadir y commitear a la base de datos
        db.session.add(new_store)
        db.session.commit()
        
        return jsonify({
            "message": "Tienda creada exitosamente", 
            "store": new_store.serialize()
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error al crear la tienda", "details": str(e)}), 500
    



@store.route('/store-info', methods=['GET'])
@jwt_required()
def get_store_info():
    """Obtiene la información de la tienda del usuario autenticado"""
    user_id = get_jwt_identity()

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Usuario no encontrado"}), 404

    # Buscar la tienda del usuario
    shop = Shop.query.filter_by(user_id=user_id).first()
    if not shop:
        return jsonify({"error": "El usuario no tiene una tienda creada"}), 404

    # Buscar el logo del usuario
    logo = Logo.query.filter_by(user_id=user_id).first()
    logo_url = logo.logo_url if logo else None

    # Preparar la información de la tienda
    store_info = {
        "storename": shop.storename,
        "storeemail": shop.storeemail,
        "description": shop.description,
        "phone": shop.phone,
        "bankaccount": shop.bankaccount,
        "theme": shop.theme,
        "shopurl": shop.shopurl,
        "logo_url": logo_url,
        "contact_email": user.email
    }

    return jsonify(store_info), 200


@store.route('/store-info', methods=['PUT'])
@jwt_required()
def update_store_info():
    """Actualiza la información de la tienda"""
    user_id = get_jwt_identity()

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Usuario no encontrado"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "No se proporcionaron datos"}), 400

    
    if 'store_name' in data:
        user.shopname = data['store_name']
        
        if data['store_name'] != getattr(user, 'store_name_original', ''):
            user.store_slug = generate_store_url(data['store_name'])

   
    if 'store_description' in data:
        if not hasattr(user, 'store_description'):
           
            user.store_description = data['store_description']
        else:
            user.store_description = data['store_description']

    if 'bank_account' in data:
        user.bank_account = data.get('bank_account', '')

    if 'contact_phone' in data:
        user.contact_phone = data.get('contact_phone', '')

    if 'theme' in data:
        user.theme = data.get('theme', 'default')

   
    try:
        db.session.commit()

        
        return jsonify({
            "message": "Información de la tienda actualizada correctamente",
            "store_slug": user.store_slug
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@store.route('/upload-logo', methods=['POST'])
@jwt_required()
def upload_logo_store():
    """Sube un logo y lo asocia al usuario"""
    user_id = get_jwt_identity()

    if 'logo' not in request.files:
        return jsonify({"error": "No se encontró el archivo de logo"}), 400

    file = request.files['logo']

    if file.filename == '':
        return jsonify({"error": "No se seleccionó ningún archivo"}), 400

    
    allowed_extensions = {'png', 'jpg', 'jpeg', 'gif'}
    if not ('.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in allowed_extensions):
        return jsonify({"error": "Tipo de archivo no permitido"}), 400

 
    max_size = 1 * 1024 * 1024
    if request.content_length > max_size:
        return jsonify({"error": "El archivo es demasiado grande (máximo 1MB)"}), 400

    
    filename = secure_filename(file.filename)
    ext = filename.rsplit('.', 1)[1].lower()
    unique_filename = f"logo_{user_id}_{uuid.uuid4().hex}.{ext}"

    
    logo_path = os.path.join('static', 'logos', unique_filename)

    
    os.makedirs(os.path.dirname(logo_path), exist_ok=True)

    try:
        
        file.save(logo_path)

        logo = Logo.query.filter_by(user_id=user_id).first()

        if logo:
          
            old_logo_path = logo.image_logo_url
            logo.image_logo_url = logo_path
        else:
           
            logo = Logo(image_logo_url=logo_path, user_id=user_id)
            db.session.add(logo)

        db.session.commit()

        # eliminar el logo anterior si existe
        if logo and old_logo_path and os.path.exists(old_logo_path):
            try:
                os.remove(old_logo_path)
            except:
                pass

        return jsonify({
            "message": "Logo subido correctamente",
            "logo_url": logo_path
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@store.route('/remove-logo', methods=['DELETE'])
@jwt_required()
def remove_logo():
    """Elimina el logo asociado al usuario"""
    user_id = get_jwt_identity()

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Usuario no encontrado"}), 404

    # Buscar el logo del usuario
    logo = Logo.query.filter_by(user_id=user_id).first()

    if not logo:
        return jsonify({"message": "No hay logo para eliminar"}), 200

    try:
        # Si existe archivo físico, eliminarlo
        if hasattr(logo, 'image_logo_url') and logo.image_logo_url:
            logo_path = logo.image_logo_url
            if os.path.exists(logo_path) and not logo_path.startswith('http'):
                try:
                    os.remove(logo_path)
                except Exception as e:
                    print(f"Error al eliminar archivo: {str(e)}")

        # Asignar URL de placeholder
        logo.image_logo_url = "https://placehold.co/600x400/EEE/31343C"
        db.session.commit()

        return jsonify({
            "message": "Logo eliminado correctamente",
            "default_logo": logo.image_logo_url
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500