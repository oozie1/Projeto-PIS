require('dotenv').config();
const express = require('express');
const axios = require('axios');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { createNewConnection } = require('./public/BD_Info/db');

const authRoutes = require('./public/routes/utilizadores');
const generosRoutes = require('./public/routes/generos');
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

app.use('/api/generos', generosRoutes);
app.use('/auth', authRoutes);
app.use('/api/conteudo', conteudoRoutes);

app.get('/', async (req, res) => {
    try {
        const randomPageMovie = Math.floor(Math.random() * 50) + 1;
        const randomPageTV = Math.floor(Math.random() * 50) + 1;

        const [trendingRes, popularRes, topRatedRes, discoveryRes, discoveryTVRes, genresRes] = await Promise.all([
            axios.get(`${BASE_URL}/trending/all/week?api_key=${API_KEY}&language=pt-PT`),
            axios.get(`${BASE_URL}/movie/popular?api_key=${API_KEY}&language=pt-PT`),
            axios.get(`${BASE_URL}/movie/top_rated?api_key=${API_KEY}&language=pt-PT`),
            axios.get(`${BASE_URL}/discover/movie?api_key=${API_KEY}&language=pt-PT&sort_by=popularity.desc&page=${randomPageMovie}`),
            axios.get(`${BASE_URL}/discover/tv?api_key=${API_KEY}&language=pt-PT&sort_by=popularity.desc&page=${randomPageTV}`),
            axios.get(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=pt-PT`)
        ]);

        res.render('index', { 
            movies: [],
            trendingMovies: trendingRes.data.results,
            popularMovies: popularRes.data.results,
            topRatedMovies: topRatedRes.data.results,
            discoveryMovies: discoveryRes.data.results,
            discoveryTV: discoveryTVRes.data.results,
            genres: genresRes.data.genres,
            imageBaseUrl: IMAGE_BASE_URL,
            isSearch: false,
            selectedGenre: null
        });

    } catch (error) {
        console.error("Erro na Home:", error.message);
        res.render('index', { 
            movies: [], trendingMovies: [], popularMovies: [], topRatedMovies: [], discoveryMovies: [], discoveryTV: [], genres: [],
            imageBaseUrl: IMAGE_BASE_URL, isSearch: false, selectedGenre: null
        });
    }
});

app.get('/filter', async (req, res) => {
    const genreId = req.query.genre;
    if (!genreId) return res.redirect('/');
    try {
        const [moviesRes, genresRes] = await Promise.all([
            axios.get(`${BASE_URL}/discover/movie?api_key=${API_KEY}&language=pt-PT&with_genres=${genreId}&sort_by=popularity.desc`),
            axios.get(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=pt-PT`)
        ]);
        res.render('index', { 
            movies: moviesRes.data.results, trendingMovies: [], popularMovies: [], topRatedMovies: [], discoveryMovies: [], discoveryTV: [],
            genres: genresRes.data.genres, imageBaseUrl: IMAGE_BASE_URL, isSearch: true, selectedGenre: genreId
        });
    } catch (error) { res.redirect('/'); }
});

app.get('/search', async (req, res) => {
    const query = req.query.q;
    try {
        const [response, genresRes] = await Promise.all([
            axios.get(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${query}&language=pt-PT`),
            axios.get(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=pt-PT`)
        ]);
        const results = response.data.results.filter(i => i.media_type === 'movie' || i.media_type === 'tv');
        res.render('index', { 
            movies: results, trendingMovies: [], popularMovies: [], topRatedMovies: [], discoveryMovies: [], discoveryTV: [],
            genres: genresRes.data.genres, imageBaseUrl: IMAGE_BASE_URL, isSearch: true, selectedGenre: null
        });
    } catch (error) { res.redirect('/'); }
});

async function getDetailsAndRender(req, res, type, id) {
    try {
        const response = await axios.get(`${BASE_URL}/${type}/${id}?api_key=${API_KEY}&language=pt-PT&append_to_response=credits`);
        const movie = response.data;
        movie.media_type = type;

        let userReview = null;
        let isFavorito = false; 
        let listasUsuario = []; 

        if (req.session.user) {
            const connection = createNewConnection();
            const userId = req.session.user.id_utilizador;
            
            connection.query("SELECT r.classificacao, r.critica FROM Reviews r JOIN Conteudo c ON r.id_conteudo = c.id_conteudo WHERE c.tmdb_id = ? AND r.id_utilizador = ?", 
            [id, userId], (err, resultsReview) => {
                if (!err && resultsReview.length > 0) userReview = resultsReview[0];

                connection.query("SELECT f.id_favoritos FROM Favoritos f JOIN Conteudo c ON f.id_conteudo = c.id_conteudo WHERE c.tmdb_id = ? AND f.id_utilizador = ?", 
                [id, userId], (errFav, resultsFav) => {
                    if (!errFav && resultsFav.length > 0) isFavorito = true;

                    connection.query("SELECT * FROM Listas_Personalizadas WHERE id_utilizador = ?", [userId], (errList, resultsList) => {
                        connection.end();
                        listasUsuario = resultsList || [];
                        res.render('movies', { movie, imageBaseUrl: IMAGE_BASE_URL, userReview, isFavorito, listasUsuario });
                    });
                });
            });
        } else {
            res.render('movies', { movie, imageBaseUrl: IMAGE_BASE_URL, userReview: null, isFavorito: false, listasUsuario: [] });
        }
    } catch (error) { res.redirect('/'); }
}

app.get('/movie/:id', async (req, res) => await getDetailsAndRender(req, res, 'movie', req.params.id));
app.get('/tv/:id', async (req, res) => await getDetailsAndRender(req, res, 'tv', req.params.id));
app.get('/details/:type/:id', async (req, res) => {
    const { type, id } = req.params;
    if (type === 'movie') return res.redirect(`/movie/${id}`);
    if (type === 'tv') return res.redirect(`/tv/${id}`);
    res.redirect('/');
});

app.get('/perfil', (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');

    const connection = createNewConnection();
    const userId = req.session.user.id_utilizador;
    
    if (req.session.user.is_admin) {
        const sqlAdmin = "SELECT id_utilizador, nome_utilizador, email, is_admin FROM Utilizadores";
        connection.query(sqlAdmin, (err, results) => {
            connection.end();
            res.render('perfil', { user: req.session.user, listaUsuarios: results, favoritos: [], listas: [] });
        });
    } 
    else {
        const sqlFav = `
            SELECT c.* FROM Conteudo c
            JOIN Favoritos f ON c.id_conteudo = f.id_conteudo
            WHERE f.id_utilizador = ?`;
        
        connection.query(sqlFav, [userId], (err, favResults) => {
            const sqlListas = `SELECT * FROM Listas_Personalizadas WHERE id_utilizador = ?`;
            connection.query(sqlListas, [userId], (errList, listResults) => {
                connection.end();
                res.render('perfil', { 
                    user: req.session.user, 
                    favoritos: favResults, 
                    listaUsuarios: [], 
                    listas: listResults 
                });
            });
        });
    }
});


app.get('/perfil/lista/:id', (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    const listaId = req.params.id;
    const connection = createNewConnection();

    connection.query('SELECT nome_lista FROM Listas_Personalizadas WHERE id_lista = ?', [listaId], (err, listInfo) => {
        if (err || listInfo.length === 0) {
            connection.end();
            return res.redirect('/perfil');
        }
        const sqlFilmes = `SELECT c.* FROM Conteudo c JOIN Lista_Conteudos lc ON c.id_conteudo = lc.id_conteudo WHERE lc.id_lista = ?`;
        connection.query(sqlFilmes, [listaId], (errFilmes, filmes) => {
            connection.end();
            res.render('lista_detalhes', { 
                nomeLista: listInfo[0].nome_lista, 
                filmes: filmes || [],
                imageBaseUrl: IMAGE_BASE_URL 
            });
        });
    });
});

app.post('/api/listas/criar', (req, res) => {
    if (!req.session.user) return res.status(401).send("Faça login");
    const { nome_lista } = req.body;
    const userId = req.session.user.id_utilizador;
    const connection = createNewConnection();

    connection.query('INSERT INTO Listas_Personalizadas (id_utilizador, nome_lista) VALUES (?, ?)', 
    [userId, nome_lista], (err) => {
        connection.end();
        res.redirect('/perfil');
    });
});

app.post('/api/listas/adicionar', (req, res) => {
    if (!req.session.user) return res.status(401).send("Faça login");
    const { id_lista, tmdb_id, titulo, poster } = req.body;
    const connection = createNewConnection();

    const sqlConteudo = "INSERT IGNORE INTO Conteudo (tmdb_id, nome, poster_url, tipo) VALUES (?, ?, ?, 'filme')";
    connection.query(sqlConteudo, [tmdb_id, titulo, poster], (err) => {
        connection.query("SELECT id_conteudo FROM Conteudo WHERE tmdb_id = ?", [tmdb_id], (err, results) => {
            if (results.length > 0) {
                const id_conteudo = results[0].id_conteudo;
                connection.query("INSERT IGNORE INTO Lista_Conteudos (id_lista, id_conteudo) VALUES (?, ?)", 
                [id_lista, id_conteudo], (err) => {
                    connection.end();
                    res.redirect('/movie/' + tmdb_id);
                });
            } else {
                connection.end();
                res.redirect('/movie/' + tmdb_id);
            }
        });
    });
});

app.post('/auth/admin/create', async (req, res) => {
    if (!req.session.user || !req.session.user.is_admin) return res.status(403).send("Proibido");
    const { nome, email, senha } = req.body;
    const hash = await bcrypt.hash(senha, 10);
    const connection = createNewConnection();
    connection.query('INSERT INTO Utilizadores (nome_utilizador, email, password_hash) VALUES (?, ?, ?)', [nome, email, hash], (err) => {
        connection.end();
        res.redirect('/perfil');
    });
});

app.post('/auth/admin/delete/:id', (req, res) => {
    if (!req.session.user || !req.session.user.is_admin) return res.status(403).send("Acesso negado");
    const userId = req.params.id;
    const connection = createNewConnection();
    connection.query("DELETE FROM Favoritos WHERE id_utilizador = ?", [userId], () => {
        connection.query("DELETE FROM Reviews WHERE id_utilizador = ?", [userId], () => {
            connection.query("DELETE FROM Utilizadores WHERE id_utilizador = ?", [userId], (err) => {
                connection.end();
                res.redirect('/perfil');
            });
        });
    });
});

app.post('/auth/admin/update-full/:id', (req, res) => {
    if (!req.session.user || !req.session.user.is_admin) return res.status(403).send("Proibido");
    const { novoNome, status } = req.body;
    const id = req.params.id;
    const connection = createNewConnection();
    const sql = 'UPDATE Utilizadores SET nome_utilizador = ?, is_admin = ? WHERE id_utilizador = ?';
    connection.query(sql, [novoNome, status, id], (err) => {
        connection.end();
        res.redirect('/perfil');
    });
});

app.listen(PORT, () => {
    console.log(`Servidor a correr na porta ${PORT}`);
    console.log(`Acede em: http://localhost:${PORT}`);
});