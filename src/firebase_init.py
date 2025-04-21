import os
import json
import tempfile
import firebase_admin
from firebase_admin import credentials

# Función para inicializar Firebase desde variables de entorno
def initialize_firebase():
    try:
        # Crear un diccionario con las credenciales desde las variables de entorno
        firebase_credentials = {
            "type": os.getenv("FIREBASE_TYPE"),
            "project_id": os.getenv("FIREBASE_PROJECT_ID"),
            "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID"),
            "private_key": os.getenv("FIREBASE_PRIVATE_KEY").replace("\\n", "\n") if os.getenv("FIREBASE_PRIVATE_KEY") else None,
            "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
            "client_id": os.getenv("FIREBASE_CLIENT_ID"),
            "auth_uri": os.getenv("FIREBASE_AUTH_URI"),
            "token_uri": os.getenv("FIREBASE_TOKEN_URI"),
            "auth_provider_x509_cert_url": os.getenv("FIREBASE_AUTH_PROVIDER_X509_CERT_URL"),
            "client_x509_cert_url": os.getenv("FIREBASE_CLIENT_X509_CERT_URL"),
            "universe_domain": os.getenv("FIREBASE_UNIVERSE_DOMAIN")
        }
        
        # Verificar que todas las credenciales estén presentes
        missing_vars = [k for k, v in firebase_credentials.items() if v is None]
        if missing_vars:
            print(f"Advertencia: Las siguientes variables de Firebase no están definidas: {', '.join(missing_vars)}")
            # Intentar cargar desde el archivo JSON como respaldo
            basedir = os.path.abspath(os.path.dirname(__file__))
            cred_path = os.path.join(basedir, "config", "serviceAccountKey.json")
            
            if os.path.exists(cred_path):
                print(f"Usando archivo de credenciales de respaldo: {cred_path}")
                red = credentials.Certificate("firebase/serviceAccountKey.json")
                firebase_admin.initialize_app(cred)
                return True
            else:
                print("Error: No se encontraron credenciales de Firebase")
                return False
        
        # Crear un archivo temporal con las credenciales
        with tempfile.NamedTemporaryFile(suffix='.json', delete=False) as temp:
            temp.write(json.dumps(firebase_credentials).encode('utf-8'))
            temp_name = temp.name
        
        # Inicializar Firebase con el archivo temporal
        cred = credentials.Certificate(temp_name)
        firebase_admin.initialize_app(cred)
        
        # Eliminar el archivo temporal después de usarlo
        os.unlink(temp_name)
        
        print("Firebase Admin SDK inicializado correctamente desde variables de entorno")
        return True
    
    except Exception as e:
        print(f"Error al inicializar Firebase Admin SDK: {str(e)}")
        return False

# Si este archivo se ejecuta directamente (no importado)
if __name__ == "__main__":
    initialize_firebase()