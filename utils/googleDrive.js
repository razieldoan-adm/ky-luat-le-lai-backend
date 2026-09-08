
const { google } = require("googleapis");

// ============================================================
// GOOGLE DRIVE OAUTH
// ============================================================

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);
if (process.env.GOOGLE_REFRESH_TOKEN) {
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });
}
// ============================================================
// GOOGLE DRIVE CLIENT
// ============================================================

const getDrive = () => {
  return google.drive({
    version: "v3",
    auth: oauth2Client,
  });
};

// ============================================================
// TẠO URL ĐĂNG NHẬP GOOGLE
// ============================================================

const getGoogleAuthUrl = () => {
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/drive.file",
    ],
  });
};

// ============================================================
// ĐỔI CODE → TOKEN
// ============================================================

const getTokensFromCode = async (code) => {
  const { tokens } =
    await oauth2Client.getToken(code);

  return tokens;
};

// ============================================================
// SET REFRESH TOKEN
// ============================================================

const setRefreshToken = (refreshToken) => {
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });
};

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  oauth2Client,
  getDrive,
  getGoogleAuthUrl,
  getTokensFromCode,
  setRefreshToken,
};
