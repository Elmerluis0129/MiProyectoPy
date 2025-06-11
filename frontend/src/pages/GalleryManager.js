import React, { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { useParams } from 'react-router-dom';
import { 
  fetchGalleryById, 
  uploadPhotos, 
  setAllowDownload, 
  setAllowFinalDownload 
} from '../services/api';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import Button from '@mui/material/Button';

const GalleryManager = () => {
  const { id } = useParams();
  const [gallery, setGallery] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [photoToView, setPhotoToView] = useState(null);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const owner = 'admin'; // Puedes cambiar esto por el usuario real si tienes auth

  useEffect(() => {
    async function loadGallery() {
      try {
        setLoading(true);
        const data = await fetchGalleryById(id);
        setGallery(data);
        setPhotos(data.photos || []);
      } catch (e) {
        setError('No se pudo cargar la galería');
      } finally {
        setLoading(false);
      }
    }
    loadGallery();
  }, [id]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
    setPreviewUrls(files.map(file => URL.createObjectURL(file)));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFiles.length) return;
    setLoading(true);
    setError(null);
    try {
      await uploadPhotos({ galleryId: id, owner, files: selectedFiles });
      // Recargar galería
      const data = await fetchGalleryById(id);
      setGallery(data);
      setPhotos(data.photos || []);
      setSelectedFiles([]);
      setPreviewUrls([]);
    } catch (e) {
      setError('Error al subir fotos');
    } finally {
      setLoading(false);
    }
  };

  const handleAllowDownloadChange = async (e) => {
    if (!gallery?.id) return;
    
    const isChecked = Boolean(e.target.checked);
    console.log('Switch cambiado:', isChecked, 'gallery.id:', gallery.id);
    
    // Actualización optimista
    const previousState = gallery.allowDownload;
    setGallery(prev => ({ ...prev, allowDownload: isChecked }));
    
    try {
      console.log('Llamando a setAllowDownload con:', { id: gallery.id, allowDownload: isChecked });
      const result = await setAllowDownload(gallery.id, isChecked);
      console.log('Respuesta de setAllowDownload:', result);
      setMessage('Permiso de descarga actualizado');
    } catch (error) {
      console.error('Error en handleAllowDownloadChange:', error);
      setError(`Error al actualizar permiso de descarga: ${error.message}`);
      // Revertir el cambio en la UI si falla
      setGallery(prev => ({ ...prev, allowDownload: previousState }));
    }
  };

  const handleAllowFinalDownloadChange = async (e) => {
    if (!gallery?.id) return;
    
    const isChecked = Boolean(e.target.checked);
    console.log('Switch FINAL cambiado:', isChecked, 'gallery.id:', gallery.id);
    
    // Actualización optimista
    const previousState = gallery.allowFinalDownload;
    setGallery(prev => ({ ...prev, allowFinalDownload: isChecked }));
    
    try {
      console.log('Llamando a setAllowFinalDownload con:', { id: gallery.id, allowFinalDownload: isChecked });
      const result = await setAllowFinalDownload(gallery.id, isChecked);
      console.log('Respuesta de setAllowFinalDownload:', result);
      setMessage('Permiso de descarga final actualizado');
    } catch (error) {
      console.error('Error en handleAllowFinalDownloadChange:', error);
      setError(`Error al actualizar permiso de descarga final: ${error.message}`);
      // Revertir el cambio en la UI si falla
      setGallery(prev => ({ ...prev, allowFinalDownload: previousState }));
    }
  };

  const renderContent = () => {
    if (loading) {
      return <Typography color="text.secondary">Cargando galería...</Typography>;
    }
    
    if (error) {
      return <MuiAlert severity="error" sx={{ mb: 2 }}>{error}</MuiAlert>;
    }
    
    if (!gallery) {
      return <Typography color="text.secondary">No se pudo cargar la galería</Typography>;
    }
    
    return (
      <>
        <Typography variant="h5" sx={{ mb: 2 }}>{gallery.title || 'Galería sin título'}</Typography>

        {/* Permisos de galería */}
        <Paper variant="outlined" sx={{ p: 2, mb: 3, display: 'flex', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(gallery.allowDownload)}
                onChange={handleAllowDownloadChange}
                disabled={!gallery.id}
              />
            }
            label="Permitir descarga"
          />
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(gallery.allowFinalDownload)}
                onChange={handleAllowFinalDownloadChange}
                disabled={!gallery.id}
              />
            }
            label="Permitir descarga final"
          />
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <form onSubmit={handleUpload} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <label style={{ flex: 1 }}>
              <Typography variant="body1">Subir fotos (múltiple):</Typography>
              <input type="file" multiple accept="image/*" onChange={handleFileChange} style={{ marginTop: 8 }} />
            </label>
            <Button type="submit" variant="contained" color="primary" disabled={loading || !selectedFiles.length}>
              Subir
            </Button>
          </form>
          {previewUrls.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              {previewUrls.map((url, idx) => (
                <img key={idx} src={url} alt="preview" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4, border: '1px solid #ccc' }} />
              ))}
            </div>
          )}
        </Paper>

        <Typography variant="h6" sx={{ mb: 2 }}>Fotos en la galería</Typography>
        {photos.length === 0 ? (
          <Typography color="text.secondary">No hay fotos aún.</Typography>
        ) : (
          <Grid container spacing={2}>
            {photos.map((photo, index) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={photo.id}>
                <Card>
                  <CardMedia
                    component="img"
                    height="180"
                    image={
                      photo.watermarked_url
                        ? `${process.env.REACT_APP_API_URL}/${photo.watermarked_url.replace(/\\/g, '/')}`
                        : `${process.env.REACT_APP_API_URL}/${photo.url.replace(/\\/g, '/')}`
                    }
                    alt={photo.name || 'foto'}
                    style={{ objectFit: 'cover' }}
                  />
                  <CardContent>
                    <Typography variant="subtitle1" noWrap>{photo.name || `Foto #${String(index + 1).padStart(2, '0')}`}</Typography>
                    {photo.createdAt && (
                      <Typography variant="caption" color="textSecondary">
                        {new Date(photo.createdAt).toLocaleString()}
                      </Typography>
                    )}
                  </CardContent>
                  <CardActions>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        setPhotoToView(photo);
                        setViewDialogOpen(true);
                      }}
                    >
                      Ver
                    </Button>
                    <IconButton
                      aria-label="eliminar"
                      onClick={() => {
                        setPhotoToDelete(photo);
                        setDeleteDialogOpen(true);
                      }}
                      style={{ color: '#f44336' }}
                    >
                      <span className="material-icons">delete</span>
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </>
    );
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, mb: 4, position: 'relative' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Gestión de Galería
        </Typography>
        {renderContent()}
      </Paper>

      {/* Dialogo de confirmación para eliminar foto */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>¿Eliminar foto?</DialogTitle>
          <DialogContent>
            <Typography>
              ¿Estás seguro de que deseas eliminar la foto {photoToDelete?.name ? `"${photoToDelete.name}"` : photoToDelete?.id ? `#${photoToDelete.id}` : ''}?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (!photoToDelete) return;
                try {
                  await import('../services/api').then(mod => mod.deletePhoto(photoToDelete.id));
                  setPhotos(photos.filter(p => p.id !== photoToDelete.id));
                  setMessage(`Foto eliminada${photoToDelete.name ? `: ${photoToDelete.name}` : ''}`);
                } catch {
                  setError('Error al eliminar foto');
                } finally {
                  setDeleteDialogOpen(false);
                  setPhotoToDelete(null);
                }
              }}
              color="error"
              variant="contained"
            >
              Eliminar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Diálogo para ver imagen */}
        <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)}>
          <DialogTitle>¿Qué versión de la foto quieres ver?</DialogTitle>
          <DialogContent>
            <Typography>Selecciona una opción:</Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                if (!photoToView) return;
                const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';
                const url = `${API_URL}/${photoToView.url.replace(/\\/g, '/')}`;
                window.open(url, '_blank');
                setViewDialogOpen(false);
                setPhotoToView(null);
              }}
              variant="outlined"
            >
              Ver original
            </Button>
            <Button
              onClick={() => {
                if (!photoToView) return;
                const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';
                const url = photoToView.watermarked_url
                  ? `${API_URL}/${photoToView.watermarked_url.replace(/\\/g, '/')}`
                  : `${API_URL}/${photoToView.url.replace(/\\/g, '/')}`;
                window.open(url, '_blank');
                setViewDialogOpen(false);
                setPhotoToView(null);
              }}
              variant="contained"
              color="primary"
            >
              Ver con marca de agua
            </Button>
          </DialogActions>
        </Dialog>
      {/* Diálogo de confirmación para eliminar foto */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>¿Eliminar foto?</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que deseas eliminar la foto {photoToDelete?.name ? `"${photoToDelete.name}"` : photoToDelete?.id ? `#${photoToDelete.id}` : ''}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
            Cancelar
          </Button>
          <Button
            onClick={async () => {
              if (!photoToDelete) return;
              try {
                await import('../services/api').then(mod => mod.deletePhoto(photoToDelete.id));
     