import React, { useRef, useState, useEffect } from 'react';
import Grid from '@mui/material/Grid';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';

const defaultConfig = {
  positions: [{ x: 50, y: 50 }],
  width: 100,
  height: 100,
  opacity: 0.5,
  repeat: 1,
};

const WatermarkConfig = () => {
  const [watermarkFile, setWatermarkFile] = useState(null);
  const [watermarkUrl, setWatermarkUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(defaultConfig);
  const [selected, setSelected] = useState(0);
  const previewRef = useRef();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const previewImg = useRef();
  const [showAdvanced, setShowAdvanced] = useState(false);
  

  // Cargar configuración existente
  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const res = await fetch('http://localhost:4000/watermarks/admin');
        if (!res.ok) throw new Error('No hay marca de agua configurada');
        const data = await res.json();
        // Si hay config previa, precarga controles y preview
        if (data.config) {
          setConfig({
            positions: data.config.positions || [{ x: 50, y: 50 }],
            width: data.config.size?.width || data.config.width || 100,
            height: data.config.size?.height || data.config.height || 100,
            opacity: data.config.opacity ?? 0.5,
            repeat: data.config.repeat || (data.config.positions ? data.config.positions.length : 1),
            fitWidthCenter: data.config.fitWidthCenter || false,
            fillPattern: data.config.fillPattern || false,
            patternCount: data.config.patternCount || 6,
          });
        }
        if (data.image_url) {
          setWatermarkUrl(data.image_url);
        }
      } catch (err) {
        // Si no hay config previa, se deja default
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
    // eslint-disable-next-line
  }, []);

  // Imagen de ejemplo para previsualización
  const sampleImage = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&q=80';

  const handleWatermarkChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setWatermarkFile(file);
      setWatermarkUrl(URL.createObjectURL(file));
    }
  };

  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    if (name === 'repeat') {
      const newRepeat = Math.max(1, Number(value));
      setConfig((prev) => {
        const newPositions = [...prev.positions];
        while (newPositions.length < newRepeat) newPositions.push({ x: 50, y: 50 });
        while (newPositions.length > newRepeat) newPositions.pop();
        return { ...prev, repeat: newRepeat, positions: newPositions };
      });
      setSelected(0);
    } else if (name === 'x' || name === 'y') {
      setConfig((prev) => {
        const newPositions = [...prev.positions];
        newPositions[selected] = {
          ...newPositions[selected],
          [name]: Number(value)
        };
        return { ...prev, positions: newPositions };
      });
    } else {
      setConfig((prev) => ({ ...prev, [name]: Number(value) }));
    }
  };

  const handleOpacityChange = (e) => {
    setConfig((prev) => ({ ...prev, opacity: Number(e.target.value) }));
  };

  // Drag & drop
const handleMouseDown = (idx, e) => {
  e.preventDefault();
  setSelected(idx);
  const rect = previewRef.current.getBoundingClientRect();
  const startX = e.clientX;
  const startY = e.clientY;
  const origX = config.positions[idx].x;
  const origY = config.positions[idx].y;
  function onMove(ev) {
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    setConfig(prev => {
      const newPositions = [...prev.positions];
      newPositions[idx] = {
        ...newPositions[idx],
        x: Math.max(0, Math.min(300 - prev.width, origX + dx)),
        y: Math.max(0, Math.min(200 - prev.height, origY + dy)),
      };
      return { ...prev, positions: newPositions };
    });
  }
  function onUp() {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  }
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
};

const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      // Si hay imagen nueva, POST /watermarks/upload
      if (watermarkFile) {
        const formData = new FormData();
        formData.append('owner', 'admin');
        formData.append('config', JSON.stringify({
          positions: config.positions,
          size: { width: config.width, height: config.height },
          opacity: config.opacity,
          repeat: config.repeat,
          fitWidthCenter: config.fitWidthCenter || false,
          fillPattern: config.fillPattern || false,
          patternCount: config.patternCount || 6,
        }));
        formData.append('image', watermarkFile);
        const res = await fetch('http://localhost:4000/watermarks/upload', {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) throw new Error('Error al guardar la marca de agua');
        setMessage('¡Configuración guardada!');
      } else {
        // Si no hay imagen nueva, PUT solo config
        const res = await fetch('http://localhost:4000/watermarks/admin/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config: JSON.stringify({
              positions: config.positions,
              size: { width: config.width, height: config.height },
              opacity: config.opacity,
              repeat: config.repeat,
              fitWidthCenter: config.fitWidthCenter || false,
              fillPattern: config.fillPattern || false,
              patternCount: config.patternCount || 6,
            })
          })
        });
        if (!res.ok) throw new Error('Error al guardar solo la configuración');
        setMessage('¡Configuración guardada!');
      }
    } catch (err) {
      setError('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  // Render previsualización
  const renderPreview = () => (
  <div
    ref={previewRef}
    style={{ position: 'relative', width: 300, height: 200, border: '1px solid #ccc', margin: '16px 0', background: '#eee', overflow: 'hidden' }}
  >
    <img
      ref={previewImg}
      src={sampleImage}
      alt="preview"
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
    />
    {watermarkUrl && config.positions.map((pos, i) => (
      <img
        key={i}
        src={watermarkUrl}
        alt={`marca de agua ${i + 1}`}
        style={{
          position: 'absolute',
          left: pos.x,
          top: pos.y,
          width: config.width,
          height: config.height,
          opacity: config.opacity,
          cursor: 'move',
          zIndex: selected === i ? 2 : 1,
          outline: selected === i ? '2px solid #1976d2' : 'none',
          boxShadow: selected === i ? '0 0 6px #1976d2' : undefined,
          filter: 'drop-shadow(0 0 2px #fff8)'
        }}
        onMouseDown={e => handleMouseDown(i, e)}
        onClick={() => setSelected(i)}
        draggable={false}
      />
    ))}
  </div>
);

  

  if (loading) return <div style={{ padding: 32 }}>Cargando configuración...</div>;

  return (
    <div style={{ padding: 32, maxWidth: 400 }}>
      <h1>Configuración de Marca de Agua</h1>
      <form onSubmit={handleSave}>
        <div style={{ marginBottom: 12 }}>
          <label>
            Imagen de marca de agua:
            <input type="file" accept="image/*" onChange={handleWatermarkChange} />
          </label>
        </div>
        <button
          type="button"
          style={{ marginBottom: 16, background: '#1976d2', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer' }}
          onClick={() => setShowAdvanced(v => !v)}
        >
          {showAdvanced ? 'Ocultar controles avanzados' : 'Mostrar controles avanzados'}
        </button>
        {showAdvanced && (
          <React.Fragment>
            <div style={{ marginBottom: 12 }}>
              <Grid item xs={12}>
                <TextField
                  label="Ancho (px)"
                  type="number"
                  value={config.width}
                  onChange={e => setConfig({ ...config, width: parseInt(e.target.value) })}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={config.fitWidthCenter || false}
                      onChange={e => setConfig({ ...config, fitWidthCenter: e.target.checked, fillPattern: false })}
                      color="primary"
                      disabled={config.fillPattern}
                    />
                  }
                  label="Adaptar marca de agua horizontalmente al centro de la foto"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={config.fillPattern || false}
                      onChange={e => setConfig({ ...config, fillPattern: e.target.checked, fitWidthCenter: false })}
                      color="primary"
                    />
                  }
                  label="Llenar imagen con varias marcas de agua pequeñas"
                />
              </Grid>
              {config.fillPattern && (
                <Grid item xs={12}>
                  <TextField
                    label="Cantidad de repeticiones (total)"
                    type="number"
                    value={config.patternCount || 6}
                    onChange={e => setConfig({ ...config, patternCount: parseInt(e.target.value) })}
                    fullWidth
                  />
                </Grid>
              )}
            </div>
            <div style={{ marginBottom: 12 }}>
              <label>
                Marca seleccionada:
                <select value={selected} onChange={e => setSelected(Number(e.target.value))} style={{ marginLeft: 8 }}>
                  {config.positions.map((_, i) => (
                    <option key={i} value={i}>Marca #{i + 1}</option>
                  ))}
                </select>
              </label>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label>
                Posición X:
                <input type="number" name="x" min="0" max="300" value={config.positions[selected]?.x ?? 0} onChange={handleConfigChange} style={{ width: 60, marginLeft: 8 }} />
              </label>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label>
                Posición Y:
                <input type="number" name="y" min="0" max="200" value={config.positions[selected]?.y ?? 0} onChange={handleConfigChange} style={{ width: 60, marginLeft: 8 }} />
              </label>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label>
                Ancho:
                <input type="number" name="width" min="10" max="300" value={config.width} onChange={handleConfigChange} style={{ width: 60, marginLeft: 8 }} />
              </label>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label>
                Alto:
                <input type="number" name="height" min="10" max="200" value={config.height} onChange={handleConfigChange} style={{ width: 60, marginLeft: 8 }} />
              </label>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label>
                Opacidad:
                <input type="range" name="opacity" min="0" max="1" step="0.01" value={config.opacity} onChange={handleOpacityChange} style={{ width: 120, marginLeft: 8 }} />
                <span style={{ marginLeft: 8 }}>{config.opacity}</span>
              </label>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label>
                Repeticiones:
                <input type="number" name="repeat" min="1" max="10" value={config.repeat} onChange={handleConfigChange} style={{ width: 60, marginLeft: 8 }} />
              </label>
            </div>
          </React.Fragment>
        )}
        <button type="submit" disabled={saving} style={{ marginTop: 12 }}>
          {saving ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </form>
      {message && <p style={{ color: 'green' }}>{message}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <h3>Previsualización</h3>
      {renderPreview()}
    </div>
  );
}


export default WatermarkConfig;
