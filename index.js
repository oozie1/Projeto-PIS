require('dotenv').config(); 
const express = require('express');
const axios = require('axios');
const path = require('path');

// --- IMPORTAÇÕES LOCAIS ---
const authRoutes = require('./public/routes/utilizadores');
const generosRoutes = require('./public/routes/generos'); 
// Nota: removi a importação do 'db' aqui porque não a estavas a usar neste ficheiro,
// ela só é precisa dentro dos ficheiros de rotas.

const app = express();
const PORT = 3000;

// --- CONFIGURAÇÕES ---
app.use(express.urlencoded({ extended: true })); // Para ler formulários
app.use(express.json()); // Para ler JSON
app.set('view engine', 'ejs'); // Motor gráfico
app.use(express.static('public')); // Ficheiros estáticos

// --- Variáveis da API TMDB ---
const API_KEY = '27f37df6d880303b1485da2e719f78d7';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// ================= ROTAS =================

// 1. Rotas de Backend (Base de Dados e Autenticação)
app.use('/api/generos', generosRoutes); 
app.use('/auth', authRoutes);

// 2. Rota Principal - HOME 
app.get('/', async (req, res) => {
    try {
        const response = await axios.get(`${BASE_URL}/movie/popular?api_key=${API_KEY}&language=pt-PT`);
        const movies = response.data.results;
        
        res.render('index', { movies, imageBaseUrl: IMAGE_BASE_URL });
    } catch (error) {
        console.error("Erro API TMDB:", error.message);
        res.render('index', { movies: [], imageBaseUrl: IMAGE_BASE_URL });
    }
});

// 3. Rota de Detalhes do Filme (ESTAVA EM FALTA!)
app.get('/movie/:id', async (req, res) => {
    const movieId = req.params.id; 
    try {
        const response = await axios.get(`${BASE_URL}/movie/${movieId}?api_key=${API_KEY}&language=pt-PT&append_to_response=credits`);
        const movie = response.data;

        res.render('movie', { movie, imageBaseUrl: IMAGE_BASE_URL });
    } catch (error) {
        console.error("Erro ao buscar detalhes:", error.message);
        res.redirect('/'); 
    }
});

// 4. Rota de Pesquisa 
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
    console.log(`Servidor a correr na porta ${PORT}`);
    console.log(`Acede em: http://localhost:${PORT}`);
});