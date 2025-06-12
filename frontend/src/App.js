import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import WatermarkConfig from './pages/WatermarkConfig';
import GalleryManager from './pages/GalleryManager';
import ClientGallery from './pages/ClientGallery';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/watermark" element={<WatermarkConfig />} />
        <Route path="/gallery/:id" element={<GalleryManager />} />
        <Route path="/view/:link" element={<ClientGallery />} />
      </Routes>
    </Router>
  );
}

export default App;
