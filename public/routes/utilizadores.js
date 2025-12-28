const express = require('express');
const router = express.Router();
const { createNewConnection } = require('../BD_Info/db'); 

// =========================================================
// ROTAS DE PÁGINAS (FRONTEND)
// =========================================================

// Mostrar página de Login
router.get('/login', (req, res) => {
    res.render('login');
});

// Mostrar página de Registo
router.get('/register', (req, res) => {
    res.render('register');
});

// =========================================================
// ROTAS DE AUTENTICAÇÃO (LOGIN E REGISTO)
// =========================================================

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
            console.error('Erro ao criar utilizador:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.send('<script>alert("Este email já está registado!"); window.history.back();</script>');
            }
            return res.status(500).send("Erro interno ao criar conta.");
        }

        console.log("Utilizador criado com ID:", result.insertId);
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
            console.log("Login efetuado por:", results[0].nome_utilizador);
            res.redirect('/'); 
        } else {
            res.render('login', { mensagem: 'Email ou senha incorretos!' });
        }
    });
});

// =========================================================
// ROTAS DE API / GESTÃO 
// =========================================================

// LISTAR TODOS OS UTILIZADORES
router.get('/', (req, res) => {
    const connection = createNewConnection();
    connection.connect(err => {
        if (err) {
            console.error('Erro ao conectar à BD:', err.message);
            return res.status(500).json({ message: 'Erro interno do servidor.' });
        }
        
        connection.query('SELECT id_utilizador, nome_utilizador, email FROM Utilizadores', (err, rows) => {
            connection.end();

            if (err) {
                console.error('Erro na procura de utilizadores:', err);
                return res.status(500).json({ message: 'Erro ao executar a consulta.' });
            }
            res.status(200).json(rows);
        });
    });
});

// ATUALIZAR UM UTILIZADOR (PUT)
router.put('/:id', (req, res) => {
    const id = req.params.id;
    const { nome_utilizador } = req.body;

    if (!nome_utilizador) {
        return res.status(400).json({ message: 'O novo nome do utilizador é obrigatório.' });
    }

    const connection = createNewConnection();
    connection.connect(err => {
        if (err) return res.status(500).json({ message: 'Erro interno.' });

        const sql = 'UPDATE Utilizadores SET nome_utilizador = ? WHERE id_utilizador = ?';
        connection.query(sql, [nome_utilizador, id], (err, result) => {
            connection.end();

            if (err) {
                console.error('Erro update:', err);
                return res.status(500).json({ message: 'Erro ao atualizar.' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: `Utilizador ${id} não encontrado.` });
            }

            res.status(200).json({ 
                message: 'Utilizador atualizado com sucesso.',
                id: id,
                nome_atualizado: nome_utilizador
            });
        });
    });
});

// APAGAR UM UTILIZADOR (DELETE)
router.delete('/:id', (req, res) => {
    const id = req.params.id;

    const connection = createNewConnection();
    connection.connect(err => {
        if (err) return res.status(500).json({ message: 'Erro interno.' });

        const sql = 'DELETE FROM Utilizadores WHERE id_utilizador = ?';
        connection.query(sql, [id], (err, result) => {
            connection.end();

            if (err) {
                if (err.code === 'ER_ROW_IS_REFERENCED_2') {
                    return res.status(409).json({ message: 'Não é possível apagar: utilizador em uso.' });
                }
                return res.status(500).json({ message: 'Erro ao apagar.' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: `Utilizador ${id} não encontrado.` });
            }
            res.status(200).json({ 
                message: 'Utilizador apagado com sucesso.',
                id_apagado: id
            });
        });
    });
});

module.exports = router;