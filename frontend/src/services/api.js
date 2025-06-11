// Servicio API para consumir el backend
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

export async function fetchGalleries() {
  const res = await fetch(`${API_URL}/galleries`);
  if (!res.ok) throw new Error('Error al obtener galerías');
  return res.json();
}

export async function createGallery(data) {
  const res = await fetch(`${API_URL}/galleries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Error al crear galería');
  return res.json();
}

export async function fetchGalleryById(id) {
  const res = await fetch(`${API_URL}/galleries/id/${id}`);
  if (!res.ok) throw new Error('Error al obtener galería');
  return res.json();
}

export async function setAllowDownload(id, allowDownload) {
  try {
    console.log('Enviando PATCH a /allow-download con:', { id, allowDownload });
    const res = await fetch(`${API_URL}/galleries/${id}/allow-download`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allowDownload })
    });
    const text = await res.text();
    console.log('Respuesta setAllowDownload:', {
      status: res.status,
      statusText: res.statusText,
      response: text
    });
    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${text || 'Error desconocido'}`);
    }
    return text ? JSON.parse(text) : {};
  } catch (error) {
    console.error('Error en setAllowDownload:', error);
    throw error;
  }
}

export async function setAllowFinalDownload(id, allowFinalDownload) {
  try {
    console.log('Enviando PATCH a /allow-final-download con:', { id, allowFinalDownload });
    const res = await fetch(`${API_URL}/galleries/${id}/allow-final-download`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allowFinalDownload })
    });
    const text = await res.text();
    console.log('Respuesta setAllowFinalDownload:', {
      status: res.status,
      statusText: res.statusText,
      response: text
    });
    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${text || 'Error desconocido'}`);
    }
    return text ? JSON.parse(text) : {};
  } catch (error) {
    console.error('Error en setAllowFinalDownload:', error);
    throw error;
  }
}


export async function uploadPhotos({ galleryId, owner, files }) {
  const formData = new FormData();
  formData.append('galleryId', galleryId);
  formData.append('owner', owner);
  for (const file of files) {
    formData.append('photos', file);
  }
  const res = await fetch(`${API_URL}/photos/upload-multiple`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Error al subir fotos');
  return res.json();
}

export async function deleteAllPhotosFromGallery(galleryId) {
  const res = await fetch(`${API_URL}/photos/gallery/${galleryId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Error al eliminar todas las fotos');
  return await res.json();
}

export async function deletePhoto(photoId) {
  const res = await fetch(`${API_URL}/photos/${photoId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Error al eliminar foto');
  return res.json();
}
