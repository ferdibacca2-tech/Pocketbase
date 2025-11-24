import "./style.css";
import PocketBase from "pocketbase";

const pb = new PocketBase("http://127.0.0.1:8090");

// variabili
let terre = [];
let ul;

// mappa
var map = L.map("map", {
  maxBounds: [[-90, -180], [90, 180]],
  maxBoundsViscosity: 1.0
}).setView([45.255, 10.04], 6);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  minZoom: 1.5,
  maxZoom: 19,
  noWrap : true,
}).addTo(map);

// colore marker in base alla temperatura
function coloreTemperatura(t) {
  if (t < 0) return "blue";
  if (t < 10) return "cyan";
  if (t < 20) return "green";
  if (t < 30) return "orange";
  return "red";
}

// nominatim
async function getCityFromCoords(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
  const res = await fetch(url);
  const data = await res.json();

  return (
    data.address.city ||
    data.address.town ||
    data.address.village ||
    data.address.hamlet ||
    data.address.municipality ||
    "Sconosciuto"
  );
}

// open-meteo
async function getTemp(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`;
  const res = await fetch(url);
  const data = await res.json();
  return data.current_weather.temperature;
}

// caricamento iniziale
const caricaDati = async () => {
  const resultList = await pb.collection("Meteo").getList();
  const items = resultList.items;

  terre = items.map((i) => ({
    id: i.id,
    lat: i.geo_point?.lat,
    lon: i.geo_point?.lon,
    place: i.localita,
    temp: Number(i.temperatura),
  }));

  map.eachLayer((l) => {
    if (l instanceof L.Circle) map.removeLayer(l);
  });

  terre.forEach((t) => {
    L.circle([t.lat, t.lon], {
      color: coloreTemperatura(t.temp),
      fillColor: coloreTemperatura(t.temp),
      fillOpacity: 0.7,
      radius: 500,
    })
      .addTo(map)
      .bindPopup(
        `<b>${t.place}</b><br>
         Temp: ${t.temp}°C<br>
         Lat: ${t.lat}<br>
         Lon: ${t.lon}<br>
         ID: ${t.id}`
      );
  });

  mostraLista();
  calcolaStatistiche();
};

// pannello sinistro
function mostraLista() {
  const media = document.getElementById("media");
  media.innerHTML = "";

  ul = document.createElement("ul");
  media.appendChild(ul);

  terre.forEach((t) => {
    const li = document.createElement("li");
    li.innerText = `${t.place} | ${t.temp}°C | Lat: ${t.lat} | Lon: ${t.lon}`;
    ul.appendChild(li);
  });
}

// statistiche
function calcolaStatistiche() {
  const count = terre.length;
  const temps = terre.map((t) => t.temp);

  document.getElementById("s_count").innerText = count;

  if (count === 0) return;

  document.getElementById("s_avg").innerText =
    (temps.reduce((a, b) => a + b) / count).toFixed(1);

  document.getElementById("s_max").innerText = Math.max(...temps);
  document.getElementById("s_min").innerText = Math.min(...temps);
}

// crea nuovo record
const creaRecord = async (lat, lon) => {
  const city = await getCityFromCoords(lat, lon);
  const temp = await getTemp(lat, lon);

  const data = {
    geo_point: { lat, lon },
    localita: city,
    temperatura: temp,
  };

  await pb.collection("Meteo").create(data);

  alert(`Punto salvato!\n${city}\n${temp}°C`);

  await caricaDati();
};

// click sulla mappa
map.on("click", async (e) => {
  const lat = e.latlng.lat;
  const lon = e.latlng.lng;

  creaRecord(lat, lon);
});

// ricerca
window.search = function () {
  const input = document.getElementById("search").value.toLowerCase();
  ul.innerHTML = "";

  const filtrati = terre.filter(
    (t) =>
      t.place.toLowerCase().includes(input) ||
      String(t.temp).includes(input)
  );

  filtrati.forEach((t) => {
    const li = document.createElement("li");
    li.innerText = `${t.place} | ${t.temp}°C | Lat: ${t.lat} | Lon: ${t.lon}`;
    ul.appendChild(li);
  });
};

// avvio
caricaDati();