from flask_jwt_extended import jwt_required, get_jwt_identity
from api.models import db, User, Productos, TigrisFiles
from flask import Blueprint, request, jsonify, send_file
from werkzeug.utils import secure_filename
from botocore.client import Config
from dotenv import load_dotenv
from io import BytesIO
import pandas as pd
import traceback
import datetime
import boto3
import uuid
import os
import re

# Inicializar Blueprint
load_dotenv()
upload = Blueprint('upload', __name__)

# Configuración de AWS/Tigris (cliente S3 global)
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_ENDPOINT_URL_S3 = os.getenv("AWS_ENDPOINT_URL_S3")
AWS_REGION = os.getenv("AWS_REGION", "auto")
BUCKET_NAME = "inventary-user-2025"
config = Config(signature_version='s3v4')

s3 = boto3.client(
    's3',
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    endpoint_url=AWS_ENDPOINT_URL_S3,
    region_name=AWS_REGION,
    config=config
)

UPLOAD_FOLDER = "upload"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# Función auxiliar para verificar extensiones de archivo permitidas
def allowed_file(filename):
    """Verifica si el archivo tiene una extensión permitida"""
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# Función auxiliar para subir archivos a Tigris S3
def upload_to_tigris_s3(file_path, file_name, folder_prefix=None):
    try:
        try:
            s3.head_bucket(Bucket=BUCKET_NAME)
        except:
            s3.create_bucket(Bucket=BUCKET_NAME)

        timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
        
        # Añadir prefijo de carpeta si se especifica
        key_prefix = f"{folder_prefix}/" if folder_prefix else ""
        unique_filename = f"{key_prefix}{timestamp}_{file_name}"

        # Si file_path es bytes (para imágenes)
        if isinstance(file_path, bytes):
            s3.put_object(
                Body=file_path,
                Bucket=BUCKET_NAME,
                Key=unique_filename,
                ContentType='image/jpeg'  # Ajustar según la extensión
            )
        else:
            s3.upload_file(
                file_path,
                BUCKET_NAME,
                unique_filename,
                ExtraArgs={
                    'ContentType': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                }
            )

        url = s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': BUCKET_NAME, 'Key': unique_filename},
            ExpiresIn=3600 * 24 * 7
        )

        return url

    except Exception as e:
        raise Exception(f"Error al subir a Tigris S3: {str(e)}")


# -------------ENDPOINT PARA SUBIR EL INVENTARIO A TIGRIS-----------------
@upload.route('/inventory', methods=['POST'])
@jwt_required()
def upload_inventory():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Usuario no encontrado"}), 404

    if "file" not in request.files:
        return jsonify({"error": "No se encontró archivo en la solicitud"}), 400

    file = request.files["file"]
    if not file.filename.endswith((".xls", ".xlsx")):
        return jsonify({"error": "Solo se permiten archivos Excel (.xls, .xlsx)"}), 400

    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    try:
        file_url = upload_to_tigris_s3(file_path, file.filename)
        df = pd.read_excel(file_path)

        expected_columns = ['nombre_del_producto',
                            'precio_por_unidad', 'descripción', 'unidades']
        if not all(col in df.columns for col in expected_columns):
            return jsonify({"error": "El archivo Excel no contiene las columnas esperadas"}), 400

        df.columns = [col.lower().replace(' ', '_') for col in df.columns]
        records = df.to_dict(orient="records")

        # Lista para almacenar productos con stock bajo
        low_stock_products = []

        for record in records:
            quantity = record['unidades']
            producto = Productos(
                product_name=record['nombre_del_producto'],
                price_per_unit=record['precio_por_unidad'],
                description=record['descripción'],
                quantity=quantity,
                user_id=user_id
            )
            db.session.add(producto)
            
            # Verificar si el producto tiene 5 o menos unidades
            if quantity <= 5:
                low_stock_products.append({
                    'product_name': record['nombre_del_producto'],
                    'quantity': quantity
                })

        tigris_file = TigrisFiles(url=file_url, user_id=user_id)
        db.session.add(tigris_file)
        db.session.commit()
        
        # Enviar notificaciones para productos con stock bajo
        for product in low_stock_products:
            send_low_stock_notification(
                user_id,
                product['product_name'],
                product['quantity']
            )
            
        os.remove(file_path)
        return jsonify({
            "message": f"{len(records)} productos cargados correctamente. {len(low_stock_products)} con stock bajo.",
            "file_url": file_url
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)


# -------------ENDPOINT PARA DESCARGAR EL INVENTARIO DEL USUARIO----------------------------
@upload.route("/download_inventory", methods=["GET"])
@jwt_required()
def download_user_inventory():
    """Endpoint para descargar el inventario específico del usuario autenticado"""
    try:
        # Obtener el ID del usuario desde el token JWT
        user_id = get_jwt_identity()

        # Verificar que el usuario existe
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "Usuario no encontrado"}), 404

        # Obtener todos los productos del usuario
        productos = Productos.query.filter_by(user_id=user_id).all()

        # Si no hay productos, devolver mensaje
        if not productos:
            return jsonify({"message": "No hay productos en tu inventario"}), 404

        # Crear DataFrame con los productos del usuario
        data = []
        for producto in productos:
            data.append({
                'nombre_del_producto': producto.product_name,
                'precio_por_unidad': producto.price_per_unit,
                'descripción': producto.description,
                'unidades': producto.quantity
            })

        df = pd.DataFrame(data)

        # Crear el Excel en memoria
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False)

        # Preparar para enviar
        output.seek(0)

        # Devolver el archivo Excel con el inventario del usuario
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f"inventario_usuario_{user_id}.xlsx"
        )

    except Exception as e:
        error_traceback = traceback.format_exc()
        print(f"Error al generar el inventario: {str(e)}")
        print(f"Traceback completo: {error_traceback}")
        return jsonify({
            "error": f"Error al generar el inventario: {str(e)}",
            "traceback": error_traceback
        }), 500


# -------ENDPOINT PARA DESCARGAR LA PLANTILLA DEL INVENTARIO DE TIGRIS----------
@upload.route("/download_template", methods=["GET"])
@jwt_required()
def download_template():
    """Endpoint para descargar una plantilla Excel vacía con las columnas requeridas"""
    try:
        # Crear un DataFrame con las columnas requeridas pero sin datos
        df = pd.DataFrame(
            columns=['nombre_del_producto', 'precio_por_unidad', 'descripción', 'unidades'])

        # Crear el Excel en memoria
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False)

        # Preparar para enviar
        output.seek(0)

        # Devolver directamente desde la memoria
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name="plantilla_inventario.xlsx"
        )

    except Exception as e:
        error_traceback = traceback.format_exc()
        print(f"Error al generar la plantilla: {str(e)}")
        print(f"Traceback completo: {error_traceback}")
        return jsonify({
            "error": f"Error al generar la plantilla: {str(e)}",
            "traceback": error_traceback
        }), 500


# ----------------ENDPOINT PARA ACTUALIZAR EL INVENTARIO DE TIGRIS---------------------
@upload.route('/update_inventory', methods=['POST'])
@jwt_required()
def update_inventory():
    """
    Endpoint para actualizar el inventario existente desde un archivo Excel
    sin eliminar los datos originales durante el proceso
    """
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "Usuario no encontrado"}), 404

    if "file" not in request.files:
        return jsonify({"error": "No se encontró archivo en la solicitud"}), 400

    file = request.files["file"]
    if not file.filename.endswith((".xls", ".xlsx")):
        return jsonify({"error": "Solo se permiten archivos Excel (.xls, .xlsx)"}), 400

    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    try:
        # Subir archivo a Tigris como respaldo, pero sin eliminar el anterior
        file_url = upload_to_tigris_s3(file_path, f"update_{file.filename}")

        # Leer el archivo Excel
        df = pd.read_excel(file_path)

        expected_columns = ['nombre_del_producto',
                            'precio_por_unidad', 'descripción', 'unidades']
        if not all(col in df.columns for col in expected_columns):
            return jsonify({"error": "El archivo Excel no contiene las columnas esperadas"}), 400

        df.columns = [col.lower().replace(' ', '_') for col in df.columns]
        records = df.to_dict(orient="records")

        # Obtener todos los productos actuales del usuario para comparación
        existing_products = Productos.query.filter_by(user_id=user_id).all()
        existing_product_names = {p.product_name: p for p in existing_products}

        products_updated = 0
        products_added = 0
        low_stock_products = []

        # Procesar cada registro del Excel
        for record in records:
            product_name = record['nombre_del_producto']
            quantity = record['unidades']

            # Si el producto ya existe, actualizarlo
            if product_name in existing_product_names:
                product = existing_product_names[product_name]
                product.price_per_unit = record['precio_por_unidad']
                product.description = record['descripción']
                product.quantity = quantity
                products_updated += 1
            # Si no existe, crear uno nuevo
            else:
                new_product = Productos(
                    product_name=product_name,
                    price_per_unit=record['precio_por_unidad'],
                    description=record['descripción'],
                    quantity=quantity,
                    user_id=user_id
                )
                db.session.add(new_product)
                products_added += 1
            
            # Verificar si el producto tiene 5 o menos unidades
            if quantity <= 5:
                low_stock_products.append({
                    'product_name': product_name,
                    'quantity': quantity
                })

        # Guardar el archivo en la tabla de TigrisFiles
        tigris_file = TigrisFiles(url=file_url, user_id=user_id)
        db.session.add(tigris_file)
        db.session.commit()

        # Enviar notificaciones para productos con stock bajo
        for product in low_stock_products:
            send_low_stock_notification(
                user_id,
                product['product_name'],
                product['quantity']
            )

        # Limpiar archivo temporal
        os.remove(file_path)

        return jsonify({
            "message": f"Inventario actualizado: {products_updated} productos actualizados, {products_added} productos añadidos. {len(low_stock_products)} con stock bajo.",
            "file_url": file_url
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)


# -------ENDPOINT PARA ELIMINAR EL INVENTARIO DE TIGRIS-------------------------------
@upload.route("/delete-inventory/<int:inventory_id>", methods=['DELETE'])
def delete_inventory_from_tigris(inventory_id):
    """Elimina un archivo de Tigris por su ID en la base de datos"""
    try:
        tigris_file = TigrisFiles.query.get(inventory_id)

        if not tigris_file:
            return jsonify({"error": "Archivo no encontrado"}), 404

        db.session.delete(tigris_file)
        db.session.commit()

        return jsonify({
            "message": f"Archivo con ID {inventory_id} eliminado correctamente",
            "deleted_inventory_id": inventory_id
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# -------ENDPOINT PARA ELIMINAR PRODUCTOS DEL INVENTARIO DE TIGRIS-----------------------
@upload.route("/delete-product/<int:product_id>", methods=['DELETE'])
@jwt_required()
def delete_product(product_id):
    """Elimina un producto específico por su ID"""
    try:
        # Verificar el usuario actual
        user_id = get_jwt_identity()

        # Si user_id es un string, convertirlo a int para comparar
        if isinstance(user_id, str) and user_id.isdigit():
            user_id = int(user_id)

        print(f"Intentando eliminar producto {product_id} para usuario {user_id}")

        # Encontrar el producto
        product = Productos.query.get(product_id)

        if not product:
            return jsonify({"error": "Producto no encontrado"}), 404

        print(f"Producto encontrado. Pertenece a usuario {product.user_id}")

        # Verificar que el producto pertenece al usuario actual
        if product.user_id != user_id:
            return jsonify({"error": "No tienes permiso para eliminar este producto"}), 403

        # Eliminar el producto
        db.session.delete(product)
        db.session.commit()

        return jsonify({
            "message": f"Producto {product_id} eliminado correctamente",
            "product_id": product_id
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error al eliminar producto: {str(e)}")
        return jsonify({"error": str(e)}), 500


# -------------ACTUALIZA PRODUCTO DESDE EL PANEL----------------------------------------
@upload.route("/update-product/<int:product_id>", methods=['PUT'])
@jwt_required()
def update_product(product_id):
    try:
        # Verificar el usuario actual
        user_id = get_jwt_identity()
        if isinstance(user_id, str) and user_id.isdigit():
            user_id = int(user_id)

        # Obtener datos de la solicitud
        data = request.get_json()
        if not data:
            return jsonify({"error": "No se proporcionaron datos para actualizar"}), 400

        # Encontrar el producto
        product = Productos.query.get(product_id)

        if not product:
            return jsonify({"error": "Producto no encontrado"}), 404

        # Verificar que el producto pertenece al usuario actual
        if product.user_id != user_id:
            return jsonify({"error": "No tienes permiso para modificar este producto"}), 403

        # Actualizar los campos del producto
        if 'product_name' in data:
            product.product_name = data['product_name']

        if 'price_per_unit' in data:
            product.price_per_unit = float(data['price_per_unit'])

        if 'description' in data:
            product.description = data['description']

        # Si se actualiza la cantidad y es baja, enviar notificación
        if 'quantity' in data:
            new_quantity = int(data['quantity'])
            product.quantity = new_quantity

            # Verificar si la cantidad es baja (5 o menos)
            if new_quantity <= 5:
                # Enviar notificación
                send_low_stock_notification(
                    user_id,
                    product.product_name,
                    new_quantity
                )

        if 'image_url' in data:
            product.image_url = data['image_url']

        # Guardar los cambios
        db.session.commit()

        return jsonify({
            "message": "Producto actualizado correctamente",
            "product": product.serialize()
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error: {str(e)}")
        return jsonify({"error": str(e)}), 500


# --------TRAE LA INFORMACION DEL INVENTARIO AL PANEL DEL INVENTARIO (PAGE)-------------------
@upload.route("/get-user-products", methods=['GET'])
@jwt_required()
def get_user_products():
    """Obtiene todos los productos del usuario autenticado"""
    try:
        user_id = get_jwt_identity()

        # Buscar productos del usuario actual
        products = Productos.query.filter_by(user_id=user_id).all()

        # Serializar los resultados
        products_serialized = [product.serialize() for product in products]

        return jsonify({"productos": products_serialized}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# -------------ACTUALIZA LA IMAGEN DEL PRODUCTO DESDE EL PANEL--------------------------------
@upload.route("/upload-product-image", methods=['POST'])
@jwt_required()
def upload_product_image():
    """Sube una imagen para un producto y devuelve la URL"""
    user_id = get_jwt_identity()

    if "image" not in request.files:
        return jsonify({"error": "No se encontró imagen en la solicitud"}), 400

    file = request.files["image"]

    if file.filename == '':
        return jsonify({"error": "No se seleccionó ningún archivo"}), 400

    if file and allowed_file(file.filename):
        # Crear nombre único para el archivo
        filename = secure_filename(file.filename)
        ext = filename.rsplit('.', 1)[1].lower()
        unique_filename = f"product_{user_id}_{uuid.uuid4().hex}.{ext}"

        # Subir a Tigris
        try:
            url = upload_to_tigris_s3(
                file.read(), unique_filename, 'product-images')

            return jsonify({"url": url}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    return jsonify({"error": "Tipo de archivo no permitido"}), 400


# ------------ME TRAE LA INFORMACION DEL ARCHIVO (EXCEL) INVENTARIO PARA MOSTRARLA EN MI PANEL------------
@upload.route("/current-inventory-info", methods=['GET'])
@jwt_required()
def get_current_inventory_info():
    """Obtiene información sobre el inventario actual del usuario"""
    try:
        user_id = get_jwt_identity()

        # Buscar el archivo de inventario más reciente del usuario
        latest_file = TigrisFiles.query.filter_by(
            user_id=user_id).order_by(TigrisFiles.id.desc()).first()

        if not latest_file:
            return jsonify({"message": "No se encontró ningún inventario"}), 404

        # Extraer el nombre del archivo de la URL
        from urllib.parse import urlparse, unquote

        url_path = urlparse(latest_file.url).path
        filename = os.path.basename(unquote(url_path))

        # Si el nombre tiene timestamp, intentar extraerlo
        timestamp_match = re.search(r'(\d{14})_', filename)
        last_updated = None

        if timestamp_match:
            timestamp_str = timestamp_match.group(1)
            try:
                last_updated = datetime.datetime.strptime(
                    timestamp_str, "%Y%m%d%H%M%S").isoformat()
            except ValueError:
                pass

        inventory_info = {
            "id": latest_file.id,
            "name": filename,
            "url": latest_file.url,
            "last_updated": last_updated
        }

        return jsonify({
            "inventory_info": inventory_info
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500