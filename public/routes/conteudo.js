const express = require('express');
const router = express.Router();
const { createNewConnection } = require('../BD_Info/db');

function checkAuth(req, res, next) {
    if (!req.session.user) {
        return res.status(401).send("Tens de fazer login primeiro!");
    }
    next();
}

router.post('/favoritos', checkAuth, (req, res) => {
    const { tmdb_id, titulo, poster, tipo } = req.body;
    const id_utilizador = req.session.user.id_utilizador;

    const connection = createNewConnection();
    connection.connect();

    const checkSql = 'SELECT id_conteudo FROM Conteudo WHERE tmdb_id = ?';
    
    connection.query(checkSql, [tmdb_id], (err, results) => {
        if (err) { 
            connection.end(); 
            return res.send("Erro BD ao verificar filme"); 
        }

        const insertFavorito = (idCont) => {
            const favSql = 'INSERT INTO Favoritos (id_utilizador, id_conteudo) VALUES (?, ?)';
            connection.query(favSql, [id_utilizador, idCont], (err, result) => {
                connection.end();
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') return res.send("<script>alert('Já tinhas este favorito!'); window.history.back();</script>");
                    return res.send("Erro ao adicionar favorito.");
                }
                res.send("<script>alert('Adicionado aos favoritos!'); window.history.back();</script>");
            });
        };

        if (results.length > 0) {
            insertFavorito(results[0].id_conteudo);
        } else {
            const insertMovieSql = 'INSERT INTO Conteudo (tipo, nome, poster_url, tmdb_id) VALUES (?, ?, ?, ?)';
            connection.query(insertMovieSql, [tipo, titulo, poster, tmdb_id], (err, result) => {
                if (err) { 
                    connection.end(); 
                    return res.send("Erro ao importar filme."); 
                }
                insertFavorito(result.insertId);
            });
        }
    });
});

router.post('/review', checkAuth, (req, res) => {
    const { tmdb_id, titulo, poster, tipo, classificacao, critica } = req.body;
    const id_utilizador = req.session.user.id_utilizador;

    const connection = createNewConnection();
    connection.connect();

    const checkSql = 'SELECT id_conteudo FROM Conteudo WHERE tmdb_id = ?';

    connection.query(checkSql, [tmdb_id], (err, results) => {
        if (err) {
            connection.end();
            return res.send("Erro BD ao verificar filme");
        }

        const insertReview = (idCont) => {
            const reviewSql = 'INSERT INTO Reviews (id_utilizador, id_conteudo, classificacao, critica) VALUES (?, ?, ?, ?)';
            connection.query(reviewSql, [id_utilizador, idCont, classificacao, critica], (err, result) => {
                connection.end();
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') {
                        return res.send("<script>alert('Já fizeste uma review a este filme!'); window.history.back();</script>");
                    }
                    return res.send("Erro ao adicionar review.");
                }
                res.send("<script>alert('Review adicionada com sucesso!'); window.history.back();</script>");
            });
        };

        if (results.length > 0) {
            insertReview(results[0].id_conteudo);
        } else {
            const insertMovieSql = 'INSERT INTO Conteudo (tipo, nome, poster_url, tmdb_id) VALUES (?, ?, ?, ?)';
            connection.query(insertMovieSql, [tipo, titulo, poster, tmdb_id], (err, result) => {
                if (err) {
                    connection.end();
                    return res.send("Erro ao importar filme para review.");
                }
                insertReview(result.insertId);
            });
        }
    });
});

module.exports = router;