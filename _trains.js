import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import fs from 'fs';
import moment from 'moment';

let trainsFilePath = "C:/Users/Michal/node/jrape-backend/data.json";
let trainsCacheFilePath = "C:/Users/Michal/node/jrape-backend/dataCache.json";

const trainsFile = JSON.parse(fs.readFileSync(trainsFilePath, 'utf8')).trainsFile;

const db = new Low(new JSONFile(trainsFile), []);

function uniqueRoute(train, data) {
  let unique = true;
  let reason = "Origin or destination name";

  for (let i = 0; i < train.routes.length; i++) {
    const route = train.routes[i];

    // 1. Origin and destination
    if (route.origin === data.origin && route.destination === data.destination) {
      reason = "Length of route";
      // 2. Length of route
      if (route.route.length === data.route.length) {
        reason = "Time of departure";
        // 3. Time of first point departure
        if (route.route[0].departure === data.route[0].departure) {
          reason = "Time of arrival";
          // 4. Time of last point arrival
          if (route.route[route.route.length - 1].arrival === data.route[data.route.length - 1].arrival) {
            unique = false;
            break;
          }
        }
      }
    }
  }
  return { unique, reason };
}

function dataToRoute(data, timestamp, uniqueReason) {
  let route = {
    timestamp,
    note: data.note || "",
    origin: data.origin,
    destination: data.destination,
    route: data.route,
  }
  if (uniqueReason) route.uniqueReason = uniqueReason;
  return route;
}

function setTimestampsDate(train) {
  for (let i = 0; i < train.routes.length; i++) {
    train.routes[i].date = moment(train.routes[i].timestamp).format("ddd DD.MM.YYYY HH:mm");
  }
  return train;
}

export default {
  async getTrain(num) {
    await db.read();
    return db.data.find(train => train.number == num);
  },
  async getTrainIndex(num) {
    await db.read();
    return db.data.findIndex(train => train.number == num);
  },
  async searchTrains(input) {
    await db.read();
    return db.data.filter(train => train.title.toLowerCase().includes(input.toLowerCase())).map(setTimestampsDate);
  },
  async getLatest() {
    await db.read();
    return db.data.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 10).map(setTimestampsDate);
  },
  async addTrain(data) {
    let trainNumber = data.number;
    let trainI = await this.getTrainIndex(trainNumber);
    let output = {};
    let timestamp = Date.now();
    if (trainI !== -1) {
      let { unique, reason } = uniqueRoute(db.data[trainI], data);
      if (unique) {
        db.data[trainI].routes.push(dataToRoute(data, timestamp, reason));
        db.data[trainI].updatedAt = timestamp;
        output.status = "updated";
        output.reason = reason;
      } else output.status = "exists";
    } else {
      let route = dataToRoute(data, timestamp);
      let train = data;
      delete train.route;
      delete train.origin;
      delete train.destination;
      delete train.note;
      train.updatedAt = timestamp;
      train.routes = [route];

      db.data.push(train);

      output.status = "added";
    }
    await db.write();
    return output;
  },
  async deleteRoute(trainNumber, routeTimestamp) {
    let trainI = await this.getTrainIndex(trainNumber);
    if (trainI === -1) return { status: "error", message: "Train not found" };
    let routeI = db.data[trainI].routes.findIndex(route => route.timestamp == routeTimestamp);
    if (routeI === -1) return { status: "error", message: "Route not found" };
    db.data[trainI].routes.splice(routeI, 1);
    db.data[trainI].updatedAt = Date.now();
    await db.write();
    return { status: "deleted" };
  }
}