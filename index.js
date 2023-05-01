import express from 'express';
const app = express();
import path from 'path';
import fs from 'fs';
import cors from 'cors';

import $trains from './_trains.js';
import grapp from './_grapp.js';

const dataDirectory = 'D:/Pubtran/Timetables';

app.use(cors());
app.use(express.json());

app.get('/latest', async (req, res) => {
  res.send(await $trains.getLatest());
});

app.get('/category/:folder', async (req, res) => {
  // read all files in the folder
  const files = await fs.promises.readdir(path.join(dataDirectory, req.params.folder));

  let trains = [];

  // go through each file and load the content
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(dataDirectory, req.params.folder, file);
    let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    data.originTime = data.route[0].departure;
    data.destinationTime = data.route[data.route.length - 1].arrival;
    delete data.route;
    trains.push(data);
  }
  
  res.send(trains);
});

app.get('/category/:folder/:file', async (req, res) => {
  const filePath = path.join(dataDirectory, req.params.folder, req.params.file + '.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  res.send(data);
});

app.get("/grapp-search/:searchInput", async (req, res) => {
  let { searchInput } = req.params;
  console.log(searchInput);
  const trains = await grapp.search(searchInput);
  res.send(trains);
});

app.post("/search", async (req, res) => {
  let { search } = req.body;
  const trains = await $trains.searchTrains(search);
  res.send(trains);
});

app.get("/train/:trainNum", async (req, res) => {
  let { trainNum } = req.params;
  const train = await $trains.getTrain(trainNum);

  res.send(train);
});

app.get("/add/:trainId", async (req, res) => {
  let { trainId } = req.params;
  const train = await grapp.getTrain(trainId);

  res.send(await $trains.addTrain(train));
});

app.delete("/train/:trainNum/:routeId", async (req, res) => {
  let { trainNum, routeId } = req.params;
  if (!trainNum || !routeId) return res.send({ status: "error", message: "Missing parameters" });
  res.send(await $trains.deleteRoute(trainNum, routeId));
});

app.listen(3333, () => {
  console.log('Server started on port 3333!');
  grapp.getToken();
});