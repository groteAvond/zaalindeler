// init-redis.js
const path = require("path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env.local") });
const Redis = require("ioredis");

// Import de zaalindeling
const { zaalIndeling } = require("./main/helpers/zaalIndeling.ts");

(async () => {
  try {
    const useTls = (process.env.REDIS_TLS || "").toLowerCase() === "true";
    const dbIndex = parseInt(process.env.REDIS_DB || "0", 10);

    const client = new Redis({
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: parseInt(process.env.REDIS_PORT || "6379", 10),
      username: process.env.REDIS_USERNAME || "default",
      password: process.env.REDIS_PASSWORD || "",
      db: dbIndex,
      ...(useTls ? { tls: {} } : {}),
    });

    client.on("error", (e) => console.error("Redis error", e));

    console.log("🔌 Verbonden met Redis");

    // Helper om stoelenmatrix per dag te maken
    function buildEmptyMatrix() {
      return Object.keys(zaalIndeling.rijen).map((rowNum) => {
        const row = zaalIndeling.rijen[parseInt(rowNum)];
        return Array(row.maxStoelen)
          .fill(null)
          .map((_, idx) => ({
            stoel: idx + 1,
            guest: null,
            priority: 1,
            together: false,
          }));
      });
    }

    // Totale capaciteit berekenen
    const TOTAL_CAPACITY = Object.values(zaalIndeling.rijen).reduce(
      (sum, row) => sum + row.maxStoelen,
      0
    );

    console.log("🎭 Stoelindeling geladen. Totale capaciteit =", TOTAL_CAPACITY);

    // Keys resetten
    await client.set("guests", JSON.stringify([]));
    await client.set("lastId", "0");

    const days = ["woensdag", "donderdag", "vrijdag"];
    const emptyMatrix = buildEmptyMatrix();
    for (const day of days) {
      await client.set(`seats:${day}`, JSON.stringify(emptyMatrix));
    }

    await client.set(
      "settings",
      JSON.stringify({
        seatingComplete: false,
        allowRegularToVIPPreference: false,
        requireMutualPreference: false,
        ereleden: [],
        meespelend: [],
        meespelendLeerlingen: [],
        teacherPreferenceWeight: 1.5,
      })
    );

    await client.set(
      "dayAssignments",
      JSON.stringify({
        woensdag: { seats: [], capacity: TOTAL_CAPACITY, assigned: 0 },
        donderdag: { seats: [], capacity: TOTAL_CAPACITY, assigned: 0 },
        vrijdag: { seats: [], capacity: TOTAL_CAPACITY, assigned: 0 },
      })
    );

    await client.set(
      "seatingStatus",
      JSON.stringify({
        isDone: true,
        lastUpdated: new Date().toISOString(),
      })
    );

    await client.set("blockedSeats", JSON.stringify([]));

    console.log("✅ Redis init done. Alle keys met stoelenmatrix aangemaakt.");
    await client.quit();
    process.exit(0);
  } catch (err) {
    console.error("Init failed", err);
    process.exit(1);
  }
})();