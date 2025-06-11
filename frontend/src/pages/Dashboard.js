import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchGalleries, createGallery } from '../services/api';

const Dashboard = () => {
  const [galleries, setGalleries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchGalleries()
      .then(data => setGalleries(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const [title, setTitle] = useState('');
  const [selectionLimit, setSelectionLimit] = useState(5);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState(null);

  const handleCreateGallery = async (e) => {
    e.preventDefault();
    setCreating(true);
    setFormError(null);
    try {
      const newGallery = await createGallery({ title, selectionLimit });
      setGalleries(gals => [newGallery, ...gals]);
      setTitle('');
      setSelectionLimit(5);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ padding: 32, maxWidth: 700, margin: '0 auto' }}>
      <h1>Galerías del Fotógrafo</h1>
      <Link to="/watermark" style={{ marginRight: 16 }}>Configurar Marca de Agua</Link>
      <hr style={{ margin: '24px 0' }} />

      <form onSubmit={handleCreateGallery} style={{ marginBottom: 32, background: '#f7f7f7', padding: 16, borderRadius: 8 }}>
        <h2>Crear Nueva Galería</h2>
        <div style={{ marginBottom: 12 }}>
          <label>Título:&nbsp;
            <input value={title} onChange={e => setTitle(e.target.value)} required style={{ padding: 4 }} />
          </label>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Límite de selección:&nbsp;
            <input type="number" min={1} max={100} value={selectionLimit} onChange={e => setSelectionLimit(Number(e.target.value))} required style={{ width: 60, padding: 4 }} />
          </label>
        </div>
        <button type="submit" disabled={creating} style={{ padding: '6px 18px' }}>Crear Galería</button>
        {formError && <span style={{ color: 'red', marginLeft: 12 }}>{formError}</span>}
      </form>

      {loading ? (
        <p>Cargando galerías...</p>
      ) : error ? (
        <p style={{ color: 'red' }}>Error: {error}</p>
      ) : galleries.length === 0 ? (
        <p>No hay galerías creadas.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Título</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Link</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {galleries.map(gal => (
              <tr key={gal._id}>
                <td>{gal.title}</td>
                <td>
                  <a href={`http://localhost:4000/galleries/${gal.link}`} target="_blank" rel="noopener noreferrer">
                    {gal.link}
                  </a>
                </td>
                <td>
                  <Link to={`/gallery/${gal.id}`}>Gestionar</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Dashboard;
