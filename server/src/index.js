const config = require('./config');
const app = require('./app');

app.listen(config.port, () => {
  console.log(`KickVault API listening on http://localhost:${config.port}`);
});
