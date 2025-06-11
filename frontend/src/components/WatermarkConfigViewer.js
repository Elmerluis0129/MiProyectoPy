import React, { useEffect, useState } from 'react';

// Servicio directo en el componente para simplicidad
const fetchWatermark = async (owner) => {
  const response = await fetch(`http://localhost:4000/watermarks/${owner}`);
  if (!response.ok) {
    throw new Error('No se pudo obtener la marca de agua');
  }
  return await response.json();
};

const WatermarkConfigViewer = ({ owner = 'admin' }) => {
  const [watermark, setWatermark] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchWatermark(owner)
      .then(data => setWatermark(data))
      .catch(err => setError(err.message));
  }, [owner]);

  if (error) return <div style={{color: 'red'}}>Error: {error}</div>;
  if (!watermark) return <div>Cargando marca de agua...</div>;

  return (
    <div style={{padding: 16, background: '#fafafa', border: '1px solid #eee', maxWidth: 400}}>
      <h3>Configuración de Marca de Agua</h3>
      <img 
        src={watermark.image_url} 
        alt="Marca de agua" 
        style={{ maxWidth: 200, border: '1px solid #ccc', marginBottom: 16 }} 
      />
      <pre style={{ background: '#f5f5f5', padding: 10 }}>
        {JSON.stringify(watermark.config, null, 2)}
      </pre>
    </div>
  );
};

export default WatermarkConfigViewer;
