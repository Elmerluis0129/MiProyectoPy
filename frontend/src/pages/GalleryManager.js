import React, { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import { useParams, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
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
  const [copyConfirmOpen, setCopyConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
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

  // Función para copiar al portapapeles
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setMessage('Enlace copiado al portapapeles');
      },
      (err) => {
        console.error('Error al copiar al portapapeles:', err);
        setError('No se pudo copiar el enlace');
      }
    );
  };

  // Función para manejar la acción de copiar o abrir
  const handleCopyOrOpen = (action) => {
    if (!gallery) return;
    
    const url = new URL(window.location.origin);
    url.pathname = `/client/${gallery.share_link || gallery.id}`;
    const urlString = url.toString();
    
    if (action === 'copy') {
      copyToClipboard(urlString);
    } else if (action === 'open') {
      window.open(urlString, '_blank');
    }
    
    setCopyConfirmOpen(false);
  };
  
  // Función para confirmar la acción
  const confirmAction = (action) => {
    setPendingAction(action);
    setCopyConfirmOpen(true);
  };

  // Función para generar el enlace de la galería
  const generateGalleryLink = (galleryData) => {
    if (!galleryData) return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/client/${galleryData.share_link || galleryData.id}`;
  };

  // Función para actualizar los permisos y el enlace
  const updatePermissions = async (updates) => {
    if (!gallery?.id) return;
    
    // Actualización optimista
    const previousState = { ...gallery };
    setGallery(prev => ({ ...prev, ...updates }));
    
    try {
      // Actualizar los permisos en el servidor
      if ('allowDownload' in updates) {
        await setAllowDownload(gallery.id, updates.allowDownload);
      }
      if ('allowFinalDownload' in updates) {
        await setAllowFinalDownload(gallery.id, updates.allowFinalDownload);
      }
      
      // Recargar la galería para obtener los cambios más recientes
      const updatedGallery = await fetchGalleryById(gallery.id);
      setGallery(updatedGallery);
      
      // Actualizar la URL en el navegador sin recargar la página
      navigate(`/gallery/${gallery.id}`, { replace: true });
      
      // Copiar el nuevo enlace al portapapeles
      const newLink = generateGalleryLink(updatedGallery);
      copyToClipboard(newLink);
      
      return updatedGallery;
    } catch (error) {
      console.error('Error al actualizar permisos:', error);
      setError('Error al actualizar los permisos');
      // Revertir el cambio en la UI si falla
      setGallery(previousState);
      throw error;
    }
  };

  const handleAllowDownloadChange = async (e) => {
    try {
      const isChecked = Boolean(e.target.checked);
      await updatePermissions({ allowDownload: isChecked });
      setMessage('Permiso de descarga actualizado');
    } catch (error) {
      console.error('Error al actualizar el permiso de descarga:', error);
      setError(`Error al actualizar permiso de descarga: ${error.message}`);
    }
  };

  const handleWatermarkChange = async (e) => {
    if (!gallery?.id) return;
    
    const isChecked = Boolean(e.target.checked);
    
    // Guardar el estado anterior para poder revertir si hay un error
    const previousState = { ...gallery };
    
    try {
      // Si se está activando la visualización sin marca de agua pero no tienen permiso de descarga
      if (isChecked && !gallery.allowDownload) {
        const confirmEnableBoth = window.confirm(
          'Para permitir la visualización sin marca de agua, también se debe permitir la descarga. ¿Deseas habilitar ambos permisos?'
        );
        
        if (confirmEnableBoth) {
          // Actualizar ambos permisos
          await updatePermissions({ 
            allowDownload: true, 
            allowFinalDownload: true 
          });
        } else {
          // Si el usuario cancela, mantener el checkbox sin cambios
          return;
        }
      } else {
        // Si están desactivando o activando la visualización sin marca de agua
        await updatePermissions({ 
          allowFinalDownload: isChecked 
        });
      }
    } catch (error) {
      console.error('Error al actualizar el permiso de marca de agua:', error);
      setError(`Error al actualizar el permiso: ${error.message}`);
      // Revertir el cambio en la UI si falla
      setGallery(prev => ({ ...prev, ...previousState }));
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
        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Permisos de la galería</Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(gallery.allowDownload)}
                  onChange={handleAllowDownloadChange}
                  disabled={!gallery.id}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography>Permitir descarga de imágenes</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Los clientes podrán descargar las imágenes con marca de agua
                  </Typography>
                </Box>
              }
              sx={{ m: 0, alignItems: 'flex-start' }}
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(gallery.allowFinalDownload)}
                  onChange={handleWatermarkChange}
                  disabled={!gallery.id || !gallery.allowDownload}
                  color="secondary"
                />
              }
              label={
                <Box>
                  <Typography>Permitir visualización y descarga sin marca de agua</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Los clientes podrán ver y descargar las imágenes sin marca de agua
                    {gallery.allowDownload ? '' : ' (requiere activar la descarga)'}
                  </Typography>
                </Box>
              }
              sx={{ 
                m: 0, 
                alignItems: 'flex-start',
                opacity: gallery.allowDownload ? 1 : 0.7
              }}
            />
            
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" gutterBottom>Resumen de permisos:</Typography>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li>
                  <Typography variant="body2">
                    <strong>Sin permisos:</strong> Solo pueden ver las miniaturas con marca de agua
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2">
                    <strong>Solo descarga:</strong> Pueden descargar imágenes con marca de agua
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2">
                    <strong>Visualización/Descarga sin marca:</strong> Pueden ver y descargar sin marca de agua
                  </Typography>
                </li>
              </ul>
            </Box>
          </Box>
        </Paper>

        {/* Enlace de la galería */}
        {gallery?.link && (
          <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Enlace de la galería</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField 
                value={`${window.location.origin}/view/${gallery.link}`}
                fullWidth
                size="small"
                InputProps={{
                  readOnly: true,
                }}
              />
              <Button 
                variant="contained"
                onClick={() => confirmAction('copy')}
              >
                Copiar
              </Button>
              <Button 
                variant="outlined"
                onClick={() => confirmAction('open')}
              >
                Abrir
              </Button>
            </Box>
          </Paper>
        )}

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

      {/* Diálogo de confirmación para copiar/abrir */}
      <Dialog
        open={copyConfirmOpen}
        onClose={() => setCopyConfirmOpen(false)}
      >
        <DialogTitle>Verificar permisos</DialogTitle>
        <DialogContent>
          <Typography>Por favor, verifica que los permisos de descarga y visualización estén configurados correctamente antes de compartir el enlace.</Typography>
          <Typography variant="subtitle2" sx={{ mt: 2, fontWeight: 'bold' }}>Permisos actuales:</Typography>
          <ul>
            <li>Descarga: {gallery?.allow_download ? '✅ Activada' : '❌ Desactivada'}</li>
            <li>Visualización sin marca de agua: {gallery?.allow_final_download ? '✅ Activada' : '❌ Desactivada'}</li>
          </ul>
          <Typography variant="body2" color="text.secondary">
            ¿Deseas continuar con la acción?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCopyConfirmOpen(false)}>Cancelar</Button>
          <Button 
            onClick={() => {
              if (pendingAction) {
                handleCopyOrOpen(pendingAction);
              }
            }} 
            variant="contained"
            color="primary"
          >
            Continuar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para confirmar eliminación de todas las fotos */}
      <Dialog
        open={deleteAllDialogOpen}
        onClose={() => setDeleteAllDialogOpen(false)}
      >  
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

      {/* Snackbar para mensajes */}
      <Snackbar
        open={!!message}
        autoHideDuration={3000}
        onClose={() => setMessage('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <MuiAlert onClose={() => setMessage('')} severity="success" sx={{ width: '100%' }}>
          {message}
        </MuiAlert>
      </Snackbar>
      
      <Snackbar
        open={!!error}
        autoHideDuration={4000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <MuiAlert onClose={() => setError('')} severity="error" sx={{ width: '100%' }}>
          {error}
        </MuiAlert>
      </Snackbar>
    </Container>
  );
};

export default GalleryManager;
