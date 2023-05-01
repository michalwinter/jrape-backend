import cheerio from 'cheerio';
import axios from 'axios';
import fs from 'fs';

const dataPath = "C:/Users/Michal/node/jrape-backend/data.json";
//const dataPath = "C:/Users/Michal/node/jrape-backend/dataCache.json";

const getToken = async () => {
  const runData = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  if (runData.token && runData.tokenTime && runData.tokenTime > Date.now() - 1000 * 60 * 60) return;

  console.log("Getting token...");
  const html = await axios.get("https://grapp.spravazeleznic.cz/").then(res => res.data);
  const $ = cheerio.load(html);
  const token = $("input[id='token']").val();

  runData.token = token;
  runData.tokenTime = Date.now();

  fs.writeFileSync(dataPath, JSON.stringify(runData, null, 2), "utf8");
  console.log("Token saved to data.json");
}

const search = async (searchInput) => {
  const { token } = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  console.log("Searching for " + searchInput + "...");

  const trains = await axios.post(
    "https://grapp.spravazeleznic.cz/post/trains/GetTrainsWithFilter/" + token,
    {
      SearchByTrainNumber: true,
      SearchPhrase: searchInput,
    }
  ).then(res => res.data.Trains);

  return trains;
}

const getAllTrains = async () => {
  const { token } = JSON.parse(fs.readFileSync(dataPath, "utf8"));

  const trains = await axios.post(
    "https://grapp.spravazeleznic.cz/post/trains/GetTrainsWithFilter/" + token,
    {
      PublicKindOfTrain: [
        "LE",
        "Ex",
        "Sp",
        "rj",
        "TL",
        "EC",
        "SC",
        "AEx",
        "Os",
        "Rx",
        "TLX",
        "IC",
        "EN",
        "R",
        "RJ",
        "NJ",
        "LET"
      ],
      CarrierCode: [
        "991919",
        "992230",
        "992719",
        "993030",
        "990010",
        "993188",
        "991943",
        "991950",
        "993196",
        "992693",
        "991638",
        "991976",
        "993089",
        "993162",
        "991257",
        "991935",
        "991562",
        "991125",
        "992644",
        "992842",
        "991927",
        "993170",
        "991810",
        "992909",
        "991612",
      ],
      Delay: [
        "0",
        "60",
        "5",
        "61",
        "15",
        "-1",
        "30"
      ],
      DelayMin:-99999,
      DelayMax:-99999,
      SearchByTrainNumber: true,
      SearchByTrainName: true,
      SearchPhrase: "",
    }
  ).then(res => res.data.Trains);

  return trains;
}

const prefixes = [
  {
    prefix: "100",
    length: 6,
    note: "Odklon"
  },
  {
    prefix: "30",
    length: 5,
    note: "Náhradní vlak"
  }
]

const getTrain = async (trainId) => {
  const { token } = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  //console.log("Getting train " + trainId + "...");

  const routeInfo = await axios.get(
    "https://grapp.spravazeleznic.cz/OneTrain/RouteInfo/" + token,
    { params: { trainId, _: Date.now(), } }
  ).then(res => res.data);

  let train = {};

  const $ = cheerio.load(routeInfo);

  const alert = $("div.alert").text().replace(/\n/g, "").trim();
  if (alert) return null;
  
  // Train name and number
  let trainTitle = $("div.routeHeader div.hname").text().replace(/\n/g, "").trim().split(" ");
  for (let prefix of prefixes) {
    if (trainTitle[1].length === prefix.length && trainTitle[1].startsWith(prefix.prefix)) {
      train.note = prefix.note;
      trainTitle[1] = trainTitle[1].slice(prefix.prefix.length);
    }
  }
  train.title = trainTitle.join(" ");
  train.type = trainTitle[0];
  train.number = trainTitle[1];
  train.name = trainTitle.slice(2).join(" ");

  // Train carrier
  train.carrier = $("div.routeHeader div.hcarrier").text().replace(/\n/g, "").trim();
  
  // Train origin and destination
  /*let stations = $(`div.routeHeader div[class="row"] div`).html().replace(/<svg\b[^>]*?(?:viewBox=\"(\b[^"]*)\")?>([\s\S]*?)<\/svg>/, "|").replace(/\n/g, "").trim().split(" | ");
  train.origin = stations[0];
  train.destination = stations[1];*/

  let route = [];

  let firstPoint = {};
  firstPoint.name = $("div.route > div > div:first-child").text().replace(/\s\s+/g, ' ').trim();
  
  let stop = $("div.route > div > div.bold").text();
  if (stop) firstPoint.stop = true;

  let times = $("div.route > div > div.col-lg-1:last-of-type > div.col-lg-1.col-xs-1 span.timeTT").text().replace(/\s\s+/g, ' ').trim().split(" ");
  firstPoint.departure = times[0].replace("(", "").replace(")", "");
  
  train.origin = firstPoint.name;

  route.push(firstPoint);

  for (let i = 1; true; i++) {
    let point = {};

    let html = $("div.route > div > div.col-lg-1:last-child" + " > div.row".repeat(i)).html();
    if (!html) break;
    let $point = cheerio.load(html);

    $point("body > div.row").remove();

    point.name = $point("body > div:first-child" ).text().replace(/\s\s+/g, ' ').trim();
    
    let stop = $point("body > div.bold" ).text();
    if (stop) point.stop = true;

    let times = $point("span.timeTT").text().replace(/\s\s+/g, ' ').trim().split(" ");
    
    times.forEach((el, i) => {
      times[i] = el.replace("(", "").replace(")", "");
    });

    if (times.length === 2) times.pop();
    if (times.length === 4) {
      times.shift();
      times.pop();
    }

    if (times.length === 1 && i !== 1) {
      point.arrival = times[0];
    } else if (times.length === 2) {
      point.arrival = times[0];
      point.departure = times[1];
    }
    
    route.push(point);
  }

  train.destination = route[route.length - 1].name;

  train.route = route;

  return train;
}

export default { getToken, search, getTrain, getAllTrains };