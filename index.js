require('dotenv').config(); 
const express = require('express');
const axios = require('axios');
const path = require('path');

// --- Importações da Base de Dados (Do Código 1) ---
const { createNewConnection } = require('./public/BD_Info/db'); 
const generosRoutes = require('./public/routes/generos'); 

const app = express();
const PORT = 3000;

// Configurar EJS (HTML Dinâmico)
app.set('view engine', 'ejs');

// Permitir ler JSON 
app.use(express.json());

// Pasta pública para CSS/Imagens
app.use(express.static('public')); 

// --- Variáveis da API TMDB ---
const API_KEY = '27f37df6d880303b1485da2e719f78d7';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// ================= ROTAS =================

// 1. Rota da BASE DE DADOS 
app.use('/api/generos', generosRoutes); 


// 2. Rota Principal - HOME 
// Mostra a página visual com os filmes populares
app.get('/', async (req, res) => {
    try {
        const response = await axios.get(`${BASE_URL}/movie/popular?api_key=${API_KEY}&language=pt-PT`);
        const movies = response.data.results;
        
        res.render('index', { movies, imageBaseUrl: IMAGE_BASE_URL });
    } catch (error) {
        console.error("Erro API TMDB:", error.message);
        res.render('index', { movies: [], imageBaseUrl: IMAGE_BASE_URL }); // Renderiza vazio se der erro
    }
});


// 3. Rota de Pesquisa 
app.get('/search', async (req, res) => {
    const query = req.query.q;
    try {
        const response = await axios.get(`${BASE_URL}/search/movie?api_key=${API_KEY}&query=${query}&language=pt-PT`);
        const movies = response.data.results;
        res.render('index', { movies, imageBaseUrl: IMAGE_BASE_URL });
    } catch (error) {
        console.error("Erro na pesquisa:", error.message);
        res.send("Erro na pesquisa.");
    }
});

// ================= ARRANQUE =================
app.listen(PORT, () => {
    console.log(`Acede em: http://localhost:${PORT}`);
});