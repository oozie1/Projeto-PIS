const express = require('express');
const router = express.Router();
const { createNewConnection } = require('../BD_Info/db'); 

const bcrypt = require('bcrypt');
const saltRounds = 10; 

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

    const connection = createNewConnection();
    const userId = req.session.user.id_utilizador;

    if (req.session.user.is_admin === 1) {
        connection.query("SELECT id_utilizador, nome_utilizador, email, is_admin FROM Utilizadores", (err, results) => {
            connection.end();
            if (err) {
                console.error(err);
                return res.render('perfil', { user: req.session.user, listaUsuarios: [], favoritos: [], listas: [] });
            }
            res.render('perfil', { 
                user: req.session.user, 
                listaUsuarios: results,
                favoritos: [],
                listas: []
            });
        });
    } 
    else {
        const sqlFav = `
            SELECT c.*, c.tmdb_id 
            FROM Conteudo c
            JOIN Favoritos f ON c.id_conteudo = f.id_conteudo
            WHERE f.id_utilizador = ?
        `;
        
        connection.query(sqlFav, [userId], (err, favResults) => {
            if (err) console.error("Erro Favoritos:", err);

            const sqlListas = "SELECT * FROM Listas_Personalizadas WHERE id_utilizador = ?";
            
            connection.query(sqlListas, [userId], (errList, listResults) => {
                connection.end();
                
                if (errList) console.error("Erro Listas:", errList);

                res.render('perfil', { 
                    user: req.session.user, 
                    favoritos: favResults || [], 
                    listaUsuarios: [],
                    listas: listResults || []
                });
            });
        });
    }
});

router.post('/register', (req, res) => {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
        return res.send('<script>alert("Preenche todos os campos!"); window.history.back();</script>');
    }

    const connection = createNewConnection();

    bcrypt.hash(senha, saltRounds, (err, hash) => {
        if (err) {
            connection.end(); 
            console.error("Erro no bcrypt:", err);
            return res.status(500).send("Erro ao processar a senha.");
        }

        const sql = 'INSERT INTO Utilizadores (nome_utilizador, email, password_hash) VALUES (?, ?, ?)';
        
        connection.query(sql, [nome, email, hash], (dbErr, result) => {
            connection.end(); 

            if (dbErr) {
                if (dbErr.code === 'ER_DUP_ENTRY') {
                    return res.send('<script>alert("Este email já está registado!"); window.history.back();</script>');
                }
                console.error(dbErr);
                return res.status(500).send("Erro interno ao criar conta.");
            }

            res.redirect('/auth/login');
        });
    });
});

router.post('/login', (req, res) => {
    const { email, senha } = req.body;

    const connection = createNewConnection();

    const sql = "SELECT * FROM Utilizadores WHERE email = ?";
    
    connection.query(sql, [email], (err, results) => {
        connection.end(); 
        if (err) {
            console.error("Erro na BD:", err);
            return res.send("Erro interno do servidor.");
        }

        if (results.length === 0) {
            return res.render('login', { mensagem: 'Email ou senha incorretos!' });
        }

        const user = results[0];

        bcrypt.compare(senha, user.password_hash, (bcryptErr, isMatch) => {
            if (bcryptErr) {
                console.error("Erro no bcrypt:", bcryptErr);
                return res.send("Erro ao verificar credenciais.");
            }

            if (isMatch) {
                req.session.user = user; 
                res.redirect('/'); 
            } else {
                res.render('login', { mensagem: 'Email ou senha incorretos!' });
            }
        });
    });
});

router.post('/admin/delete/:id', (req, res) => {
    if (!req.session.user || req.session.user.is_admin !== 1) return res.status(403).send("Acesso Negado");

    const connection = createNewConnection();
    connection.query("DELETE FROM Utilizadores WHERE id_utilizador = ?", [req.params.id], (err) => {
        connection.end();
        res.redirect('/auth/perfil');
    });
});

router.post('/admin/toggle/:id/:status', (req, res) => {
    if (!req.session.user || req.session.user.is_admin !== 1) return res.status(403).send("Acesso Negado");

    const novoStatus = req.params.status == '1' ? 0 : 1;
    const connection = createNewConnection();
    connection.query("UPDATE Utilizadores SET is_admin = ? WHERE id_utilizador = ?", [novoStatus, req.params.id], (err) => {
        connection.end();
        res.redirect('/auth/perfil');
    });
});

router.post('/admin/create', async (req, res) => {
    if (!req.session.user || !req.session.user.is_admin) return res.status(403).send("Proibido");
    
    const { nome, email, senha } = req.body;
    const hash = await bcrypt.hash(senha, 10);
    const connection = createNewConnection();
    
    connection.query('INSERT INTO Utilizadores (nome_utilizador, email, password_hash) VALUES (?, ?, ?)', 
    [nome, email, hash], (err) => {
        connection.end();
        res.redirect('/auth/perfil');
    });
});

router.post('/admin/delete/:id', (req, res) => {
    if (!req.session.user || !req.session.user.is_admin) return res.status(403).send("Acesso negado");
    
    const userId = req.params.id;
    const connection = createNewConnection();

    connection.query("DELETE FROM Favoritos WHERE id_utilizador = ?", [userId], () => {
        connection.query("DELETE FROM Reviews WHERE id_utilizador = ?", [userId], () => {
            connection.query("DELETE FROM Utilizadores WHERE id_utilizador = ?", [userId], (err) => {
                connection.end();
                if (err) return res.status(500).send("Erro ao apagar");
                res.redirect('/auth/perfil');
            });
        });
    });
});

router.post('/admin/update-full/:id', (req, res) => {
    if (!req.session.user || !req.session.user.is_admin) return res.status(403).send("Proibido");
    
    const { novoNome, status } = req.body;
    const id = req.params.id;
    const connection = createNewConnection();
    
    const sql = 'UPDATE Utilizadores SET nome_utilizador = ?, is_admin = ? WHERE id_utilizador = ?';
    connection.query(sql, [novoNome, status, id], (err) => {
        connection.end();
        if (err) return res.send("Erro ao editar");
        res.redirect('/auth/perfil');
    });
});

module.exports = router;

module.exports = router;