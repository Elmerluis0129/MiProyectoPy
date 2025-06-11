import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import WatermarkConfig from './pages/WatermarkConfig';
import GalleryManager from './pages/GalleryManager';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/watermark" element={<WatermarkConfig />} />
        <Route path="/gallery/:id" element={<GalleryManager />} />
      </Routes>
    </Router>
  );
}

export default App;
