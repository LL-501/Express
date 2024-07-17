const { json } = require('body-parser');								
const express = require('express');								
const ObjectId = require('mongodb').ObjectId;								
const { MongoClient } = require('mongodb');								
const cors = require('cors');								
const app = express();								
app.use(cors());								
const PORT = process.env.PORT || 4000;								
const MONGO_URL = 'mongodb+srv://UTP:utp2024@clusterutp.yfa2pk5.mongodb.net';								
const DATABASE_NAME = 'utp';								
const EQUIPOS = 'equipos';								
const SOLICITUDES = 'solicitudes';								
const USUARIOS = 'usuarios';								
let db;								
// Middleware para parsear JSON								
app.use(express.json());								
// Conexión a la base de datos								
MongoClient.connect(MONGO_URL)								
    .then(client => {								
        db = client.db(DATABASE_NAME);								
        console.log('Conectado a MongoDB Base de datos utp');								
    })								
    .catch(err => {								
        console.error('Error al conectar a MongoDB', err);								
    });								
// Obtener los equipos registrados								
app.get('/equipos', async (req, res) => {								
    let resu = await db.collection(EQUIPOS).find({}).toArray();								
    console.log("Consultar todos los equipos registrados");								
    res.status(200).json(resu);								
});								
// Obtener los equipos de acuerdo a su estado								
app.get('/equipos/:estado', async (req, res) => {								
    const est = req.params.estado;								
    const equipos = await db.collection(EQUIPOS).find({ estado: est }).toArray();								
    console.log(equipos);								
    res.status(200).send(equipos);								
});								
// Crear nuevo equipo para prestamos								
app.post('/equipos', async (req, res) => {								
    const { marbete, descripcion } = req.body;								
    if (!marbete || !descripcion) {								
        return res.status(500).send('Todos los campos son requeridos.{marbete, descripcion}');								
    }								
    const nuevoRegistro = { ...req.body, estado: 'DISPONIBLE' };								
    try {								
        await db.collection(EQUIPOS).insertOne(nuevoRegistro);								
        res.status(200).send(JSON.stringify({ msg: "Nuevo equipo creado con marbete: " + marbete + "!", status: 200 }));								
    } catch (err) {								
        console.log(err);								
        res.status(500).send('Error al crear equipo');								
    }								
});								
// Aprobar, rechazar o establecer solicitudes como pendientes								
app.post('/solicitudes/:id', async (req, res) => {								
    const { marbete, estado, encargado } = req.body;								
    const solicitudID = req.params.id;								
    let filtro;								
    try {								
        filtro = { _id: new ObjectId(solicitudID) };								
    } catch {								
        return res.status(500).send('Id en formato incorrecto');								
    }								
    if (!estado || !marbete || !encargado) {								
        return res.status(500).send('Campos requeridos: [marbete, encargado, estado]');								
    }								
    const documentoActualizado = { $set: { estado: estado, encargado: encargado } };								
    const result = await db.collection(SOLICITUDES).updateOne(filtro, documentoActualizado, { upsert: false });								
    await actualizarEstadoSolicitud({ marbete: marbete }, estado);								
    res.status(200).json(result);								
});								
// Obtener solicitudes de un usuario específico o todas								
app.get('/solicitudes', async (req, res) => {								
    const { correo, estado } = req.body;								
    if (estado == undefined && correo == undefined) {								
        const resultado = await db.collection(SOLICITUDES).find({}).toArray();								
        res.status(200).send(resultado);								
    } else if (correo && !estado) {								
        const resultado = await db.collection(SOLICITUDES).find({ correo: correo }).toArray();								
        res.status(200).send(resultado);								
    } else {								
        res.status(500).json({ msg: 'error' });								
    }								
});								
// Crear nueva solicitud								
app.post('/solicitudes', async (req, res) => {								
    const { correo, equipo, marbete } = req.body;								
    if (!correo || !equipo || !marbete) {								
        return res.status(500).send('Campos requeridos.[correo, equipo, marbete]');								
    }								
    const nuevoRegistro = { ...req.body, estado: 'PENDIENTE', encargado: '' };								
    await db.collection(SOLICITUDES).insertOne(nuevoRegistro);								
    let result = await db.collection(EQUIPOS).updateOne({ marbete: marbete }, { $set: { estado: 'SOLICITADO' } }, { upsert: false });								
    res.status(200).json({ msg: "Ok" });								
});								
async function actualizarEstadoSolicitud(filtro, estado) {								
    let result;								
    switch (estado.toUpperCase()) {								
        case 'PENDIENTE':								
            result = await db.collection(EQUIPOS).updateOne(filtro, { $set: { estado: 'SOLICITADO' } });								
            break;								
        case 'APROBADO':								
            result = await db.collection(EQUIPOS).updateOne(filtro, { $set: { estado: 'ENUSO' } });								
            break;								
        case 'NO_APROBADO':								
            result = await db.collection(EQUIPOS).updateOne(filtro, { $set: { estado: 'DISPONIBLE' } });								
            break;								
        case 'RETORNADO':								
            result = await db.collection(EQUIPOS).updateOne(filtro, { $set: { estado: 'DISPONIBLE' } });								
            break;								
        default:								
            result = await db.collection(EQUIPOS).updateOne(filtro, { $set: { estado: 'SOLICITADO' } });								
            break;								
    }								
    return result;								
}								
// Iniciar el servidor								
app.listen(PORT, () => {								
    console.log(`Servidor escuchando en el puerto ${PORT}`);								
}); 