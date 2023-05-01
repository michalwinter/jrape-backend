import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import fs from 'fs';

let trainsFilePath = "C:/Users/Michal/node/jrape-backend/data.json";
const trainsFile = JSON.parse(fs.readFileSync(trainsFilePath, 'utf8')).trainsFile;

const db = new Low(new JSONFile(trainsFile), []);

async function main() {
  await db.read();

  for (let i = 0; i < db.data.length; i++) {
    const train = db.data[i];

    for (let j = 0; j < train.routes.length; j++) {
      const route = train.routes[j];

      // Check if the route origin is the same as the first point of the route
      // If not, rewrite the route origin to match the first point

      if (route.origin !== route.route[0].name) {
        route.origin = route.route[0].name;
      }
      if (route.destination !== route.route[route.route.length - 1].name) {
        route.destination = route.route[route.route.length - 1].name;
      }

      db.data[i].routes[j] = route;
    }
  }

  await db.write();
}

main();