import express from 'express';
import Routes from './routes/index'


const app = express();

const PORT = process.env.PORT || 5000




app.listen(PORT, () => {
    console.log(`The server is litening in port: ${PORT}`)
})