import express from 'express';
import logo from './logo.jpg';

const port = process.env.PORT ?? '5000';

const app = express();

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html><html><head></head><body><img src="${logo}" /></body></html>`);
});

app.listen(port, () => console.log(`Started on port ${port}.`));
