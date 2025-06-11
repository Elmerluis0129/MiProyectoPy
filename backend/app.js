import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

const app = express();

// Configuración mejorada de CORS
const corsOptions = {
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Manejar preflight para todas las rutas
app.options('*', cors(corsOptions));

// Servir archivos estáticos de uploads
import path from 'path';
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

import galleryRoutes from './routes/galleryRoutes.js';
import photoRoutes from './routes/photoRoutes.js';
import watermarkRoutes from './routes/watermarkRoutes.js';

app.use('/galleries', galleryRoutes);
app.use('/photos', photoRoutes);
app.use('/watermarks', watermarkRoutes);

app.get('/', (req, res) => {
  res.send('Pixieset Personalizado Backend funcionando');
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en puerto ${PORT}`);
});
