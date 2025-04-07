"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
from flask import Flask, request, jsonify, url_for, Blueprint
from api.models import db, User
from api.utils import generate_sitemap, APIException
from flask_cors import CORS
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity

api = Blueprint('api', __name__)

# Allow CORS requests to this API
CORS(api)

# generate sitemap with all your endpoints
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
    # verificar si existe un token
    existing_token = request.cookies.get('anonymousToken')

    if existing_token:
        return jsonify({
            'message': "El usuario anónimo ya existe",
            'isNew': False
        })
    
# Ruta para registrarse un usuario (signup)
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
        return jsonify({"msg": "Fisrt name, last name, shop name, email, password are required"}), 400

    # Verifica si el usuario existe
    existing_user = User.query.filter_by(email = email).first()
    if existing_user:
        return jsonify({"msg": "User already exists"}), 403

    try:
        new_user = User(
            firstname=body["firstname"],
            lastname=body["lastname"],
            shopname=body["shopname"],
            email=body["email"],
            password=body["password"],
            is_active=body["is_active"]
        )

        db.session.add(new_user)
        db.session.flush()


        db.session.commit()

        # Creamos acceso al token
        access_token = create_access_token(identity=new_user.id)

        return jsonify({
            "message": "User created succesfully",
            "access_token": access_token,
            "user": new_user.serialize()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    
# Ruta para logearse y creación de token
@api.route('/login', methods=['POST'])
def login():
    body = request.get_json()
    email = body.get("email")
    password = body.get("password")

    if not body or not email or not password:
        return jsonify({"error": "Email and password are required"})
    
    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({"error":"Incorrect credentials"})
    

    access_token = create_access_token(identity=str(user.id))

    return jsonify({
        "access_token": access_token,  
        "user": user.serialize()       
    }), 200

# Ruta del acceso settings del usuario
@api.route('/settings', methods=['GET'])
@jwt_required() # Precisa de token para acceder
def get_user_info():
    current_user_id = get_jwt_identity() # Devuelve el ID porque se lo he pasado al crear access_token
    user = User.query.get(current_user_id)

    return jsonify({
        "name": user.serialize()["firstname"]
    }), 200    
