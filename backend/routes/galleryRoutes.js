import express from 'express';
import { supabase } from '../supabaseClient.js';

const router = express.Router();

// Obtener todas las galerías (admin)
router.get('/', async (req, res) => {
  try {
    const { data: galleries, error } = await supabase.from('galleries').select('*');
    if (error) throw error;
    res.json(galleries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear galería (admin)
router.post('/', async (req, res) => {
  try {
    const { title, selectionLimit } = req.body;
    const link = Math.random().toString(36).substring(2, 10) + Date.now().toString(36); // link único
    const { data, error } = await supabase
      .from('galleries')
      .insert([{ title, selection_limit: selectionLimit, link }])
      .select();
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Obtener galería por ID (admin)
router.get('/id/:id', async (req, res) => {
  try {
    const { data: galleries, error } = await supabase
      .from('galleries')
      .select('*, photos(*), selected_photos(*)')
      .eq('id', req.params.id);
    if (error) throw error;
    if (!galleries || galleries.length === 0) return res.status(404).json({ error: 'Galería no encontrada' });
    res.json(galleries[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener galería por link (público)
router.get('/:link', async (req, res) => {
  try {
    const { data: galleries, error } = await supabase
      .from('galleries')
      .select('*, photos(*), selected_photos(*)')
      .eq('link', req.params.link);
    if (error) throw error;
    if (!galleries || galleries.length === 0) return res.status(404).json({ error: 'Galería no encontrada' });
    res.json(galleries[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Seleccionar fotos (cliente)
router.post('/:link/select', async (req, res) => {
  try {
    const { selectedPhotos, userId } = req.body; // array de IDs de fotos y el usuario
    // Busca la galería
    const { data: galleries, error: errorGallery } = await supabase
      .from('galleries')
      .select('id')
      .eq('link', req.params.link);
    if (errorGallery) throw errorGallery;
    if (!galleries || galleries.length === 0) return res.status(404).json({ error: 'Galería no encontrada' });
    const galleryId = galleries[0].id;
    // Borra selecciones previas
    await supabase.from('selected_photos').delete().eq('gallery_id', galleryId).eq('user_id', userId);
    // Inserta nuevas selecciones
    if (selectedPhotos && selectedPhotos.length > 0) {
      const insertRows = selectedPhotos.map(photoId => ({ gallery_id: galleryId, user_id: userId, photo_id: photoId }));
      const { error: errorInsert } = await supabase.from('selected_photos').insert(insertRows);
      if (errorInsert) throw errorInsert;
    }
    res.json({ message: 'Selección guardada', selectedPhotos });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Habilitar descarga (admin)
router.patch('/:id/allow-download', async (req, res) => {
  try {
    console.log('Actualizando allow_download para galería:', req.params.id, 'con valor:', req.body.allowDownload);
    
    // Forzar la actualización del esquema
    await supabase.rpc('get_gallery_schema');
    
    // Actualizar solo el campo necesario
    const { data, error } = await supabase
      .from('galleries')
      .update({
        allow_download: req.body.allowDownload
      })
      .eq('id', req.params.id)
      .select('*');
      
    if (error) {
      console.error('Error en Supabase (allow-download):', error);
      // Intentar crear la columna si no existe
      if (error.message.includes('column "allow_download" does not exist')) {
        console.log('La columna allow_download no existe, intentando crearla...');
        await supabase.rpc('create_allow_download_column');
        // Reintentar la actualización
        return router.handle(req, res);
      }
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.error('No se encontró la galería con ID:', req.params.id);
      return res.status(404).json({ error: 'Galería no encontrada' });
    }
    
    console.log('Galería actualizada (allow-download):', data[0]);
    res.json(data[0]);
  } catch (err) {
    console.error('Error en PATCH /allow-download:', err);
    res.status(400).json({ 
      error: 'Error al actualizar permiso de descarga',
      details: err.message 
    });
  }
});

// Habilitar descarga final (admin)
router.patch('/:id/allow-final-download', async (req, res) => {
  try {
    console.log('Actualizando allow_final_download para galería:', req.params.id, 'con valor:', req.body.allowFinalDownload);
    
    const { data, error } = await supabase
      .from('galleries')
      .update({ 
        allow_final_download: req.body.allowFinalDownload
      })
      .eq('id', req.params.id)
      .select('*');
      
    if (error) {
      console.error('Error en Supabase (allow-final-download):', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.error('No se encontró la galería con ID:', req.params.id);
      return res.status(404).json({ error: 'Galería no encontrada' });
    }
    
    console.log('Galería actualizada (allow-final-download):', data[0]);
    res.json(data[0]);
  } catch (err) {
    console.error('Error en PATCH /allow-final-download:', err);
    res.status(400).json({ 
      error: 'Error al actualizar permiso de descarga final',
      details: err.message 
    });
  }
});

// Agregar comentario (cliente)
router.post('/:link/comment', async (req, res) => {
  try {
    const { name, comment, userId } = req.body;
    // Busca la galería
    const { data: galleries, error: errorGallery } = await supabase
      .from('galleries')
      .select('id')
      .eq('link', req.params.link);
    if (errorGallery) throw errorGallery;
    if (!galleries || galleries.length === 0) return res.status(404).json({ error: 'Galería no encontrada' });
    const galleryId = galleries[0].id;
    // Inserta el comentario
    const { error: errorInsert } = await supabase.from('comments').insert([{ gallery_id: galleryId, user_id: userId, name, comment }]);
    if (errorInsert) throw errorInsert;
    res.json({ message: 'Comentario agregado' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
