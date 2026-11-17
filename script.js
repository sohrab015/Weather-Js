const apiKey = "YOUR_API_KEY";
let unit = "metric";
let place = "";

const input = document.getElementById("location-input");
const searchBtn = document.getElementById("search-btn");
const locationBtn = document.getElementById("location-btn");
const refreshBtn = document.getElementById("refresh-btn");
const unitC = document.getElementById("unit-c");
const unitF = document.getElementById("unit-f");
const themeToggle = document.getElementById("theme-toggle");

const loading = document.getElementById("loading");
const emptyState = document.getElementById("empty-state");
const content = document.getElementById("weather-content");
const errorBox = document.getElementById("error-box");
const errorText = document.getElementById("error-text");

function getIcon(name) {
  const icons = {
    "clear-day": "☀️",
    "clear-night": "🌙",
    "partly-cloudy-day": "⛅",
    "partly-cloudy-night": "☁️",
    "cloudy": "☁️",
    "rain": "🌧️",
    "snow": "❄️",
    "fog": "🌫️",
    "wind": "💨",
  };
  return icons[name] || "🌡️";
}

function windUnit() {
  return unit === "metric" ? "km/h" : "mph";
}

function round(value) {
  return Math.round(value || 0);
}

function showError(message) {
  errorText.textContent = message;
  errorBox.classList.remove("hidden");
}

function makeHourCard(hour) {
  const template = document.getElementById("hour-card-template");
  const card = template.content.cloneNode(true);
  card.querySelector(".hour-time").textContent = hour.datetime.slice(0, 5);
  card.querySelector(".hour-icon").textContent = getIcon(hour.icon);
  card.querySelector(".hour-temp").textContent = round(hour.temp) + "°";
  card.querySelector(".hour-rain").textContent = "💧 " + round(hour.precipprob) + "%";
  card.querySelector(".hour-wind").textContent = round(hour.windspeed) + " " + windUnit();
  return card;
}

function showWeather(data) {
  const now = data.currentConditions;

  document.getElementById("location-name").textContent = data.resolvedAddress;
  document.getElementById("current-date").textContent = new Date().toDateString();
  document.getElementById("current-icon").textContent = getIcon(now.icon);
  document.getElementById("current-temp").textContent = round(now.temp) + "°";
  document.getElementById("current-conditions").textContent = now.conditions;
  document.getElementById("stat-feels").textContent = round(now.feelslike) + "°";
  document.getElementById("stat-wind").textContent = round(now.windspeed) + " " + windUnit();
  document.getElementById("stat-rain").textContent = round(now.precipprob) + "%";
  document.getElementById("stat-humidity").textContent = round(now.humidity) + "%";
  document.getElementById("last-updated").textContent = "Last updated: " + new Date().toLocaleTimeString();

  const allHours = data.days.flatMap((day) => day.hours || []);
  const past = allHours.filter((h) => h.datetimeEpoch < now.datetimeEpoch).slice(-24);
  const future = allHours.filter((h) => h.datetimeEpoch >= now.datetimeEpoch).slice(0, 24);

  const pastList = document.getElementById("past-list");
  const futureList = document.getElementById("future-list");
  pastList.innerHTML = "";
  futureList.innerHTML = "";

  past.forEach((hour) => pastList.appendChild(makeHourCard(hour)));
  future.forEach((hour) => futureList.appendChild(makeHourCard(hour)));
}

async function getWeather() {
  if (place === "") return;

  errorBox.classList.add("hidden");
  emptyState.classList.add("hidden");
  content.classList.add("hidden");
  loading.classList.remove("hidden");

  try {
    const url =
      "https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/" +
      encodeURIComponent(place) +
      "/yesterday/tomorrow?unitGroup=" + unit +
      "&include=hours,current&contentType=json&key=" + apiKey;

    let response;
    try {
      response = await fetch(url);
    } catch (networkError) {
      throw new Error("No internet connection.");
    }

    if (response.status === 401) {
      throw new Error("Invalid API key. Check the apiKey in script.js.");
    }
    if (response.status === 429) {
      throw new Error("Too many requests. Try again later.");
    }
    if (!response.ok) {
      throw new Error("Could not find that location.");
    }

    const data = await response.json();
    showWeather(data);
    content.classList.remove("hidden");
  } catch (error) {
    showError(error.message);
    emptyState.classList.remove("hidden");
  }

  loading.classList.add("hidden");
}

function searchPlace() {
  place = input.value.trim();
  if (place === "") {
    showError("Please type a location first.");
    return;
  }
  getWeather();
}

function useMyLocation(showFailMessage) {
  if (!navigator.geolocation) {
    if (showFailMessage) showError("Your browser does not support location.");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      place = position.coords.latitude + "," + position.coords.longitude;
      getWeather();
    },
    () => {
      if (showFailMessage) showError("Could not get your location.");
    }
  );
}

searchBtn.addEventListener("click", searchPlace);

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") searchPlace();
});

refreshBtn.addEventListener("click", getWeather);

locationBtn.addEventListener("click", () => useMyLocation(true));

unitC.addEventListener("click", () => {
  unit = "metric";
  unitC.classList.add("btn-active");
  unitF.classList.remove("btn-active");
  getWeather();
});

unitF.addEventListener("click", () => {
  unit = "us";
  unitF.classList.add("btn-active");
  unitC.classList.remove("btn-active");
  getWeather();
});

themeToggle.addEventListener("change", () => {
  const theme = themeToggle.checked ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", theme);
});

useMyLocation(false);
