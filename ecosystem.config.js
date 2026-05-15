module.exports = {
  apps: [
    {
      name: "absensi-pkp",
      script: "start.mjs",
      env: {
        PORT: "8006",
        NODE_ENV: "production",
      },
    },
  ],
};
