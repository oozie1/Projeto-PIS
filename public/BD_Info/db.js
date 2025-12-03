const mysql = require('mysql2');

const dbConfig = {
    host: "localhost",
    user: "root",
    password: "root",
    database: "BD_ProjetoPIS"
};

const createNewConnection = () => {
    return mysql.createConnection(connectionOptions);
};

module.exports = { createNewConnection };
