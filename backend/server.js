// backend/server.js
const express = require('express');
const bodyParser = require('body-parser');
const apiRoutes = require('./routes/api');
const fs = require('fs');
const path = require('path');
const cors = require('cors');


const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use('/api', apiRoutes);

// Serve frontend (optional)
app.use(express.static(path.join(__dirname, '..', 'public')));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`BAMS backend listening on port ${PORT}`);
});
