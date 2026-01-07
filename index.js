require('dotenv').config();
const express = require('express');
const session = require('express-session');

const indexRoutes = require('./public/routes/indexRoutes');
const authRoutes = require('./public/routes/utilizadores');
const generosRoutes = require('./public/routes/generos');
const conteudoRoutes = require('./public/routes/conteudo');
const listasRoutes = require('./public/routes/listas'); 

const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');
app.use(express.static('public'));

app.use(session({
    secret: '123',
    resave: false,
    saveUninitialized: true
}));

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/api/generos', generosRoutes);
app.use('/api/conteudo', conteudoRoutes);
app.use('/api/listas', listasRoutes);
app.use('/perfil/lista', listasRoutes);

app.listen(PORT, () => {
    console.log(`Servidor a correr na porta ${PORT}`);
    console.log(`Acede em: http://localhost:${PORT}`);
});