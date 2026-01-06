require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const session = require('express-session');

const { createNewConnection } = require('./public/BD_Info/db'); 

const authRoutes = require('./public/routes/utilizadores');
const conteudoRoutes = require('./public/routes/conteudo');

const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');
app.use(express.static('public'));

const API_KEY = '27f37df6d880303b1485da2e719f78d7';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

app.use(session({
    secret: '123',
    resave: false,
    saveUninitialized: true
}));

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

app.use('/auth', authRoutes);
app.use('/api/conteudo', conteudoRoutes);

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

app.get('/movie/:id', async (req, res) => {
    const movieId = req.params.id;

    try {
        // 1. get dados do filme à API 
        const response = await axios.get(`${BASE_URL}/movie/${movieId}?api_key=${API_KEY}&language=pt-PT&append_to_response=credits`);
        const movie = response.data;
        
        // 2. Preparar variável da review (começa vazia)
        let userReview = null;

        // 3. Verificar se o user está logado
        if (req.session.user) {
            const connection = createNewConnection();
            connection.connect();

            // SQL: Procura review na tabela Reviews ligando com Conteudo pelo tmdb_id
            const sql = `
                SELECT r.classificacao, r.critica 
                FROM Reviews r
                JOIN Conteudo c ON r.id_conteudo = c.id_conteudo
                WHERE c.tmdb_id = ? AND r.id_utilizador = ?
            `;

            connection.query(sql, [movieId, req.session.user.id_utilizador], (err, results) => {
                connection.end(); 

                if (!err && results.length > 0) {
                    userReview = results[0]; // Guarda a review encontrada
                }

                // 4A. Renderiza a página JÁ com a review (se existir)
                res.render('movies', { 
                    movie, 
                    imageBaseUrl: IMAGE_BASE_URL,
                    userReview: userReview // Enviamos a review para o HTML
                });
            });

        } else {
            // 4B. Se não estiver logado, renderiza sem review
            res.render('movies', { 
                movie, 
                imageBaseUrl: IMAGE_BASE_URL,
                userReview: null 
            });
        }

    } catch (error) {
        console.error("Erro detalhes:", error.message);
        res.redirect('/');
    }
});

app.get('/search', async (req, res) => {
    const query = req.query.q;
    try {
        const response = await axios.get(`${BASE_URL}/search/movie?api_key=${API_KEY}&query=${query}&language=pt-PT`);
        const movies = response.data.results;
        res.render('index', { movies, imageBaseUrl: IMAGE_BASE_URL });
    } catch (error) {
        console.error("Erro pesquisa:", error.message);
        res.send("Erro na pesquisa.");
    }
});

app.listen(PORT, () => {
    console.log(`Servidor a correr na porta ${PORT}`);
    console.log(`Acede em: http://localhost:${PORT}`);
});