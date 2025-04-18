import React, { useState } from 'react';

export default function PasswordResetRequest() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Validación sencilla
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Por favor introduce un email válido');
      return;
    }

// URL del fetch a lo mejor hay que cambiarlo para que conecte a backend
    try {
      const response = await fetch('http://localhost:5000/api/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      if (response.ok) {
        setMessage('¡Revisa tu correo para restablecer la contraseña!');
      } else {
        setError(data.msg || 'Error al procesar la solicitud');
      }
    } catch (err) {
      setError('Error al conectar con el servidor');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>¿Olvidaste tu contraseña?</h2>
      <input
        type="email"
        placeholder="Introduce tu correo"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button type="submit">Enviar instrucciones</button>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {message && <p style={{ color: 'green' }}>{message}</p>}
    </form>
  );
}