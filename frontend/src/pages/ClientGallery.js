import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

// Componente base para la galería pública del cliente
const ClientGallery = () => {
  const [photos, setPhotos] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [zipLoading, setZipLoading] = useState(false);
  const [zipMessage, setZipMessage] = useState('');

    const { id: galleryId } = useParams();

  useEffect(() => {
    const fetchPhotos = async () => {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:4000/photos/gallery/${galleryId}`);
        if (!res.ok) throw new Error('No se pudo cargar la galería');
        const data = await res.json();
        setPhotos(data);
      } catch (err) {
        setError('Error al cargar las fotos');
      } finally {
        setLoading(false);
      }
    };
    fetchPhotos();
  }, [galleryId]);

  const toggleSelect = (photoId) => {
    setSelected((prev) =>
      prev.includes(photoId) ? prev.filter((id) => id !== photoId) : [...prev, photoId]
    );
  };

  const handleDownload = (photoUrl) => {
    // Descarga individual
    window.open(photoUrl, '_blank');
  };

  // Descarga en lote seleccionadas como ZIP
  const handleDownloadZip = async () => {
    if (selected.length === 0) {
      setZipMessage('Selecciona al menos una foto.');
      setTimeout(() => setZipMessage(''), 2000);
      return;
    }
    setZipLoading(true);
    setZipMessage('Preparando descarga...');
    try {
      const JSZip = (await import('jszip')).default;
      const { saveAs } = await import('file-saver');
      const zip = new JSZip();
      const selectedPhotos = photos.filter(p => selected.includes(p._id));
      await Promise.all(selectedPhotos.map(async (photo, idx) => {
        const url = `http://localhost:4000/${photo.watermarkedUrl || photo.url}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Error al descargar una imagen');
        const blob = await response.blob();
        const ext = photo.name?.split('.').pop() || 'jpg';
        zip.file(photo.name || `foto_${idx + 1}.${ext}`, blob);
      }));
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'fotos_seleccionadas.zip');
      setZipMessage('¡Descarga lista!');
      setTimeout(() => setZipMessage(''), 3000);
    } catch (err) {
      setZipMessage('Error al generar el ZIP');
      setTimeout(() => setZipMessage(''), 3000);
    } finally {
      setZipLoading(false);
    }
  };


  return (
    <div style={{ padding: 32 }}>
      <h2>Galería del Cliente</h2>
      {loading && <p>Cargando fotos...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {photos.map((photo) => (
          <div
            key={photo._id}
            style={{
              border: selected.includes(photo._id) ? '3px solid #1976d2' : '1px solid #ccc',
              borderRadius: 8,
              padding: 8,
              position: 'relative',
              width: 180,
              background: '#fafafa',
            }}
            onClick={() => toggleSelect(photo._id)}
          >
            <img
              src={`http://localhost:4000/${photo.watermarkedUrl || photo.url}`}
              alt={photo.name || 'foto'}
              style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 4 }}
            />
            {photo.name && (
              <div style={{ fontSize: 13, marginTop: 4, textAlign: 'center', color: '#333' }}>{photo.name}</div>
            )}
            <input
              type="checkbox"
              checked={selected.includes(photo._id)}
              onChange={() => toggleSelect(photo._id)}
              style={{ position: 'absolute', top: 8, right: 8 }}
              onClick={e => e.stopPropagation()}
            />
            <button
              style={{ marginTop: 8, width: '100%' }}
              onClick={e => { e.stopPropagation(); handleDownload(`http://localhost:4000/${photo.watermarkedUrl || photo.url}`); }}
            >
              Descargar
            </button>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 24 }}>
        <strong>{selected.length}</strong> foto(s) seleccionada(s)
        <button
          style={{ marginLeft: 16, background: '#1976d2', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: selected.length ? 'pointer' : 'not-allowed' }}
          disabled={selected.length === 0 || zipLoading}
          onClick={handleDownloadZip}
        >
          {zipLoading ? 'Preparando ZIP...' : 'Descargar seleccionadas (ZIP)'}
        </button>
        {zipMessage && <span style={{ marginLeft: 16, color: zipMessage.includes('¡Descarga') ? 'green' : 'red' }}>{zipMessage}</span>}
      </div>
    </div>
  );
};

export default ClientGallery;
