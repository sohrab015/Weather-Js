
"use strict";

const API_KEY = "XEA7VRUDHXNXJPVFTE5SLQELJ";

let unit = "metric";
let place = "";
let weatherData = null;
let activeController = null;

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

const pastList = document.getElementById("past-list");
const futureList = document.getElementById("future-list");

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
        "wind": "💨"
    };

    return icons[name] || "🌡️";
}

function windUnit() {
    return unit === "metric" ? "km/h" : "mph";
}

function round(value) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) {
        return "--";
    }

    return Math.round(Number(value));
}

function showError(message) {
    errorText.textContent = message;
    errorBox.classList.remove("hidden");
}

function hideError() {
    errorBox.classList.add("hidden");
}

function updateTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    themeToggle.checked = theme === "dark";
    localStorage.setItem("weather-theme", theme);
}

const savedTheme = localStorage.getItem("weather-theme") || "light";

updateTheme(savedTheme);

themeToggle.addEventListener("change", () => {
    const theme = themeToggle.checked ? "dark" : "light";
    updateTheme(theme);
});

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

    if (!now) {
        throw new Error("Current weather data is unavailable.");
    }

    const timeZone = data.timezone || "UTC";

    document.getElementById("location-name").textContent =
        data.resolvedAddress || place;

    document.getElementById("current-date").textContent =
        new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            timeZone
        });

    document.getElementById("current-icon").textContent = getIcon(now.icon);
    document.getElementById("current-temp").textContent = round(now.temp) + "°";
    document.getElementById("current-conditions").textContent = now.conditions || "Unknown";

    document.getElementById("stat-feels").textContent = round(now.feelslike) + "°";
    document.getElementById("stat-wind").textContent = round(now.windspeed) + " " + windUnit();
    document.getElementById("stat-rain").textContent = round(now.precipprob) + "%";
    document.getElementById("stat-humidity").textContent = round(now.humidity) + "%";

    document.getElementById("last-updated").textContent =
        "Last updated: " +
        new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone
        });

    const allHours = (data.days || [])
        .flatMap(day => day.hours || [])
        .filter(hour => Number.isFinite(Number(hour.datetimeEpoch)))
        .sort((a, b) => a.datetimeEpoch - b.datetimeEpoch);

    const currentTimestamp =
        Number(now.datetimeEpoch) || Math.floor(Date.now() / 1000);

    const past = allHours
        .filter(hour => hour.datetimeEpoch < currentTimestamp)
        .slice(-24);

    const future = allHours
        .filter(hour => hour.datetimeEpoch >= currentTimestamp)
        .slice(0, 24);

    pastList.replaceChildren();
    futureList.replaceChildren();

    past.forEach(hour => {
        pastList.appendChild(makeHourCard(hour));
    });

    future.forEach(hour => {
        futureList.appendChild(makeHourCard(hour));
    });

    if (past.length === 0) {
        pastList.textContent = "Previous hourly data unavailable.";
    }

    if (future.length === 0) {
        futureList.textContent = "Future hourly data unavailable.";
    }
}

async function getWeather() {
    if (!place) return;

    if (!API_KEY || API_KEY === "PASTE_YOUR_NEW_API_KEY_HERE") {
        showError("Please add your new Visual Crossing API key.");
        return;
    }

    if (activeController) {
        activeController.abort();
    }

    const controller = new AbortController();
    activeController = controller;

    hideError();

    emptyState.classList.add("hidden");
    content.classList.add("hidden");
    loading.classList.remove("hidden");

    searchBtn.disabled = true;
    refreshBtn.disabled = true;

    try {
        const baseURL =
            "https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/";

        const encodedPlace = encodeURIComponent(place);

        const params = new URLSearchParams({
            unitGroup: unit,
            include: "hours,current",
            contentType: "json",
            key: API_KEY
        });

        const url =
            `${baseURL}${encodedPlace}/yesterday/tomorrow?${params}`;

        const response = await fetch(url, {
            signal: controller.signal
        });

        if (!response.ok) {
            const errorMessage = await response.text();

            if (response.status === 401) {
                throw new Error("Invalid API key. Check your API key.");
            }

            if (response.status === 429) {
                throw new Error("API request limit exceeded. Try later.");
            }

            if (response.status === 400) {
                throw new Error(errorMessage || "Invalid location or request.");
            }

            if (response.status >= 500) {
                throw new Error("Weather server is unavailable. Try later.");
            }

            throw new Error(errorMessage || "Unable to fetch weather data.");
        }

        const data = await response.json();

        weatherData = data;

        showWeather(data);

        content.classList.remove("hidden");

    } catch (error) {
        if (error.name === "AbortError") {
            return;
        }

        console.error("Weather API Error:", error);

        showError(error.message || "Something went wrong.");

        emptyState.classList.remove("hidden");

    } finally {
        if (activeController === controller) {
            loading.classList.add("hidden");

            searchBtn.disabled = false;
            refreshBtn.disabled = false;

            activeController = null;
        }
    }
}

function searchPlace() {
    const searchValue = input.value.trim();

    if (!searchValue) {
        showError("Please enter a city or location.");
        input.focus();
        return;
    }

    place = searchValue;

    getWeather();
}

function useMyLocation(showFailMessage = true) {
    if (!navigator.geolocation) {
        if (showFailMessage) {
            showError("Your browser does not support geolocation.");
        }

        return;
    }

    hideError();

    emptyState.classList.add("hidden");
    content.classList.add("hidden");
    loading.classList.remove("hidden");

    navigator.geolocation.getCurrentPosition(
        (position) => {
            place =
                position.coords.latitude +
                "," +
                position.coords.longitude;

            getWeather();
        },

        (error) => {
            loading.classList.add("hidden");

            if (!showFailMessage) {
                emptyState.classList.remove("hidden");
                return;
            }

            let message = "Unable to detect your location.";

            if (error.code === 1) {
                message = "Location permission denied. Allow location access in your browser.";
            } else if (error.code === 2) {
                message = "Your device could not determine your location.";
            } else if (error.code === 3) {
                message = "Location request timed out. Try again.";
            }

            showError(message);
            emptyState.classList.remove("hidden");
        },

        {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 60000
        }
    );
}

searchBtn.addEventListener("click", searchPlace);

input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        searchPlace();
    }
});

refreshBtn.addEventListener("click", () => {
    if (place) {
        getWeather();
    }
});

locationBtn.addEventListener("click", () => {
    useMyLocation(true);
});

unitC.addEventListener("click", () => {
    if (unit === "metric") return;

    unit = "metric";

    unitC.classList.add("btn-active");
    unitF.classList.remove("btn-active");

    if (place) {
        getWeather();
    }
});

unitF.addEventListener("click", () => {
    if (unit === "us") return;

    unit = "us";

    unitF.classList.add("btn-active");
    unitC.classList.remove("btn-active");

    if (place) {
        getWeather();
    }
});

useMyLocation(false);
