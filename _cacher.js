import grapp from './_grapp.js';
import $trains from './_trains.js';
import cron from 'node-cron';
import fs from 'fs';
import fetch from 'node-fetch';

const updatedTrainsFile = "D:/Pubtran/Timetables/updatedTrains.json"

async function main() {
  let time = new Date().toLocaleString();
  await grapp.getToken();

  let trainIds = await grapp.getAllTrains().then(res => res.map(train => train.Id));

  let total = 0;
  let updated = [];
  let added = 0;
  let exists = 0;

  function logProgress(t) {
    console.clear();
    let output = `Caching GRAPP trains... ${time}\n`;
    output += `Getting train ${t}... ${Math.round(total / trainIds.length * 100)}% (${total}/${trainIds.length})\n`;
    console.log(output);
  }

  for (const trainId of trainIds) {
    total++;
    logProgress(trainId);
    const train = await grapp.getTrain(trainId);
    if (!train) continue;
    let { status, reason } = await $trains.addTrain(train);
    if (status === "updated")
      updated.push({ number: train.number, note: train.note, reason, updatedAt: time });
    if (status === "added") added++;
    if (status === "exists") exists++;
  }

  console.log("Finished at: " + new Date().toLocaleString());
  console.log("Total trains: " + total);
  console.log("Existed: " + exists);
  console.log("Created: " + added);
  console.log("Updated: " + updated.length);
  /*fetch('https://ntfy.sh/JRAPE', {
    method: 'POST',
    body: `Total trains created: ${added}/${trainIds.length}`
  })*/
  if (updated.length > 0) {
    let updatedTrains = JSON.parse(fs.readFileSync(updatedTrainsFile, 'utf8'));
    updatedTrains.push(...updated);
    fs.writeFileSync(updatedTrainsFile, JSON.stringify(updatedTrains, null, 2));
    fetch('https://ntfy.sh/JRAPE', {
      method: 'POST',
      body: "Updated trains: " + updated.map(t => t.number + " - " + t.reason).join(";"),
      headers: { 'Priority': '4' }
    })
  }
}

console.clear();
main();
cron.schedule('*/10 * * * *', main);