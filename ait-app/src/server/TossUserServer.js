// TossUserServer.js
require("dotenv").config();
const http = require("http");
const https = require("https");
const fs = require("fs");
const jwt = require("jsonwebtoken");

const TOSS_CLIENT_ID = process.env.TOSS_CLIENT_ID;
const TOSS_KID = process.env.TOSS_KID; // Toss 개발자센터에서 발급
const PRIVATE_KEY = fs.readFileSync("./유저 정보 받아오기_private.key", "utf8");
const PUBLIC_CERT = fs.readFileSync("./유저 정보 받아오기_public.crt", "utf8");

function makeClientAssertion() {
    const payload = {
        iss: TOSS_CLIENT_ID,
        sub: TOSS_CLIENT_ID,
        aud: "https://auth.toss.im/oauth/token",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 300,
    };

    return jwt.sign(payload, PRIVATE_KEY, {
        algorithm: "RS256",
        keyid: TOSS_KID,
    });
}

async function exchangeCodeForToken(authorizationCode) {
    const clientAssertion = makeClientAssertion();
    const body = new URLSearchParams({
        grant_type: "authorization_code",
        code: authorizationCode,
        client_assertion_type:
            "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
        client_assertion: clientAssertion,
    });

    return new Promise((resolve, reject) => {
        const req = https.request(
            {
                hostname: "auth.toss.im",
                path: "/oauth/token",
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            },
            (res) => {
                let data = "";
                res.on("data", (chunk) => (data += chunk));
                res.on("end", () => {
                    try {
                        const json = JSON.parse(data);
                        resolve(json);
                    } catch (err) {
                        reject(err);
                    }
                });
            }
        );
        req.on("error", reject);
        req.write(body.toString());
        req.end();
    });
}

async function getUserInfo(accessToken) {
    return new Promise((resolve, reject) => {
        const req = https.request(
            {
                hostname: "api.toss.im",
                path: "/v1/user/me",
                method: "GET",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            },
            (res) => {
                let data = "";
                res.on("data", (chunk) => (data += chunk));
                res.on("end", () => {
                    try {
                        const json = JSON.parse(data);
                        resolve(json);
                    } catch (err) {
                        reject(err);
                    }
                });
            }
        );
        req.on("error", reject);
        req.end();
    });
}

const server = http.createServer(async (req, res) => {
    if (req.method === "POST" && req.url === "/login") {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", async () => {
            const { authorizationCode } = JSON.parse(body);
            try {
                const token = await exchangeCodeForToken(authorizationCode);
                const user = await getUserInfo(token.access_token);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify(user));
            } catch (err) {
                console.error("Login error:", err);
                res.writeHead(500);
                res.end("Login failed");
            }
        });
    } else {
        res.writeHead(404);
        res.end("Not found");
    }
});

server.listen(3000, () =>
    console.log("Server running at http://localhost:3000")
);
