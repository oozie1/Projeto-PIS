const express = require('express');
const router = express.Router();
const { createNewConnection } = require('../BD_Info/db'); 

router.get('/login', (req, res) => {
    res.render('login');
});

router.get('/register', (req, res) => {
    res.render('register');
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

router.get('/perfil', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }

    const id_utilizador = req.session.user.id_utilizador;
    const connection = createNewConnection();
    connection.connect();

    const sql = `
        SELECT c.*, c.tmdb_id 
        FROM Conteudo c
        JOIN Favoritos f ON c.id_conteudo = f.id_conteudo
        WHERE f.id_utilizador = ?
    `;

    connection.query(sql, [id_utilizador], (err, results) => {
        connection.end();
        if (err) {
            return res.render('perfil', { user: req.session.user, favoritos: [] });
        }
        res.render('perfil', { user: req.session.user, favoritos: results });
    });
});

router.post('/register', (req, res) => {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
        return res.send('<script>alert("Preenche todos os campos!"); window.history.back();</script>');
    }

    const connection = createNewConnection();
    connection.connect();

    const sql = 'INSERT INTO Utilizadores (nome_utilizador, email, senha) VALUES (?, ?, ?)';
    
    connection.query(sql, [nome, email, senha], (err, result) => {
        connection.end();

        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.send('<script>alert("Este email já está registado!"); window.history.back();</script>');
            }
            return res.status(500).send("Erro interno ao criar conta.");
        }
        res.redirect('/auth/login');
    });
});

router.post('/login', (req, res) => {
    const { email, senha } = req.body;

    const connection = createNewConnection();
    connection.connect();

    const sql = "SELECT * FROM utilizadores WHERE email = ? AND senha = ?";
    
    connection.query(sql, [email, senha], (err, results) => {
        connection.end();

        if (err) {
            return res.send("Erro interno do servidor.");
        }
        if (results.length > 0) {
            req.session.user = results[0]; 
            res.redirect('/'); 
        } else {
            res.render('login', { mensagem: 'Email ou senha incorretos!' });
        }
    });
});

router.get('/', (req, res) => {
    const connection = createNewConnection();
    connection.connect(err => {
        if (err) return res.status(500).json({ message: 'Erro interno.' });
        
        connection.query('SELECT id_utilizador, nome_utilizador, email FROM Utilizadores', (err, rows) => {
            connection.end();
            if (err) return res.status(500).json({ message: 'Erro ao executar a consulta.' });
            res.status(200).json(rows);
        });
    });
});

router.put('/:id', (req, res) => {
    const id = req.params.id;
    const { nome_utilizador } = req.body;

    if (!nome_utilizador) return res.status(400).json({ message: 'Nome obrigatório.' });

    const connection = createNewConnection();
    connection.connect(err => {
        if (err) return res.status(500).json({ message: 'Erro interno.' });

        const sql = 'UPDATE Utilizadores SET nome_utilizador = ? WHERE id_utilizador = ?';
        connection.query(sql, [nome_utilizador, id], (err, result) => {
            connection.end();
            if (err) return res.status(500).json({ message: 'Erro ao atualizar.' });
            if (result.affectedRows === 0) return res.status(404).json({ message: 'Utilizador não encontrado.' });

            res.status(200).json({ message: 'Atualizado com sucesso.', id: id });
        });
    });
});

router.delete('/:id', (req, res) => {
    const id = req.params.id;

    const connection = createNewConnection();
    connection.connect(err => {
        if (err) return res.status(500).json({ message: 'Erro interno.' });

        const sql = 'DELETE FROM Utilizadores WHERE id_utilizador = ?';
        connection.query(sql, [id], (err, result) => {
            connection.end();
            if (err) {
                if (err.code === 'ER_ROW_IS_REFERENCED_2') return res.status(409).json({ message: 'Utilizador em uso.' });
                return res.status(500).json({ message: 'Erro ao apagar.' });
            }
            if (result.affectedRows === 0) return res.status(404).json({ message: 'Utilizador não encontrado.' });
            res.status(200).json({ message: 'Apagado com sucesso.', id: id });
        });
    });
});

module.exports = router;