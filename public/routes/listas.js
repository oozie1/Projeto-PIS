const express = require('express');
const router = express.Router();
const { createNewConnection } = require('../BD_Info/db');

router.get('/:id', (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');

    const listaId = req.params.id;
    const connection = createNewConnection();
    const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

    connection.query('SELECT nome_lista FROM Listas_Personalizadas WHERE id_lista = ?', [listaId], (err, listInfo) => {
        if (err || listInfo.length === 0) {
            connection.end();
            return res.redirect('/perfil');
        }

        const sqlFilmes = `
            SELECT c.* FROM Conteudo c
            JOIN Lista_Conteudos lc ON c.id_conteudo = lc.id_conteudo
            WHERE lc.id_lista = ?`;

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

module.exports = router;