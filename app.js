const express = require('express');

const { createNewConnection } = require('./public/BD_Info/db'); 
const generosRoutes = require('./public/routes/generos'); 

const app = express();
const port = 3000;

app.use(express.json());

app.use(express.static('public')); 

app.get('/', (req, res) => {
    res.send('Running Server.');
});

app.use('/api/generos', generosRoutes); 

app.listen(port, () => {
    console.log(`🚀 Servidor a correr na porta ${port}`); 
    console.log(`Acessível em: http://localhost:${port}`);
});