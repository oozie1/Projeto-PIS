const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { createNewConnection } = require('../BD_Info/db');

router.get('/login', (req, res) => {
    res.render('login', { error: null });
});

router.post('/login', (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.render('login', { error: 'Por favor, preencha todos os campos.' });
    }

    const connection = createNewConnection();

    connection.query('SELECT * FROM Utilizadores WHERE email = ?', [email], async (err, results) => {
        connection.end();

        if (err || results.length === 0) {
            return res.render('login', { error: 'Email ou senha incorretos' });
        }

        const user = results[0];

        if (!user.password_hash) {
            console.error("Erro: Utilizador encontrado mas sem password_hash na BD.");
            return res.render('login', { error: 'Erro na conta. Contacte o suporte.' });
        }

        try {
            const match = await bcrypt.compare(senha, user.password_hash);

            if (match) {
                req.session.user = user;
                res.redirect('/');
            } else {
                res.render('login', { error: 'Email ou senha incorretos' });
            }
        } catch (bcryptError) {
            console.error("Erro no bcrypt:", bcryptError);
            res.render('login', { error: 'Ocorreu um erro ao processar o login.' });
        }
    });
});

router.get('/register', (req, res) => {
    res.render('register', { error: null });
});

router.post('/register', async (req, res) => {
    const { nome, email, senha } = req.body;
    
    if (!nome || !email || !senha) {
        return res.render('register', { error: 'Preencha todos os campos.' });
    }

    const connection = createNewConnection();

    try {
        const hashedPassword = await bcrypt.hash(senha, 10);

        connection.query('SELECT email FROM Utilizadores WHERE email = ?', [email], (err, results) => {
            if (results.length > 0) {
                connection.end();
                return res.render('register', { error: 'Email já registado!' });
            }

            connection.query('INSERT INTO Utilizadores (nome_utilizador, email, password_hash) VALUES (?, ?, ?)', 
            [nome, email, hashedPassword], (errInsert) => {
                connection.end();
                if (errInsert) {
                    console.error(errInsert);
                    return res.render('register', { error: 'Erro ao criar conta.' });
                }
                res.redirect('/auth/login');
            });
        });
    } catch (error) {
        console.error(error);
        if (connection) connection.end();
        res.render('register', { error: 'Erro interno.' });
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

router.get('/perfil', (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    
    const user = req.session.user;
    const connection = createNewConnection();
    
    const sqlFav = `SELECT c.* FROM Conteudo c 
                    JOIN Favoritos f ON c.id_conteudo = f.id_conteudo 
                    WHERE f.id_utilizador = ?`;
    
    connection.query(sqlFav, [user.id_utilizador], (err, favoritos) => {
        
        const sqlListas = `SELECT * FROM Listas_Personalizadas WHERE id_utilizador = ?`;
        connection.query(sqlListas, [user.id_utilizador], (err2, listas) => {
            
            const sqlVistos = `SELECT c.* FROM Conteudo c 
                               JOIN Vistos v ON c.id_conteudo = v.id_conteudo 
                               WHERE v.id_utilizador = ? ORDER BY v.data_visto DESC`;
            
            connection.query(sqlVistos, [user.id_utilizador], (err3, vistos) => {
                
                if (user.is_admin) {
                    connection.query("SELECT * FROM Utilizadores", (err4, allUsers) => {
                        connection.end();
                        res.render('perfil', { user, favoritos, listas, vistos, listaUsuarios: allUsers });
                    });
                } else {
                    connection.end();
                    res.render('perfil', { user, favoritos, listas, vistos });
                }
            });
        });
    });
});

router.post('/admin/create', async (req, res) => {
    if (!req.session.user || !req.session.user.is_admin) return res.status(403).send("Acesso negado");

    const { nome, email, senha } = req.body;
    const connection = createNewConnection();
    const hashedPassword = await bcrypt.hash(senha, 10);

    connection.query('INSERT INTO Utilizadores (nome_utilizador, email, password_hash) VALUES (?, ?, ?)', 
    [nome, email, hashedPassword], (err) => {
        connection.end();
        res.redirect('/auth/perfil');
    });
});

router.post('/admin/update-full/:id', (req, res) => {
    if (!req.session.user || !req.session.user.is_admin) return res.status(403).send("Acesso negado");

    const userId = req.params.id;
    const { novoNome, status } = req.body;
    const connection = createNewConnection();

    connection.query('UPDATE Utilizadores SET nome_utilizador = ?, is_admin = ? WHERE id_utilizador = ?', 
    [novoNome, status, userId], (err) => {
        connection.end();
        res.redirect('/auth/perfil');
    });
});

router.post('/admin/delete/:id', (req, res) => {
    if (!req.session.user || !req.session.user.is_admin) return res.status(403).send("Acesso negado");

    const userId = req.params.id;
    const connection = createNewConnection();

    connection.query('DELETE FROM Utilizadores WHERE id_utilizador = ?', [userId], (err) => {
        connection.end();
        res.redirect('/auth/perfil');
    });
});

module.exports = router;