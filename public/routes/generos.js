const express = require('express');
const router = express.Router();
const { createNewConnection } = require('../BD_Info/db');

router.get('/', (req, res) => {
    const connection = createNewConnection();
    connection.connect(err => {
        if (err) return res.status(500).json({ message: 'Erro interno.' });
        
        connection.query('SELECT id_genero, nome_genero FROM Generos', (err, rows) => {
            connection.end();
            if (err) return res.status(500).json({ message: 'Erro BD.' });
            res.status(200).json(rows);
        });
    });
});

router.post('/', (req, res) => {
    const { nome_genero } = req.body;
    if (!nome_genero) return res.status(400).json({ message: 'Nome obrigatório.' });

    const connection = createNewConnection();
    connection.connect(err => {
        if (err) return res.status(500).json({ message: 'Erro interno.' });

        const sql = 'INSERT INTO Generos (nome_genero) VALUES (?)';
        connection.query(sql, [nome_genero], (err, result) => {
            connection.end();
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Género já existe.' });
                return res.status(500).json({ message: 'Erro interno.' });
            }
            res.status(201).json({ message: 'Criado com sucesso.', id: result.insertId, nome: nome_genero });
        });
    });
});

router.delete('/:id', (req, res) => {
    const id = req.params.id;
    const connection = createNewConnection();
    connection.connect(err => {
        if (err) return res.status(500).json({ message: 'Erro interno.' });

        const sql = 'DELETE FROM Generos WHERE id_genero = ?';
        connection.query(sql, [id], (err, result) => {
            connection.end();
            if (err) {
                if (err.code === 'ER_ROW_IS_REFERENCED_2') return res.status(409).json({ message: 'Em uso.' });
                return res.status(500).json({ message: 'Erro interno.' });
            }
            if (result.affectedRows === 0) return res.status(404).json({ message: 'Não encontrado.' });
            res.status(200).json({ message: 'Apagado com sucesso.' });
        });
    });
});

module.exports = router;