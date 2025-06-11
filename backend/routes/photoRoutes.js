import express from 'express';
import { supabase } from '../supabaseClient.js';

const router = express.Router();

import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

// Configuración de multer para fotos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = './uploads/photos';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Subir múltiples fotos a galería (admin)
router.post('/upload-multiple', upload.array('photos'), async (req, res) => {
  try {
    const { galleryId, owner } = req.body;
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No se recibieron archivos.' });
    }
    // Buscar configuración de marca de agua en Supabase
    const { data: watermarks, error: wmError } = await supabase
      .from('watermarks')
      .select('*')
      .eq('owner', owner);
    if (wmError) throw wmError;
    const watermark = watermarks && watermarks.length > 0 ? watermarks[0] : null;
    if (!watermark) {
      return res.status(400).json({ error: 'No hay marca de agua configurada para este fotógrafo.' });
    }
    // Buscar galería en Supabase
    const { data: galleries, error: galError } = await supabase
      .from('galleries')
      .select('*')
      .eq('id', galleryId);
    if (galError) throw galError;
    const gallery = galleries && galleries.length > 0 ? galleries[0] : null;
    if (!gallery) {
      return res.status(404).json({ error: 'Galería no encontrada.' });
    }
    const uploadedPhotos = [];
    for (const file of req.files) {
      const photoPath = file.path;
      // Procesar imagen y aplicar marca de agua
      const originalImage = sharp(photoPath);
      // DEBUG: Log de la configuración de marca de agua
      console.log('CONFIG WATERMARK:', JSON.stringify(watermark.config));
      let wmWidth = 100, wmHeight = 100;
      if (watermark.config.size && watermark.config.size.width && watermark.config.size.height) {
        wmWidth = watermark.config.size.width;
        wmHeight = watermark.config.size.height;
      } else {
        console.warn('Advertencia: watermark.config.size no tiene width/height válidos, usando 100x100 por defecto');
      }
      let watermarkBuffer;
      try {
        let wmInput = watermark.image_url;
        if (!wmInput) throw new Error('No se encontró image_url en la marca de agua.');
        // Si es base64, decodifica
        if (wmInput.startsWith('data:image')) {
          const base64String = wmInput.split(',')[1];
          wmInput = Buffer.from(base64String, 'base64');
        }
        watermarkBuffer = await sharp(wmInput).resize(wmWidth, wmHeight).png().toBuffer();
      } catch (err) {
        return res.status(400).json({ error: 'No se pudo procesar la imagen de la marca de agua: ' + err.message });
      }
      let compositeArray = [];
      const fitWidthCenter = watermark.config.fitWidthCenter;
      const positions = Array.isArray(watermark.config.positions) ? watermark.config.positions : [{ x: 0, y: 0 }];
      const opacities = watermark.config.perWatermarkOpacity || [];
      const { width: imgWidth, height: imgHeight } = await originalImage.metadata();
      if (fitWidthCenter) {
        // Adaptar watermark a todo el ancho y centrar verticalmente
        const wmWidthFit = imgWidth;
        const wmHeightFit = wmHeight; // mantiene la altura configurada
        const opacity = watermark.config.opacity ?? 0.5;
        const bgBuffer = await sharp({
          create: {
            width: wmWidthFit,
            height: wmHeightFit,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 0.3 }
          }
        }).png().toBuffer();
        const watermarkResizedBuffer = await sharp(bgBuffer)
          .composite([{ input: await sharp(watermarkBuffer)
            .resize(wmWidthFit, wmHeightFit)
            .ensureAlpha()
            .modulate({ alpha: opacity })
            .toBuffer(), left: 0, top: 0 }])
          .png()
          .toBuffer();
        const top = Math.round((imgHeight - wmHeightFit) / 2);
        compositeArray.push({
          input: watermarkResizedBuffer,
          left: 0,
          top: top < 0 ? 0 : top
        });
      } else if (watermark.config.fillPattern) {
        // Llenar imagen con varias marcas pequeñas en patrón de mosaico
        const patternCount = watermark.config.patternCount || 6;
        const opacity = watermark.config.opacity ?? 0.5;
        // Calcula filas y columnas lo más cuadrado posible
        const cols = Math.ceil(Math.sqrt(patternCount));
        const rows = Math.ceil(patternCount / cols);
        const xSpacing = (imgWidth - cols * wmWidth) / (cols + 1);
        const ySpacing = (imgHeight - rows * wmHeight) / (rows + 1);
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const idx = row * cols + col;
            if (idx >= patternCount) break;
            const left = Math.round(xSpacing + col * (wmWidth + xSpacing));
            const top = Math.round(ySpacing + row * (wmHeight + ySpacing));
            // Fondo semitransparente
            const bgBuffer = await sharp({
              create: {
                width: wmWidth,
                height: wmHeight,
                channels: 4,
                background: { r: 255, g: 255, b: 255, alpha: 0.3 }
              }
            }).png().toBuffer();
            const watermarkResizedBuffer = await sharp(bgBuffer)
              .composite([{ input: await sharp(watermarkBuffer)
                .resize(wmWidth, wmHeight)
                .ensureAlpha()
                .modulate({ alpha: opacity })
                .toBuffer(), left: 0, top: 0 }])
              .png()
              .toBuffer();
            compositeArray.push({
              input: watermarkResizedBuffer,
              left,
              top
            });
          }
        }
      } else {
        for (let i = 0; i < positions.length; i++) {
          const pos = positions[i];
          const opacity = opacities[i] !== undefined ? opacities[i] : (watermark.config.opacity ?? 1);
          compositeArray.push({
            input: await sharp(watermarkBuffer).ensureAlpha().modulate({ alpha: opacity }).toBuffer(),
            left: pos.x,
            top: pos.y
          });
        }
      }
      const watermarkedPath = photoPath.replace(/(\.[^.]+)$/, '_watermarked$1');
      await originalImage.composite(compositeArray).toFile(watermarkedPath);
      // Guardar en Supabase
      const { data: photoData, error: photoError } = await supabase
        .from('photos')
        .insert([{ gallery_id: galleryId, url: photoPath, watermarked_url: watermarkedPath }])
        .select();
      if (photoError) throw photoError;
      uploadedPhotos.push(photoData[0]);
    }
    res.status(201).json({ message: 'Fotos subidas y marcas de agua aplicadas', photos: uploadedPhotos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar foto individual por id
router.delete('/photos/:id', async (req, res) => {
  try {
    const photoId = req.params.id;
    // Buscar la foto
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('id', photoId);
    if (error) throw error;
    if (!data || data.length === 0) return res.status(404).json({ error: 'Foto no encontrada' });
    const photo = data[0];
    // Eliminar archivos locales
    [photo.url, photo.watermarked_url].forEach(path => {
      if (path && fs.existsSync(path)) fs.unlinkSync(path);
    });
    // Eliminar de Supabase
    const { error: delError } = await supabase
      .from('photos')
      .delete()
      .eq('id', photoId);
    if (delError) throw delError;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar todas las fotos de una galería
router.delete('/photos/gallery/:galleryId', async (req, res) => {
  try {
    const galleryId = req.params.galleryId;
    // Buscar todas las fotos de la galería
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('gallery_id', galleryId);
    if (error) throw error;
    if (!data || data.length === 0) return res.json({ success: true, deleted: 0 });
    // Eliminar archivos locales
    data.forEach(photo => {
      [photo.url, photo.watermarked_url].forEach(path => {
        try {
          if (path && fs.existsSync(path)) fs.unlinkSync(path);
        } catch (err) {
          console.error('Error borrando archivo local:', path, err);
        }
      });
    });
    // Eliminar de Supabase
    const { error: delError } = await supabase
      .from('photos')
      .delete()
      .eq('gallery_id', galleryId);
    if (delError) throw delError;
    res.json({ success: true, deleted: data.length });
  } catch (err) {
    console.error('Error en DELETE /photos/gallery/:galleryId:', err, err.stack);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// Subir foto a galería (admin)
router.post('/upload', upload.single('photo'), async (req, res) => {
  try {
    const { galleryId, ownerId } = req.body;
    const photoPath = req.file.path;

    // Buscar configuración de marca de agua en Supabase
    const { data: watermarks, error: wmError } = await supabase
      .from('watermarks')
      .select('*')
      .eq('owner', ownerId);
    if (wmError) throw wmError;
    const watermark = watermarks && watermarks.length > 0 ? watermarks[0] : null;
    if (!watermark) {
      return res.status(400).json({ error: 'No hay marca de agua configurada para este usuario.' });
    }

    // Procesar la imagen con sharp y aplicar la marca de agua
    const originalImage = sharp(photoPath);
    let wmWidth = 100, wmHeight = 100;
    if (watermark.config && watermark.config.size && watermark.config.size.width && watermark.config.size.height) {
      wmWidth = watermark.config.size.width;
      wmHeight = watermark.config.size.height;
    }
    let watermarkBuffer;
    try {
      let wmInput = watermark.image_url;
      if (!wmInput) throw new Error('No se encontró image_url en la marca de agua.');
      // Si es base64, decodifica
      if (wmInput.startsWith('data:image')) {
        const base64String = wmInput.split(',')[1];
        wmInput = Buffer.from(base64String, 'base64');
      }
      watermarkBuffer = await sharp(wmInput).resize(wmWidth, wmHeight).png().toBuffer();
    } catch (err) {
      return res.status(400).json({ error: 'No se pudo procesar la imagen de la marca de agua: ' + err.message });
    }
    let compositeArray = [];
    const positions = Array.isArray(watermark.config.positions) ? watermark.config.positions : [{ x: 0, y: 0 }];
    const opacities = watermark.config.perWatermarkOpacity || [];
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      const opacity = opacities[i] !== undefined ? opacities[i] : (watermark.config.opacity ?? 1);
      compositeArray.push({
        input: await sharp(watermarkBuffer).ensureAlpha().modulate({ alpha: opacity }).toBuffer(),
        left: pos.x,
        top: pos.y
      });
    }
    const watermarkedPath = photoPath.replace(/(\.[^.]+)$/, '_watermarked$1');
    await originalImage.composite(compositeArray).toFile(watermarkedPath);

    // Guardar en Supabase
    const { data: photoData, error: photoError } = await supabase
      .from('photos')
      .insert([{ gallery_id: galleryId, url: photoPath, watermarked_url: watermarkedPath }])
      .select();
    if (photoError) throw photoError;
    res.status(201).json({ message: 'Foto subida y marca de agua aplicada', photo: photoData[0] });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Listar fotos de una galería
router.get('/gallery/:galleryId', async (req, res) => {
  try {
    const { data: photos, error } = await supabase
      .from('photos')
      .select('*')
      .eq('gallery_id', req.params.galleryId);
    if (error) throw error;
    res.json(photos);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Obtener info de foto
router.get('/:id', async (req, res) => {
  try {
    const { data: photos, error } = await supabase
      .from('photos')
      .select('*')
      .eq('id', req.params.id);
    if (error) throw error;
    if (!photos || photos.length === 0) return res.status(404).json({ error: 'Foto no encontrada' });
    res.json(photos[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Eliminar foto por ID
router.delete('/:id', async (req, res) => {
  try {
    // Busca la foto en Supabase
    const { data: photos, error: photoError } = await supabase
      .from('photos')
      .select('*')
      .eq('id', req.params.id);
    if (photoError) throw photoError;
    if (!photos || photos.length === 0) return res.status(404).json({ error: 'Foto no encontrada' });
    const photo = photos[0];
    // Eliminar archivos físicos
    if (photo.url && fs.existsSync(photo.url)) fs.unlinkSync(photo.url);
    if (photo.watermarked_url && fs.existsSync(photo.watermarked_url)) fs.unlinkSync(photo.watermarked_url);
    // Eliminar de Supabase
    const { error: delError } = await supabase.from('photos').delete().eq('id', req.params.id);
    if (delError) throw delError;
    res.json({ message: 'Foto eliminada' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// Subir versión final de foto editada (admin)
router.patch('/:id/final', async (req, res) => {
  // Aquí se implementará la lógica para subir la foto editada
  res.status(501).json({ error: 'Subida de foto final aún no implementada' });
});

export default router;
