const express = require('express');
const router = express.Router();
const { createNewConnection } = require('../BD_Info/db');

function redirectWithStatus(res, url, status) {
    const separator = url.includes('?') ? '&' : '?';
    res.redirect(url + separator + 'status=' + status);
}

router.post('/favoritos', (req, res) => {
    if (!req.session.user) return res.status(401).send("Faça login");
    
    const { tmdb_id, titulo, poster, tipo } = req.body;
    const userId = req.session.user.id_utilizador;
    const connection = createNewConnection();
    const previousPage = req.header('Referer') || '/';

    const sqlConteudo = "INSERT IGNORE INTO Conteudo (tmdb_id, nome, poster_url, tipo) VALUES (?, ?, ?, ?)";
    connection.query(sqlConteudo, [tmdb_id, titulo, poster, tipo || 'filme'], (err) => {
        connection.query("SELECT id_conteudo FROM Conteudo WHERE tmdb_id = ?", [tmdb_id], (err, results) => {
            if (results.length > 0) {
                const id_conteudo = results[0].id_conteudo;

                connection.query("SELECT * FROM Favoritos WHERE id_utilizador = ? AND id_conteudo = ?", [userId, id_conteudo], (err, favs) => {
                    if (favs.length > 0) {
                        connection.query("DELETE FROM Favoritos WHERE id_utilizador = ? AND id_conteudo = ?", [userId, id_conteudo], () => {
                            connection.end();
                            redirectWithStatus(res, previousPage, 'fav_removed');
                        });
                    } else {
                        connection.query("INSERT INTO Favoritos (id_utilizador, id_conteudo) VALUES (?, ?)", [userId, id_conteudo], () => {
                            connection.end();
                            redirectWithStatus(res, previousPage, 'fav_added');
                        });
                    }
                });
            } else {
                connection.end();
                res.redirect(previousPage);
            }
        });
    });
});

router.post('/vistos', (req, res) => {
    if (!req.session.user) return res.status(401).send("Faça login");
    
    const { tmdb_id, titulo, poster, tipo } = req.body;
    const userId = req.session.user.id_utilizador;
    const connection = createNewConnection();
    const previousPage = req.header('Referer') || '/';

    const sqlConteudo = "INSERT IGNORE INTO Conteudo (tmdb_id, nome, poster_url, tipo) VALUES (?, ?, ?, ?)";
    connection.query(sqlConteudo, [tmdb_id, titulo, poster, tipo || 'filme'], (err) => {
        connection.query("SELECT id_conteudo FROM Conteudo WHERE tmdb_id = ?", [tmdb_id], (err, results) => {
            if (results.length > 0) {
                const id_conteudo = results[0].id_conteudo;

                connection.query("SELECT * FROM Vistos WHERE id_utilizador = ? AND id_conteudo = ?", [userId, id_conteudo], (err, vistos) => {
                    if (vistos.length > 0) {
                        connection.query("DELETE FROM Vistos WHERE id_utilizador = ? AND id_conteudo = ?", [userId, id_conteudo], () => {
                            connection.end();
                            redirectWithStatus(res, previousPage, 'seen_removed');
                        });
                    } else {
                        connection.query("INSERT INTO Vistos (id_utilizador, id_conteudo) VALUES (?, ?)", [userId, id_conteudo], () => {
                            connection.end();
                            redirectWithStatus(res, previousPage, 'seen_added');
                        });
                    }
                });
            } else {
                connection.end();
                res.redirect(previousPage);
            }
        });
    });
});

router.post('/review', (req, res) => {
    if (!req.session.user) return res.status(401).send("Faça login");

    const { tmdb_id, titulo, poster, tipo, classificacao, critica } = req.body;
    const userId = req.session.user.id_utilizador;
    const previousPage = req.header('Referer') || '/';
    
    if (!classificacao) return res.redirect(previousPage);

    const connection = createNewConnection();

    const sqlConteudo = "INSERT IGNORE INTO Conteudo (tmdb_id, nome, poster_url, tipo) VALUES (?, ?, ?, ?)";
    connection.query(sqlConteudo, [tmdb_id, titulo, poster, tipo || 'filme'], (err) => {
        connection.query("SELECT id_conteudo FROM Conteudo WHERE tmdb_id = ?", [tmdb_id], (err, results) => {
            if (results.length > 0) {
                const id_conteudo = results[0].id_conteudo;

                const checkSql = "SELECT id_review FROM Reviews WHERE id_utilizador = ? AND id_conteudo = ?";
                connection.query(checkSql, [userId, id_conteudo], (err, reviews) => {
                    if (reviews.length > 0) {
                        const updateSql = "UPDATE Reviews SET classificacao = ?, critica = ?, data_review = NOW() WHERE id_review = ?";
                        connection.query(updateSql, [classificacao, critica, reviews[0].id_review], () => {
                            connection.end();
                            redirectWithStatus(res, previousPage, 'review_updated');
                        });
                    } else {
                        const insertSql = "INSERT INTO Reviews (id_utilizador, id_conteudo, classificacao, critica) VALUES (?, ?, ?, ?)";
                        connection.query(insertSql, [userId, id_conteudo, classificacao, critica], () => {
                            connection.end();
                            redirectWithStatus(res, previousPage, 'review_added');
                        });
                    }
                });
            } else {
                connection.end();
                res.redirect(previousPage);
            }
        });
    });
});

module.exports = router;