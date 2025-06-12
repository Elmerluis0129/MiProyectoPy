import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  Container, 
  Grid, 
  Card, 
  CardMedia, 
  CardActions, 
  Button, 
  Typography, 
  CircularProgress, 
  Snackbar, 
  Alert, 
  Box,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions as MuiDialogActions,
  styled
} from '@mui/material';
import { CheckCircle, Download, Close, Check, ZoomIn } from '@mui/icons-material';

const ClientGallery = () => {
  const [gallery, setGallery] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [currentPreview, setCurrentPreview] = useState(null);
  const [selectionSaved, setSelectionSaved] = useState(false);
  const [shareableLink, setShareableLink] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const { link } = useParams();
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';
  
  // Generar o recuperar un ID de sesión único para el visitante
  const getOrCreateSessionId = () => {
    let sessionId = localStorage.getItem('gallerySessionId');
    if (!sessionId) {
      sessionId = 'sess_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('gallerySessionId', sessionId);
    }
    return sessionId;
  };
  
  // Cargar selección guardada desde la URL o localStorage
  const loadSavedSelection = () => {
    try {
      // Intentar cargar desde la URL primero
      const params = new URLSearchParams(location.search);
      const selectedParam = params.get('selected');
      
      if (selectedParam) {
        const decoded = JSON.parse(decodeURIComponent(selectedParam));
        if (Array.isArray(decoded)) {
          setSelected(decoded);
          setSelectionSaved(true);
          return;
        }
      }
      
      // Si no hay en la URL, intentar cargar del localStorage
      const savedSelection = localStorage.getItem(`gallery_${link}_selection`);
      if (savedSelection) {
        setSelected(JSON.parse(savedSelection));
      }
    } catch (e) {
      console.error('Error al cargar selección guardada:', e);
    }
  };

  // Cargar la galería y sus fotos
  useEffect(() => {
    const fetchGallery = async () => {
      setLoading(true);
      try {
        // Obtener información de la galería
        const galleryRes = await fetch(`${API_URL}/galleries/${link}`);
        if (!galleryRes.ok) throw new Error('No se pudo cargar la galería');
        const galleryData = await galleryRes.json();
        
        // Siempre cargamos la galería, independientemente de los permisos
        setGallery(galleryData);
        
        // Cargar selección guardada después de cargar la galería
        loadSavedSelection();
        setPhotos(galleryData.photos || []);
        
        // Cargar las fotos ya seleccionadas si existen
        if (galleryData.selected_photos && galleryData.selected_photos.length > 0) {
          setSelected(galleryData.selected_photos.map(p => p.photo_id));
        }
        
      } catch (err) {
        setError('Error al cargar la galería: ' + err.message);
        console.error('Error al cargar la galería:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchGallery();
  }, [link, API_URL]);

  // Alternar selección de foto
  const toggleSelect = (photoId) => {
    setSelected(prev => {
      if (prev.includes(photoId)) {
        return prev.filter(id => id !== photoId);
      } else {
        // Verificar límite de selección
        if (gallery?.selection_limit && prev.length >= gallery.selection_limit) {
          setMessage(`Solo puedes seleccionar hasta ${gallery.selection_limit} fotos`);
          return prev;
        }
        return [...prev, photoId];
      }
    });
  };

  // Abrir vista previa de la foto
  const handlePreview = (photo) => {
    setCurrentPreview(photo);
    setPreviewOpen(true);
  };

  // Descargar foto individual
  const handleDownload = async (photo) => {
    if (!gallery?.allow_download) {
      setMessage('La descarga de fotos no está permitida en esta galería');
      return;
    }

    try {
      setLoading(true);
      
      // Determinar qué URL usar para la descarga
      let downloadUrl = '';
      
      if (gallery.allow_final_download && photo.url) {
        downloadUrl = photo.url.startsWith('http') 
          ? photo.url 
          : `${API_URL}/${photo.url.replace(/\\/g, '/')}`;
      } else if (photo.watermarked_url) {
        downloadUrl = photo.watermarked_url.startsWith('http')
          ? photo.watermarked_url
          : `${API_URL}/${photo.watermarked_url.replace(/\\/g, '/')}`;
      } else if (photo.url) {
        downloadUrl = photo.url.startsWith('http')
          ? photo.url
          : `${API_URL}/${photo.url.replace(/\\/g, '/')}`;
      }
      
      if (downloadUrl) {
        // Abrir en una nueva pestaña para la descarga
        window.open(downloadUrl, '_blank');
      } else {
        throw new Error('No se pudo obtener la URL de descarga');
      }
      
    } catch (err) {
      setError('Error al descargar la foto: ' + err.message);
      console.error('Error al descargar la foto:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Guardar selección localmente
  const handleSaveSelection = async () => {
    if (selected.length === 0) return;
    
    try {
      // Generar un enlace único para compartir la selección
      const selectionData = {
        galleryId: gallery.id,
        photoIds: selected,
        timestamp: new Date().toISOString()
      };
      
      // Codificar la selección en la URL
      const encodedSelection = encodeURIComponent(JSON.stringify(selected));
      const newUrl = `${window.location.origin}${window.location.pathname}?selected=${encodedSelection}`;
      
      // Guardar en localStorage para persistencia
      localStorage.setItem(`gallery_${link}_selection`, JSON.stringify(selected));
      
      // Actualizar el estado
      setShareableLink(newUrl);
      setSelectionSaved(true);
      setMessage('Selección guardada correctamente');
      
    } catch (err) {
      setError('Error al guardar la selección: ' + err.message);
      console.error('Error al guardar la selección:', err);
    }
  };
  
  // Descargar fotos seleccionadas
  const handleDownloadSelected = async () => {
    if (selected.length === 0 || !gallery?.allow_download) return;
    
    try {
      setLoading(true);
      
      // Descargar cada foto seleccionada
      for (const photoId of selected) {
        const photo = photos.find(p => p.id === photoId);
        if (photo) {
          await handleDownload(photo);
          // Pequeña pausa entre descargas para evitar sobrecargar el navegador
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      setMessage(`Se han descargado ${selected.length} ${selected.length === 1 ? 'foto' : 'fotos'}`);
      
    } catch (err) {
      setError('Error al descargar las fotos: ' + err.message);
      console.error('Error al descargar las fotos:', err);
    } finally {
      setLoading(false);
      setDownloadDialogOpen(false);
    }
  };

  // Función para copiar enlace de la selección al portapapeles
  const copyShareableLink = () => {
    if (!shareableLink) return;
    
    navigator.clipboard.writeText(shareableLink).then(
      () => setMessage('Enlace copiado al portapapeles'),
      () => setError('No se pudo copiar el enlace')
    );
  };
  
  // Componente de diálogo de guardado exitoso
  const SaveSuccessDialog = () => (
    <Dialog open={selectionSaved} onClose={() => setSelectionSaved(false)}>
      <DialogTitle>¡Selección guardada!</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Tu selección ha sido guardada. Puedes copiar el siguiente enlace para acceder a ella más tarde o compartirla con otros:
        </DialogContentText>
        <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1, wordBreak: 'break-all' }}>
          <Typography variant="body2">{shareableLink}</Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setSelectionSaved(false)}>Cerrar</Button>
        <Button 
          onClick={copyShareableLink}
          variant="contained" 
          color="primary"
          startIcon={<Download />}
        >
          Copiar enlace
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Componente de diálogo de descarga
  const DownloadDialog = () => (
    <Dialog 
      open={downloadDialogOpen} 
      onClose={() => setDownloadDialogOpen(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Descargar fotos seleccionadas</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {gallery?.allow_download ? (
            `Has seleccionado ${selected.length} fotos. ¿Deseas descargarlas ahora?`
          ) : (
            <Alert severity="warning" sx={{ mb: 2 }}>
              La descarga de fotos no está permitida en esta galería.
            </Alert>
          )}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDownloadDialogOpen(false)}>Cerrar</Button>
        <Button 
          onClick={handleDownloadSelected} 
          variant="contained" 
          color="primary"
          startIcon={<Download />}
          disabled={!gallery?.allow_download || selected.length === 0}
        >
          Descargar {selected.length} {selected.length === 1 ? 'foto' : 'fotos'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Estilos personalizados
  const DialogActions = styled(MuiDialogActions)(({ theme }) => ({
    margin: 0,
    padding: theme.spacing(1),
  }));

  if (loading && !gallery) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
        <Button variant="contained" onClick={() => window.location.reload()}>
          Reintentar
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Encabezado */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {gallery?.title || 'Galería de Fotos'}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          {gallery?.description || 'Selecciona las fotos que deseas guardar o descargar'}
        </Typography>
      </Box>

      {/* Controles */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3,
        flexWrap: 'wrap',
        gap: 2
      }}>
        <Box>
          <Typography variant="subtitle1" component="span" sx={{ mr: 2 }}>
            {selected.length} {selected.length === 1 ? 'foto seleccionada' : 'fotos seleccionadas'}
            {gallery?.selection_limit && ` (máx. ${gallery.selection_limit})`}
          </Typography>
          {selected.length > 0 && (
            <Button
              variant="outlined"
              size="small"
              onClick={() => setSelected([])}
              startIcon={<Close fontSize="small" />}
            >
              Limpiar selección
            </Button>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveSelection}
            disabled={selected.length === 0}
            startIcon={<CheckCircle />}
          >
            Guardar selección
          </Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => setDownloadDialogOpen(true)}
            disabled={selected.length === 0 || !gallery?.allow_download}
            startIcon={<Download />}
          >
            Descargar selección
          </Button>
        </Box>
      </Box>

      {/* Grid de fotos */}
      <Grid container spacing={2}>
        {photos.length === 0 ? (
          <Grid item xs={12} sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary">
              No hay fotos disponibles en esta galería
            </Typography>
          </Grid>
        ) : (
          photos.map((photo) => {
            // Determinar qué URL de imagen usar para la vista previa
            const previewUrl = (() => {
              // Si tiene permiso para ver sin marca de agua y la imagen tiene URL sin marca
              if (gallery?.allow_final_download && photo.url) {
                return photo.url.startsWith('http') 
                  ? photo.url 
                  : `${API_URL}/${photo.url.replace(/\\\\/g, '/')}`;
              }
              
              // Si no tiene permiso, usar la versión con marca de agua si existe
              if (photo.watermarked_url) {
                return photo.watermarked_url.startsWith('http')
                  ? photo.watermarked_url
                  : `${API_URL}/${photo.watermarked_url.replace(/\\\\/g, '/')}`;
              }
              
              // Si no hay versión con marca de agua, usar la original
              if (photo.url) {
                return photo.url.startsWith('http')
                  ? photo.url
                  : `${API_URL}/${photo.url.replace(/\\\\/g, '/')}`;
              }
              
              // Si no hay ninguna URL disponible
              return '';
            })();
            
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={photo.id}>
                <Card 
                  sx={{ 
                    position: 'relative',
                    cursor: 'pointer',
                    border: selected.includes(photo.id) ? '3px solid #1976d2' : '3px solid transparent',
                    transition: 'border 0.2s',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                  onClick={() => toggleSelect(photo.id)}
                >
                  {/* Imagen */}
                  <Box sx={{ 
                    position: 'relative',
                    paddingTop: '100%', // Cuadrado 1:1
                    overflow: 'hidden',
                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                  }}>
                    {previewUrl ? (
                      <CardMedia
                        component="img"
                        image={previewUrl}
                        alt={photo.filename}
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transition: 'transform 0.3s',
                          '&:hover': {
                            transform: 'scale(1.05)'
                          }
                        }}
                      />
                    ) : (
                      <Box sx={{ 
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'text.secondary'
                      }}>
                        <Typography>Imagen no disponible</Typography>
                      </Box>
                    )}
                    
                    {/* Overlay de selección */}
                    {selected.includes(photo.id) && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          backgroundColor: 'primary.main',
                          color: 'white',
                          borderRadius: '50%',
                          width: 32,
                          height: 32,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 2
                        }}
                      >
                        <CheckCircle />
                      </Box>
                    )}
                  </Box>
                  
                  {/* Acciones */}
                  <CardActions sx={{ 
                    mt: 'auto', 
                    justifyContent: 'space-between',
                    p: 1,
                    gap: 1
                  }}>
                    <Box sx={{ display: 'flex', gap: 1, flex: 1, minWidth: 0 }}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreview(photo);
                        }}
                        title="Vista previa"
                        sx={{
                          color: 'text.secondary',
                          '&:hover': {
                            backgroundColor: 'rgba(0, 0, 0, 0.04)'
                          }
                        }}
                      >
                        <ZoomIn fontSize="small" />
                      </IconButton>
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        noWrap 
                        sx={{ 
                          alignSelf: 'center',
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {photo.filename}
                      </Typography>
                    </Box>
                    <Button 
                      size="small" 
                      startIcon={<Download />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(photo);
                      }}
                      disabled={!gallery?.allow_download}
                      title={!gallery?.allow_download ? 'La descarga no está permitida' : 'Descargar'}
                      sx={{ ml: 'auto' }}
                    >
                      Descargar
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })
        )}
      </Grid>

      {/* Diálogos */}
      <DownloadDialog />
      <SaveSuccessDialog />

      {/* Diálogo de vista previa */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Vista previa</DialogTitle>
        <DialogContent>
          {currentPreview && (
            <Box sx={{ position: 'relative', pt: '100%' }}>
              <img
                src={
                  currentPreview.watermarked_url 
                    ? `${API_URL}/${currentPreview.watermarked_url.replace(/\\\\/g, '/')}`
                    : currentPreview.url
                    ? `${API_URL}/${currentPreview.url.replace(/\\\\/g, '/')}`
                    : ''
                }
                alt="Vista previa"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
                onError={(e) => {
                  // Si falla la carga con marca de agua, intentar cargar la original
                  if (currentPreview.url && currentPreview.watermarked_url) {
                    e.target.src = `${API_URL}/${currentPreview.url.replace(/\\\\/g, '/')}`;
                  }
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Cerrar</Button>
          {gallery?.allow_download && currentPreview && (
            <Button
              onClick={() => handleDownload(currentPreview)}
              variant="contained"
              color="primary"
              startIcon={<Download />}
            >
              Descargar
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Mensajes de estado */}
      <Snackbar
        open={!!message}
        autoHideDuration={6000}
        onClose={() => setMessage('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setMessage('')} severity="success" sx={{ width: '100%' }}>
          {message}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setError('')} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ClientGallery;
