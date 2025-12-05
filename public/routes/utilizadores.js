const express = require('express');
const router = express.Router();
const { createNewConnection } = require('../BD_Info/db');

router.get('/', (req, res) => {

    const connection = createNewConnection();
    connection.connect(err => {
        if (err) {
            console.error('Erro ao conectar à BD:', err.message);
            return res.status(500).json({ message: 'Erro interno do servidor.' });
        }
        
        connection.query('SELECT id_utilizador, nome_utilizador FROM Utilizadores', (err, rows) => {
            connection.end();

            if (err) {
                console.error('Erro na procura de utilizadores:', err);
                return res.status(500).json({ message: 'Erro ao executar a consulta.' });
            }
            res.status(200).json(rows);
        });
    });
});

router.post('/', (req, res) => {
    const { nome_utilizador } = req.body;

    if (!nome_utilizador) {
        return res.status(400).json({ message: 'O nome do género é obrigatório.' });
    }

    const connection = createNewConnection();
    connection.connect(err => {
        if (err) {
            console.error('Erro ao conectar à BD:', err.message);
            return res.status(500).json({ message: 'Erro interno do servidor.' });
        }

        const sql = 'INSERT INTO Utilizadores (nome_utilizador) VALUES (?)';
        connection.query(sql, [nome_utilizador], (err, result) => {
            
            connection.end();

            if (err) {
                console.error('Erro ao criar utilizador:', err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ message: 'Este utilizador já existe.' });
                }
                return res.status(500).json({ message: 'Erro interno ao criar o utilizador.' });
            }

            res.status(201).json({ 
                message: 'Utilizador criado com sucesso.',
                id: result.insertId,
                nome: nome_utilizador
            });
        });
    });
});

router.put('/:id', (req, res) => {
    const id = req.params.id;
    const { nome_utilizador } = req.body;

    if (!nome_utilizador) {
        return res.status(400).json({ message: 'O novo nome do utilizador é obrigatório.' });
    }

    const connection = createNewConnection();
    connection.connect(err => {
        if (err) {
            console.error('Erro ao conectar à BD:', err.message);
            return res.status(500).json({ message: 'Erro interno do servidor.' });
        }

        const sql = 'UPDATE Utilizadores SET nome_utilizador = ? WHERE id_utilizador = ?';
        connection.query(sql, [nome_utilizador, id], (err, result) => {
            
            connection.end();

            if (err) {
                console.error('Erro ao atualizar utilizador:', err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ message: 'Este utilizador já existe.' });
                }
                return res.status(500).json({ message: 'Erro interno ao atualizar o utilizador.' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: `Utilizador com ID ${id} não encontrado.` });
            }

            res.status(200).json({ 
                message: 'Utilizador atualizado com sucesso.',
                id: id,
                nome_atualizado: nome_utilizador
            });
        });
    });
});

router.delete('/:id', (req, res) => {
    const id = req.params.id;

    const connection = createNewConnection();
    connection.connect(err => {
        if (err) {
            console.error('Erro ao conectar à BD:', err.message);
            return res.status(500).json({ message: 'Erro interno do servidor.' });
        }

        const sql = 'DELETE FROM Utilizadores WHERE id_utilizador = ?';
        connection.query(sql, [id], (err, result) => {
            
            connection.end();

            if (err) {
                console.error('Erro ao apagar utilizador:', err);
                if (err.code === 'ER_ROW_IS_REFERENCED_2') {
                    return res.status(409).json({ message: 'Não é possível apagar o utilizador. Pode estar com a conta iniciada!' });
                }
                return res.status(500).json({ message: 'Erro interno ao apagar o utilizador.' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: `Utilizador com ID ${id} não encontrado.` });
            }
            res.status(200).json({ 
                message: 'Utilizador apagado com sucesso.',
                id_apagado: id
            });
        });
    });
});

module.exports = router;