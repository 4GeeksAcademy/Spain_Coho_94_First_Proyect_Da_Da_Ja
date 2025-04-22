from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, create_access_token, get_jwt_identity
from api.models import db, Customer, Productos, Cart
from werkzeug.security import check_password_hash

customer = Blueprint('customer', __name__)

@customer.route('/register', methods=['POST'])
def register_customer():
    """
    Registra un nuevo cliente
    """
    data = request.get_json()
    
    # Validar campos requeridos
    required_fields = ['firstname', 'lastname', 'email', 'password']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"El campo {field} es requerido"}), 400
    
    # Verificar si ya existe un cliente con ese email
    existing_customer = Customer.query.filter_by(email=data['email']).first()
    if existing_customer:
        return jsonify({"error": "Ya existe un cliente con este correo electrónico"}), 400
    
    try:
        # Crear nuevo cliente
        new_customer = Customer(
            firstname=data['firstname'],
            lastname=data['lastname'],
            email=data['email'],
            phone=data.get('phone'),
            address=data.get('address')
        )
        # Establecer la contraseña (se cifrará automáticamente)
        new_customer.password = data['password']
        
        # Añadir y commitear a la base de datos
        db.session.add(new_customer)
        db.session.commit()
        
        return jsonify({
            "message": "Cliente registrado exitosamente", 
            "customer": new_customer.serialize()
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error al registrar cliente", "details": str(e)}), 500


@customer.route('/login', methods=['POST'])
def login_customer():
    """
    Inicia sesión para un cliente
    """
    data = request.get_json()
    
    # Validar campos requeridos
    if 'email' not in data or 'password' not in data:
        return jsonify({"error": "Email y contraseña son requeridos"}), 400
    
    # Buscar cliente por email
    customer = Customer.query.filter_by(email=data['email']).first()
    
    # Verificar credenciales
    if not customer or not customer.check_password(data['password']):
        return jsonify({"error": "Credenciales inválidas"}), 401
    
    # Crear token de acceso
    access_token = create_access_token(identity=customer.id)
    
    return jsonify({
        "message": "Inicio de sesión exitoso",
        "access_token": access_token,
        "customer": customer.serialize()
    }), 200


@customer.route('/profile', methods=['GET'])
@jwt_required()
def get_customer_profile():
    """
    Obtiene el perfil del cliente autenticado
    """
    customer_id = get_jwt_identity()
    
    # Buscar el cliente
    customer = Customer.query.get(customer_id)
    if not customer:
        return jsonify({"error": "Cliente no encontrado"}), 404
    
    return jsonify(customer.serialize()), 200


@customer.route('/profile', methods=['PUT'])
@jwt_required()
def update_customer_profile():
    """
    Actualiza el perfil del cliente autenticado
    """
    customer_id = get_jwt_identity()
    
    # Buscar el cliente
    customer = Customer.query.get(customer_id)
    if not customer:
        return jsonify({"error": "Cliente no encontrado"}), 404
    
    data = request.get_json()
    
    # Actualizar campos
    if 'firstname' in data:
        customer.firstname = data['firstname']
    if 'lastname' in data:
        customer.lastname = data['lastname']
    if 'phone' in data:
        customer.phone = data['phone']
    if 'address' in data:
        customer.address = data['address']
    
    # Cambio de contraseña (requiere contraseña actual)
    if 'new_password' in data:
        if 'current_password' not in data:
            return jsonify({"error": "Se requiere la contraseña actual para cambiar la contraseña"}), 400
        
        # Verificar contraseña actual
        if not customer.check_password(data['current_password']):
            return jsonify({"error": "Contraseña actual incorrecta"}), 401
        
        # Establecer nueva contraseña
        customer.password = data['new_password']
    
    try:
        db.session.commit()
        return jsonify({
            "message": "Perfil actualizado exitosamente",
            "customer": customer.serialize()
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error al actualizar perfil", "details": str(e)}), 500
    
#-----------------RUTA CARRITO DE COMPRAS-------------#
@customer.route('/cart/add', methods=['POST'])
@jwt_required()
def add_to_cart():
    """
    Añade un producto al carrito del cliente
    """
    customer_id = get_jwt_identity()
    
    # Buscar el cliente
    customer = Customer.query.get(customer_id)
    if not customer:
        return jsonify({"error": "Cliente no encontrado"}), 404
    
    # Obtener datos del request
    data = request.get_json()
    
    # Validar campos requeridos
    if 'product_id' not in data:
        return jsonify({"error": "Se requiere el ID del producto"}), 400
    
    # Verificar que el producto existe
    product = Productos.query.get(data['product_id'])
    if not product:
        return jsonify({"error": "Producto no encontrado"}), 404
    
    # Verificar stock disponible
    if product.quantity <= 0:
        return jsonify({"error": "Producto sin stock disponible"}), 400
    
    # Cantidad a añadir (por defecto 1 si no se especifica)
    quantity = data.get('quantity', 1)
    if quantity <= 0:
        return jsonify({"error": "Cantidad debe ser mayor que 0"}), 400
    
    # Verificar si hay suficiente stock
    if quantity > product.quantity:
        return jsonify({"error": "Cantidad solicitada supera el stock disponible"}), 400
    
    try:
        # Buscar si el producto ya está en el carrito
        existing_cart_item = Cart.query.filter_by(
            customer_id=customer_id, 
            productid=product.id, 
            buyed=False
        ).first()
        
        if existing_cart_item:
            # Si ya existe, actualizar cantidad
            existing_cart_item.quantity += quantity
        else:
            # Crear nuevo item en el carrito
            cart_item = Cart(
                productid=product.id,
                customer_id=customer_id,
                quantity=quantity,
                buyed=False
            )
            db.session.add(cart_item)
        
        db.session.commit()
        
        return jsonify({
            "message": "Producto añadido al carrito", 
            "cart_item": existing_cart_item.serialize() if existing_cart_item else cart_item.serialize()
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error al añadir producto al carrito", "details": str(e)}), 500

#-----------------RUTA BORRAR DEL CARRITO DE COMPRAS-------------#
@customer.route('/cart/remove/<int:cart_item_id>', methods=['DELETE'])
@jwt_required()
def remove_from_cart(cart_item_id):
    """
    Elimina un item específico del carrito del cliente
    """
    customer_id = get_jwt_identity()
    
    # Buscar el cliente
    customer = Customer.query.get(customer_id)
    if not customer:
        return jsonify({"error": "Cliente no encontrado"}), 404
    
    # Buscar el item del carrito
    cart_item = Cart.query.filter_by(
        id=cart_item_id, 
        customer_id=customer_id, 
        buyed=False
    ).first()
    
    if not cart_item:
        return jsonify({"error": "Item de carrito no encontrado"}), 404
    
    try:
        # Eliminar el item del carrito
        db.session.delete(cart_item)
        db.session.commit()
        
        return jsonify({
            "message": "Producto eliminado del carrito"
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error al eliminar producto del carrito", "details": str(e)}), 500

#-----------------RUTA PARA VER EL CARRITO DE COMPRAS-------------#
@customer.route('/cart', methods=['GET'])
@jwt_required()
def get_cart():
    """
    Obtiene todos los items del carrito del cliente
    """
    customer_id = get_jwt_identity()
    
    # Buscar el cliente
    customer = Customer.query.get(customer_id)
    if not customer:
        return jsonify({"error": "Cliente no encontrado"}), 404
    
    # Buscar items del carrito no comprados
    cart_items = Cart.query.filter_by(customer_id=customer_id, buyed=False).all()
    
    # Preparar respuesta con detalles de productos
    cart_details = []
    total_price = 0
    
    for item in cart_items:
        product = Productos.query.get(item.productid)
        if product:
            item_total = product.price_per_unit * item.quantity
            total_price += item_total
            cart_details.append({
                "cart_item_id": item.id,
                "product": product.serialize(),
                "quantity": item.quantity,
                "item_total": item_total
            })
    
    return jsonify({
        "cart_items": cart_details,
        "total_items": len(cart_items),
        "total_price": total_price
    }), 200

#-----------------RUTA MODIFICAR CANTIDADES DEL CARRITO DE COMPRAS-------------#
@customer.route('/cart/update/<int:cart_item_id>', methods=['PUT'])
@jwt_required()
def update_cart_item(cart_item_id):
    """
    Actualiza la cantidad de un item en el carrito
    """
    customer_id = get_jwt_identity()
    
    # Buscar el cliente
    customer = Customer.query.get(customer_id)
    if not customer:
        return jsonify({"error": "Cliente no encontrado"}), 404
    
    # Buscar el item del carrito
    cart_item = Cart.query.filter_by(
        id=cart_item_id, 
        customer_id=customer_id, 
        buyed=False
    ).first()
    
    if not cart_item:
        return jsonify({"error": "Item de carrito no encontrado"}), 404
    
    # Obtener datos del request
    data = request.get_json()
    
    # Validar cantidad
    if 'quantity' not in data:
        return jsonify({"error": "Se requiere la cantidad"}), 400
    
    quantity = data['quantity']
    if quantity <= 0:
        return jsonify({"error": "Cantidad debe ser mayor que 0"}), 400
    
    # Verificar stock del producto
    product = Productos.query.get(cart_item.productid)
    if not product:
        return jsonify({"error": "Producto no encontrado"}), 404
    
    if quantity > product.quantity:
        return jsonify({"error": "Cantidad solicitada supera el stock disponible"}), 400
    
    try:
        # Actualizar cantidad
        cart_item.quantity = quantity
        db.session.commit()
        
        return jsonify({
            "message": "Cantidad actualizada", 
            "cart_item": cart_item.serialize()
        }), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Error al actualizar cantidad", "details": str(e)}), 500