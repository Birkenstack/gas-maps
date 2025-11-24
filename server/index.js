const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

// Temporary sample data
const sampleStops = [
  {
    id: "1",
    name: "Sunoco - Loop 338",
    city: "Odessa",
    price: 2.89,
    etaMinutes: 45,
    distanceMiles: 35,
    distanceOffsetMiles: 0.5,
    latitude: 31.845,
    longitude: -102.368,
    isOpen: true,
    lastUpdatedMinutes: 12
  }
];

app.get('/api/stops', (req, res) => {
  res.json(sampleStops);
});

app.listen(4000, () => {
  console.log("Backend running on http://localhost:4000");
});