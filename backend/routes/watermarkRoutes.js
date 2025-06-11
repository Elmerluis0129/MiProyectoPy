import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configuración de multer para subir imagen de marca de agua
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = './uploads/watermarks';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Subir marca de agua y configuración
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const { owner, config } = req.body;
    // Convertir imagen a base64
    const imageBuffer = fs.readFileSync(req.file.path);
    const imageBase64 = `data:${req.file.mimetype};base64,${imageBuffer.toString('base64')}`;
    // Eliminar archivo físico después de convertir
    fs.unlinkSync(req.file.path);
    // Buscar si ya existe marca de agua para este owner
    const { data: existing, error: findError } = await req.app.locals.supabase
      ? req.app.locals.supabase
          .from('watermarks')
          .select('*')
          .eq('owner', owner)
      : await import('../supabaseClient.js').then(m => m.supabase
          .from('watermarks')
          .select('*')
          .eq('owner', owner));
    if (findError) throw findError;
    let result;
    if (existing && existing.length > 0) {
      // Actualiza registro
      const { data, error } = await (req.app.locals.supabase
        ? req.app.locals.supabase
        : (await import('../supabaseClient.js')).supabase)
        .from('watermarks')
        .update({ image_url: imageBase64, config: JSON.parse(config) })
        .eq('owner', owner)
        .select();
      if (error) throw error;
      result = data[0];
    } else {
      // Inserta nuevo registro
      const { data, error } = await (req.app.locals.supabase
        ? req.app.locals.supabase
        : (await import('../supabaseClient.js')).supabase)
        .from('watermarks')
        .insert([{ owner: owner, image_url: imageBase64, config: JSON.parse(config) }])
        .select();
      if (error) throw error;
      result = data[0];
    }
    res.status(201).json({ owner: result.owner, image_url: result.image_url, config: result.config });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Obtener marca de agua y configuración
router.get('/:owner', async (req, res) => {
  try {
    const { data, error } = await (req.app.locals.supabase
      ? req.app.locals.supabase
      : (await import('../supabaseClient.js')).supabase)
      .from('watermarks')
      .select('*')
      .eq('owner', req.params.owner);
    if (error) throw error;
    if (!data || data.length === 0) return res.status(404).json({ error: 'No hay marca de agua configurada' });
    res.json(data[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Actualizar solo la configuración (sin subir nueva imagen)
router.put('/:owner/config', async (req, res) => {
  try {
    const { config } = req.body;
    // Actualizar config en Supabase
    const { data, error } = await req.app.locals.supabase
      ? req.app.locals.supabase
          .from('watermarks')
          .update({ config: JSON.parse(config) })
          .eq('owner', req.params.owner)
          .select()
      : await import('../supabaseClient.js').then(m => m.supabase
          .from('watermarks')
          .update({ config: JSON.parse(config) })
          .eq('owner', req.params.owner)
          .select());
    if (error) throw error;
    if (!data || data.length === 0) return res.status(404).json({ error: 'No hay marca de agua configurada' });
    res.json(data[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
