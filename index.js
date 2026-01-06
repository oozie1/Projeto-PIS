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
        const [trendingReq, popularReq, topRatedReq, discoveryReq] = await Promise.all([
            axios.get(`${BASE_URL}/trending/movie/day?api_key=${API_KEY}&language=pt-PT`),
            axios.get(`${BASE_URL}/movie/popular?api_key=${API_KEY}&language=pt-PT`),
            axios.get(`${BASE_URL}/movie/top_rated?api_key=${API_KEY}&language=pt-PT`),
            axios.get(`${BASE_URL}/discover/movie?api_key=${API_KEY}&language=pt-PT&sort_by=popularity.desc&include_adult=false&page=2`)
        ]);

        res.render('index', { 
            trendingMovies: trendingReq.data.results,
            popularMovies: popularReq.data.results,
            topRatedMovies: topRatedReq.data.results,
            discoveryMovies: discoveryReq.data.results, 
            imageBaseUrl: IMAGE_BASE_URL,
            movies: [] 
        });

    } catch (error) {
        console.error("Erro API TMDB na Home:", error.message);
        res.render('index', { 
            trendingMovies: [], 
            popularMovies: [], 
            topRatedMovies: [], 
            discoveryMovies: [], 
            imageBaseUrl: IMAGE_BASE_URL, 
            movies: [] 
        });
    }
});


app.get('/search', async (req, res) => {
    const query = req.query.q;
    try {
        const response = await axios.get(`${BASE_URL}/search/movie?api_key=${API_KEY}&query=${query}&language=pt-PT`);
        
        res.render('index', { 
            movies: response.data.results,
            imageBaseUrl: IMAGE_BASE_URL,
            trendingMovies: [], popularMovies: [], topRatedMovies: [], discoveryMovies: []
        });

    } catch (error) {
        console.error("Erro na Pesquisa:", error.message);
        res.redirect('/'); 
    }
});


app.get('/movie/:id', async (req, res) => {
    const movieId = req.params.id;

    try {
        const response = await axios.get(`${BASE_URL}/movie/${movieId}?api_key=${API_KEY}&language=pt-PT&append_to_response=credits`);
        const movie = response.data;
        
        let userReview = null;
        let isFavorito = false; 

        if (req.session.user) {
            const connection = createNewConnection();
            connection.connect();
            const userId = req.session.user.id_utilizador;

            const sqlReview = `
                SELECT r.classificacao, r.critica 
                FROM Reviews r
                JOIN Conteudo c ON r.id_conteudo = c.id_conteudo
                WHERE c.tmdb_id = ? AND r.id_utilizador = ?
            `;

            connection.query(sqlReview, [movieId, userId], (err, resultsReview) => {
                if (!err && resultsReview.length > 0) {
                    userReview = resultsReview[0];
                }

                const sqlFav = `
                    SELECT f.id_favoritos 
                    FROM Favoritos f
                    JOIN Conteudo c ON f.id_conteudo = c.id_conteudo
                    WHERE c.tmdb_id = ? AND f.id_utilizador = ?
                `;

                connection.query(sqlFav, [movieId, userId], (errFav, resultsFav) => {
                    connection.end(); 

                    if (!errFav && resultsFav.length > 0) {
                        isFavorito = true;
                    }

                    res.render('movies', { 
                        movie, 
                        imageBaseUrl: IMAGE_BASE_URL,
                        userReview: userReview,
                        isFavorito: isFavorito
                    });
                });
            });

        } else {
            res.render('movies', { 
                movie, 
                imageBaseUrl: IMAGE_BASE_URL,
                userReview: null,
                isFavorito: false
            });
        }

    } catch (error) {
        console.error("Erro detalhes filme:", error.message);
        res.redirect('/');
    }
});


app.get('/perfil', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }

    const connection = createNewConnection();
    connection.connect();


    const sql = `
        SELECT c.id_conteudo, c.nome, c.poster_url, c.tmdb_id
        FROM Favoritos f
        JOIN Conteudo c ON f.id_conteudo = c.id_conteudo
        WHERE f.id_utilizador = ?
    `;

    connection.query(sql, [req.session.user.id_utilizador], (err, results) => {
        connection.end();

        if (err) {
            console.error("Erro ao buscar favoritos:", err);
            return res.render('perfil', { 
                user: req.session.user, 
                favoritos: [] 
            });
        }

        res.render('perfil', { 
            user: req.session.user, 
            favoritos: results 
        });
    });
});


app.listen(PORT, () => {
    console.log(`Servidor a correr na porta ${PORT}`);
    console.log(`Acede em: http://localhost:${PORT}`);
});