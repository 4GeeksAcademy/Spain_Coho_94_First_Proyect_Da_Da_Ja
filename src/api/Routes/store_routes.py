from flask_jwt_extended import jwt_required, get_jwt_identity
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from api.models import db, User, Logo
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


@store.route('/store-info', methods=['GET'])
@jwt_required()
def get_store_info():
    """Obtiene la información de la tienda del usuario autenticado"""
    user_id = get_jwt_identity()

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Usuario no encontrado"}), 404

    
    logo = Logo.query.filter_by(user_id=user_id).first()
    logo_url = logo.image_logo_url if logo else None

    
    if not hasattr(user, 'store_slug') or not user.store_slug:
        user.store_slug = generate_store_url(
            user.shopname or f"tienda-{user_id}")
        db.session.commit()

    
    store_info = {
        "store_name": user.shopname or "",
        "store_description": getattr(user, 'store_description', ""),
        "bank_account": getattr(user, 'bank_account', ""),
        "store_slug": getattr(user, 'store_slug', ""),
        "contact_email": user.email,
        "contact_phone": getattr(user, 'contact_phone', ""),
        "logo_url": logo_url,
        "theme": getattr(user, 'theme', "default")
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