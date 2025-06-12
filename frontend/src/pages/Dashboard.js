import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Button, 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  TextField, 
  IconButton, 
  Snackbar, 
  Alert as MuiAlert,
  Grid,
  CardActions
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
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

  const [message, setMessage] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const showMessage = (message, severity = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showMessage('¡Enlace copiado al portapeles!');
  };

  const getGalleryUrl = (link) => {
    const url = new URL(window.location.href);
    url.port = '3000';
    url.pathname = `/view/${link}`;
    return url.toString();
  };

  return (
    <Box sx={{ p: 4, maxWidth: 1000, margin: '0 auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">Galerías del Fotógrafo</Typography>
        <Button component={Link} to="/watermark" variant="outlined">
          Configurar Marca de Agua
        </Button>
      </Box>

      <Card sx={{ mb: 4, p: 3 }}>
        <Typography variant="h5" gutterBottom>Crear Nueva Galería</Typography>
        <Box component="form" onSubmit={handleCreateGallery} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <TextField
            label="Título de la galería"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            size="small"
            sx={{ flex: 1 }}
          />
          <TextField
            label="Límite de selección"
            type="number"
            value={selectionLimit}
            onChange={e => setSelectionLimit(Number(e.target.value))}
            required
            size="small"
            inputProps={{ min: 1, max: 100 }}
            sx={{ width: 150 }}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={creating}
            sx={{ height: 40 }}
          >
            {creating ? 'Creando...' : 'Crear Galería'}
          </Button>
          {formError && (
            <Typography color="error" sx={{ mt: 1, width: '100%' }}>
              {formError}
            </Typography>
          )}
        </Box>
      </Card>

      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>Mis Galerías</Typography>

      {loading ? (
        <Typography>Cargando galerías...</Typography>
      ) : error ? (
        <Typography color="error">Error al cargar las galerías: {error}</Typography>
      ) : galleries.length === 0 ? (
        <Card sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1">No hay galerías creadas aún.</Typography>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {galleries.map(gallery => (
            <Grid item xs={12} md={6} key={gallery.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" gutterBottom>{gallery.title}</Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Creada el: {new Date(gallery.created_at).toLocaleDateString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Límite de selección: {gallery.selection_limit} fotos
                  </Typography>

                  <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>Enlace de la galería:</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <TextField
                        value={getGalleryUrl(gallery.link)}
                        size="small"
                        fullWidth
                        InputProps={{
                          readOnly: true,
                          sx: { fontSize: '0.875rem' }
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => copyToClipboard(getGalleryUrl(gallery.link))}
                        title="Copiar enlace"
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => window.open(getGalleryUrl(gallery.link), '_blank')}
                        title="Abrir galería"
                      >
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button
                    component={Link}
                    to={`/gallery/${gallery.id}`}
                    size="small"
                    variant="outlined"
                    fullWidth
                  >
                    Administrar Galería
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <MuiAlert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </MuiAlert>
      </Snackbar>
    </Box>
  );
};

export default Dashboard;
