const nodeBin = process.env.NODE_BIN || "node";

module.exports = {
  apps: [
    {
      name: "absensi-pkp",
      script: "start.mjs",
      interpreter: nodeBin,
      env: {
        PORT: "8006",
        NODE_ENV: "production",
      },
    },
  ],
};
