const axios = require('axios');
const { createNewConnection } = require('../public/BD_Info/db');

const API_KEY = '27f37df6d880303b1485da2e719f78d7';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

async function getDetailsAndRender(req, res, type, id) {
    try {
        const response = await axios.get(`${BASE_URL}/${type}/${id}?api_key=${API_KEY}&language=pt-PT&append_to_response=credits`);
        const movie = response.data;
        movie.media_type = type;

        let userReview = null;
        let isFavorito = false; 
        let isVisto = false;
        let listasUsuario = []; 
        let publicReviews = [];

        const origin = req.query.origin || null;

        const connection = createNewConnection();

        const sqlPublicReviews = `
            SELECT r.classificacao, r.critica, u.nome_utilizador 
            FROM Reviews r 
            JOIN Conteudo c ON r.id_conteudo = c.id_conteudo 
            JOIN Utilizadores u ON r.id_utilizador = u.id_utilizador 
            WHERE c.tmdb_id = ? 
            ORDER BY r.id_review DESC`; 

        connection.query(sqlPublicReviews, [id], (errPub, resultsPub) => {
            publicReviews = resultsPub || [];

            if (req.session.user) {
                const userId = req.session.user.id_utilizador;
                
                const sqlReview = "SELECT r.classificacao, r.critica FROM Reviews r JOIN Conteudo c ON r.id_conteudo = c.id_conteudo WHERE c.tmdb_id = ? AND r.id_utilizador = ?";
                
                connection.query(sqlReview, [id, userId], (err, resultsReview) => {
                    if (!err && resultsReview.length > 0) userReview = resultsReview[0];

                    const sqlFav = "SELECT count(*) as total FROM Favoritos f JOIN Conteudo c ON f.id_conteudo = c.id_conteudo WHERE c.tmdb_id = ? AND f.id_utilizador = ?";
                    
                    connection.query(sqlFav, [id, userId], (errFav, resultsFav) => {
                        if (!errFav && resultsFav[0].total > 0) {
                            isFavorito = true; 
                        }

                        const sqlVisto = "SELECT count(*) as total FROM Vistos v JOIN Conteudo c ON v.id_conteudo = c.id_conteudo WHERE c.tmdb_id = ? AND v.id_utilizador = ?";
                        connection.query(sqlVisto, [id, userId], (errVisto, resultsVisto) => {
                            if (!errVisto && resultsVisto[0].total > 0) {
                                isVisto = true;
                            }

                            const sqlListas = "SELECT * FROM Listas_Personalizadas WHERE id_utilizador = ?";
                            connection.query(sqlListas, [userId], (errList, resultsList) => {
                                listasUsuario = resultsList || [];
                                connection.end();
                                
                                res.render('movies', { 
                                    movie, imageBaseUrl: IMAGE_BASE_URL, 
                                    userReview, isFavorito, isVisto,
                                    listasUsuario, publicReviews,
                                    origin
                                });
                            });
                        });
                    });
                });
            } else {
                connection.end();
                res.render('movies', { 
                    movie, imageBaseUrl: IMAGE_BASE_URL, 
                    userReview: null, isFavorito: false, isVisto: false, listasUsuario: [], 
                    publicReviews, origin
                });
            }
        });

    } catch (error) {
        console.error(error);
        res.redirect('/');
    }
}

exports.getHome = async (req, res) => {
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
            selectedGenre: null,
            randomPageMovie: randomPageMovie,
            randomPageTV: randomPageTV
        });

    } catch (error) {
        console.error("Erro na Home:", error.message);
        res.render('index', { 
            movies: [], trendingMovies: [], popularMovies: [], topRatedMovies: [], discoveryMovies: [], discoveryTV: [], genres: [],
            imageBaseUrl: IMAGE_BASE_URL, isSearch: false, selectedGenre: null
        });
    }
};

exports.getFilter = async (req, res) => {
    const genreId = req.query.genre;
    if (!genreId) return res.redirect('/');
    
    try {
        const [moviesRes, genresRes] = await Promise.all([
            axios.get(`${BASE_URL}/discover/movie?api_key=${API_KEY}&language=pt-PT&with_genres=${genreId}&sort_by=popularity.desc`),
            axios.get(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=pt-PT`)
        ]);

        res.render('index', { 
            movies: moviesRes.data.results,
            trendingMovies: [], popularMovies: [], topRatedMovies: [], discoveryMovies: [], discoveryTV: [],
            genres: genresRes.data.genres,
            imageBaseUrl: IMAGE_BASE_URL,
            isSearch: true,
            selectedGenre: genreId
        });
    } catch (error) {
        res.redirect('/');
    }
};

exports.getSearch = async (req, res) => {
    const query = req.query.q;
    if (!query || query.trim().length === 0) {
        return res.redirect('/');
    }
    try {
        const [response, genresRes] = await Promise.all([
            axios.get(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${query}&language=pt-PT`),
            axios.get(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=pt-PT`)
        ]);

        const results = response.data.results.filter(i => i.media_type === 'movie' || i.media_type === 'tv');

        res.render('index', { 
            movies: results,
            trendingMovies: [], popularMovies: [], topRatedMovies: [], discoveryMovies: [], discoveryTV: [],
            genres: genresRes.data.genres,
            imageBaseUrl: IMAGE_BASE_URL,
            isSearch: true,
            selectedGenre: null
        });
    } catch (error) {
        res.redirect('/');
    }
};

exports.getMovie = async (req, res) => {
    await getDetailsAndRender(req, res, 'movie', req.params.id);
};

exports.getTV = async (req, res) => {
    await getDetailsAndRender(req, res, 'tv', req.params.id);
};

exports.redirectDetails = (req, res) => {
    const { type, id } = req.params;
    const origin = req.query.origin;
    
    let destination = '/';

    if (type === 'movie') destination = `/movie/${id}`;
    if (type === 'tv') destination = `/tv/${id}`;

    if (origin) {
        destination += `?origin=${origin}`;
    }

    res.redirect(destination);
};

exports.loadMore = async (req, res) => {
    const { type, page } = req.query;
    let url = '';

    switch(type) {
        case 'trending': url = `${BASE_URL}/trending/all/week?api_key=${API_KEY}&language=pt-PT&page=${page}`; break;
        case 'popular': url = `${BASE_URL}/movie/popular?api_key=${API_KEY}&language=pt-PT&page=${page}`; break;
        case 'top_rated': url = `${BASE_URL}/movie/top_rated?api_key=${API_KEY}&language=pt-PT&page=${page}`; break;
        case 'discover_movie': url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=pt-PT&sort_by=popularity.desc&page=${page}`; break;
        case 'discover_tv': url = `${BASE_URL}/discover/tv?api_key=${API_KEY}&language=pt-PT&sort_by=popularity.desc&page=${page}`; break;
        default: return res.json({ results: [] });
    }

    try {
        const response = await axios.get(url);
        const results = response.data.results.map(item => ({
            id: item.id,
            title: item.title || item.name,
            poster_path: item.poster_path,
            vote_average: item.vote_average ? item.vote_average.toFixed(1) : 'N/A',
            media_type: item.media_type || (type.includes('tv') ? 'tv' : 'movie')
        }));
        res.json({ results });
    } catch (error) {
        res.json({ results: [] });
    }
};