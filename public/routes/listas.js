const express = require('express');
const router = express.Router();
const { createNewConnection } = require('../BD_Info/db');

router.get('/:id', (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');

    const listaId = req.params.id;
    const connection = createNewConnection();
    const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

    const sqlVerify = 'SELECT * FROM Listas_Personalizadas WHERE id_lista = ? AND id_utilizador = ?';
    connection.query(sqlVerify, [listaId, req.session.user.id_utilizador], (err, result) => {
        if (err || result.length === 0) {
            connection.end();
            return res.redirect('/auth/perfil');
        }

        const nomeLista = result[0].nome_lista;

        const sqlFilmes = `
            SELECT c.* FROM Conteudo c
            JOIN Lista_Conteudos lc ON c.id_conteudo = lc.id_conteudo
            WHERE lc.id_lista = ?`;

        connection.query(sqlFilmes, [listaId], (errFilmes, filmes) => {
            connection.end();
            res.render('lista_detalhes', { 
                idLista: listaId,
                nomeLista: nomeLista, 
                filmes: filmes || [],
                imageBaseUrl: IMAGE_BASE_URL 
            });
        });
    });
});

router.post('/criar', (req, res) => {
    if (!req.session.user) return res.status(401).send("Faça login");
    const { nome_lista } = req.body;
    const userId = req.session.user.id_utilizador;
    const connection = createNewConnection();

    connection.query('INSERT INTO Listas_Personalizadas (id_utilizador, nome_lista) VALUES (?, ?)', 
    [userId, nome_lista], (err) => {
        connection.end();
        res.redirect('/auth/perfil');
    });
});

router.post('/adicionar', (req, res) => {
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

router.post('/remover-item', (req, res) => {
    if (!req.session.user) return res.status(401).send("Faça login");
    
    const { id_lista, id_conteudo } = req.body;
    const connection = createNewConnection();
    const sql = "DELETE FROM Lista_Conteudos WHERE id_lista = ? AND id_conteudo = ?";
    
    connection.query(sql, [id_lista, id_conteudo], (err) => {
        connection.end();
        res.redirect('/perfil/lista/' + id_lista);
    });
});

router.post('/apagar/:id', (req, res) => {
    if (!req.session.user) return res.status(401).send("Faça login");

    const listaId = req.params.id;
    const userId = req.session.user.id_utilizador;
    const connection = createNewConnection();

    connection.query("DELETE FROM Lista_Conteudos WHERE id_lista = ?", [listaId], (err) => {
        if (err) {
            connection.end();
            return res.redirect('/auth/perfil');
        }
        connection.query("DELETE FROM Listas_Personalizadas WHERE id_lista = ? AND id_utilizador = ?", 
        [listaId, userId], (err2) => {
            connection.end();
            res.redirect('/auth/perfil');
        });
    });
});

router.post('/editar', (req, res) => {
    if (!req.session.user) return res.status(401).send("Faça login");
    
    const { id_lista, novo_nome } = req.body;
    const userId = req.session.user.id_utilizador;
    const connection = createNewConnection();

    const sql = "UPDATE Listas_Personalizadas SET nome_lista = ? WHERE id_lista = ? AND id_utilizador = ?";
    
    connection.query(sql, [novo_nome, id_lista, userId], (err) => {
        connection.end();
        res.redirect('/auth/perfil');
    });
});

module.exports = router;