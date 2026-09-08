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
// LẤY HOẶC TẠO THƯ MỤC ẢNH VI PHẠM
// ============================================================

const getOrCreateViolationFolder = async () => {
  const drive = getDrive();

  const folderName = "KyLuatLeLai-AnhViPham";

  // ----------------------------------------------------------
  // TÌM THƯ MỤC ĐÃ CÓ
  // ----------------------------------------------------------

  const response = await drive.files.list({
    q: [
      `name = '${folderName}'`,
      "mimeType = 'application/vnd.google-apps.folder'",
      "trashed = false",
    ].join(" and "),
    fields: "files(id, name)",
    spaces: "drive",
  });

  // ----------------------------------------------------------
  // NẾU ĐÃ CÓ → DÙNG LẠI
  // ----------------------------------------------------------

  if (response.data.files && response.data.files.length > 0) {
    console.log(
      "✅ ĐÃ TÌM THẤY THƯ MỤC GOOGLE DRIVE:",
      response.data.files[0].name
    );

    console.log(
      "📁 FOLDER ID:",
      response.data.files[0].id
    );

    return response.data.files[0];
  }

  // ----------------------------------------------------------
  // NẾU CHƯA CÓ → TẠO MỚI
  // ----------------------------------------------------------

  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id, name",
  });

  console.log(
    "✅ ĐÃ TẠO THƯ MỤC GOOGLE DRIVE:",
    folder.data.name
  );

  console.log(
    "📁 FOLDER ID:",
    folder.data.id
  );

  return folder.data;
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
  getOrCreateViolationFolder,
};
