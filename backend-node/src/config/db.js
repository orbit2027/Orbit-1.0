/**
 * Conexion a MongoDB Atlas mediante Mongoose.
 * Replica la conexion que hacian MongoEngine en Django.
 */
const mongoose = require('mongoose');
const config = require('../config');

async function conectarDB() {
    try {
        await mongoose.connect(config.MONGODB_URI);
        console.log('Conectado a MongoDB Atlas correctamente.');
    } catch (error) {
        console.error('Error conectando a MongoDB:', error.message);
        process.exit(1);
    }
}

module.exports = { conectarDB };
