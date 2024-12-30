import api from '../api.js';

const PORT = process.env.PORT || 3001;

const app = api();

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});


