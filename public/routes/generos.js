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
        
        connection.query('SELECT id_genero, nome_genero FROM Generos', (err, rows) => {
            connection.end();

            if (err) {
                console.error('Erro na procura de generos:', err);
                return res.status(500).json({ message: 'Erro ao executar a consulta.' });
            }
            res.status(200).json(rows);
        });
    });
});



router.post('/', (req, res) => {
    const { nome_genero } = req.body;

    if (!nome_genero) {
        return res.status(400).json({ message: 'O nome do género é obrigatório.' });
    }

    const connection = createNewConnection();
    connection.connect(err => {
        if (err) {
            console.error('Erro ao conectar à BD:', err.message);
            return res.status(500).json({ message: 'Erro interno do servidor.' });
        }

        const sql = 'INSERT INTO Generos (nome_genero) VALUES (?)';
        connection.query(sql, [nome_genero], (err, result) => {
            
            connection.end();

            if (err) {
                console.error('Erro ao criar género:', err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ message: 'Este género já existe.' });
                }
                return res.status(500).json({ message: 'Erro interno ao criar o género.' });
            }

            res.status(201).json({ 
                message: 'Género criado com sucesso.',
                id: result.insertId,
                nome: nome_genero
            });
        });
    });
});

router.put('/:id', (req, res) => {
    const id = req.params.id;
    const { nome_genero } = req.body;

    if (!nome_genero) {
        return res.status(400).json({ message: 'O novo nome do género é obrigatório.' });
    }

    const connection = createNewConnection();
    connection.connect(err => {
        if (err) {
            console.error('Erro ao conectar à BD:', err.message);
            return res.status(500).json({ message: 'Erro interno do servidor.' });
        }

        const sql = 'UPDATE Generos SET nome_genero = ? WHERE id_genero = ?';
        connection.query(sql, [nome_genero, id], (err, result) => {
            
            connection.end();

            if (err) {
                console.error('Erro ao atualizar género:', err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ message: 'Este género já existe.' });
                }
                return res.status(500).json({ message: 'Erro interno ao atualizar o género.' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: `Género com ID ${id} não encontrado.` });
            }

            res.status(200).json({ 
                message: 'Género atualizado com sucesso.',
                id: id,
                nome_atualizado: nome_genero
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

        const sql = 'DELETE FROM Generos WHERE id_genero = ?';
        connection.query(sql, [id], (err, result) => {
            
            connection.end();

            if (err) {
                console.error('Erro ao apagar género:', err);
                if (err.code === 'ER_ROW_IS_REFERENCED_2') {
                    return res.status(409).json({ message: 'Não é possível apagar o género. Está a ser usado por um Conteúdo.' });
                }
                return res.status(500).json({ message: 'Erro interno ao apagar o género.' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: `Género com ID ${id} não encontrado.` });
            }
            res.status(200).json({ 
                message: 'Género apagado com sucesso.',
                id_apagado: id
            });
        });
    });
});

module.exports = router;