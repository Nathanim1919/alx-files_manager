import express from 'express';
import indexRouter from './routes/index';

const app = express();
app.use(express.json());
app.use('/', indexRouter);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`The server is litening in port: ${PORT}`);
});
