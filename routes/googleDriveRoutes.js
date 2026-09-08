const express = require("express");

const {
  getGoogleAuthUrl,
  getTokensFromCode,
  createViolationFolder,
} = require("../utils/googleDrive");

const router = express.Router();

// ============================================================
// 🔐 BẮT ĐẦU GOOGLE OAUTH
// ============================================================

router.get("/auth", (req, res) => {
  try {
    const authUrl = getGoogleAuthUrl();

    res.redirect(authUrl);
  } catch (error) {
    console.error(
      "❌ Google Drive OAuth URL error:",
      error
    );

    res.status(500).send(
      "Không thể tạo Google OAuth URL."
    );
  }
});

// ============================================================
// 🔄 GOOGLE CALLBACK
// ============================================================

router.get(
  "/oauth2callback",
  async (req, res) => {
    try {
      const { code } = req.query;

      if (!code) {
        return res.status(400).send(
          "Thiếu authorization code."
        );
      }

      const tokens =
        await getTokensFromCode(code);

      console.log(
        "================================================"
      );

      console.log(
        "✅ GOOGLE OAUTH THÀNH CÔNG"
      );

      console.log(
        "REFRESH TOKEN:",
        tokens.refresh_token
      );

      console.log(
        "ACCESS TOKEN:",
        tokens.access_token
          ? "Đã nhận"
          : "Không có"
      );

      console.log(
        "================================================"
      );

      res.send(`
        <html>
          <head>
            <title>Google Drive OAuth</title>
          </head>

          <body style="
            font-family: Arial;
            padding: 40px;
          ">

            <h2>
              ✅ Kết nối Google Drive thành công
            </h2>

            <p>
              Hãy quay lại Render và lấy
              <b>REFRESH TOKEN</b> trong Logs.
            </p>

            <p>
              Sau đó thêm nó vào Environment Variable:
            </p>

            <pre>
GOOGLE_REFRESH_TOKEN
            </pre>

            <p>
              ⚠️ Không chia sẻ Refresh Token cho người khác.
            </p>

          </body>
        </html>
      `);

    } catch (error) {
      console.error(
        "❌ Google OAuth callback error:",
        error
      );

      res.status(500).send(
        "Google OAuth thất bại: " +
        error.message
      );
    }
  }
);
router.get("/test-folder", async (req, res) => {
  try {
    const folder = await createViolationFolder();

    console.log("✅ GOOGLE DRIVE TẠO FOLDER THÀNH CÔNG");
    console.log("Folder ID:", folder.id);
    console.log("Folder Name:", folder.name);

    res.json({
      success: true,
      message: "Tạo thư mục Google Drive thành công",
      folder,
    });
  } catch (error) {
    console.error(
      "❌ GOOGLE DRIVE TEST ERROR:",
      error.response?.data || error.message
    );

    res.status(500).json({
      success: false,
      message: "Không thể tạo thư mục Google Drive",
      error: error.response?.data || error.message,
    });
  }
});
module.exports = router;
