import { Prisma, PrismaClient } from "@prisma/client";
import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import passport from "passport";
import { initialize } from "express-openapi";
import swaggerUi from "swagger-ui-express";

import * as dotenv from "dotenv";
dotenv.config();

// import api from "./routers/v1";
import trackGroups from "./routers/v1/trackGroups/index";
import auth from "./routers/auth";
// Loads the JWT strategy
import "./auth/passport";

import apiDoc from "./routers/v1/api-doc";

const prisma = new PrismaClient();
const app = express();

if (process.env.NODE_ENV === "development") {
  var cors = require("cors");
  app.use(
    cors({
      origin: ["http://localhost:8080", "http://localhost:3000"],
      credentials: true,
    })
  );
}

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

const routes = [
  "trackGroups",
  "trackGroups/{id}",
  "tracks",
  "tracks/{id}",
  "artists",
  "artists/{id}",
  "posts/{id}",
  "users",
  "users/{userId}",
  "users/{userId}/artists",
  "users/{userId}/artists/{artistId}",
  "users/{userId}/trackGroups",
  "users/{userId}/trackGroups/{trackGroupId}",
  "users/{userId}/tracks",
  "users/{userId}/tracks/{trackId}",
  "users/{userId}/posts/{postId}/publish",
  "users/{userId}/posts/{postId}",
  "users/{userId}/posts/drafts",
  "users/{userId}/posts",
];

initialize({
  app,
  apiDoc,
  // FIXME: it looks like express-openapi doesn't handle
  // typescript files very well.
  // https://github.com/kogosoftwarellc/open-api/issues/838
  // paths: "./src/routers/v1",
  // routesGlob: "**/*.{ts,js}",
  // routesIndexFileRegExp: /(?:index)?\.[tj]s$/,
  paths: routes.map((r) => ({
    path: "/v1/" + r,
    module: require(`./routers/v1/${r}`),
  })),
});

app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(undefined, {
    swaggerOptions: {
      url: "http://localhost:3000/api-docs",
    },
  })
);

// app.use("/api/v1", api);
app.use("/auth", auth);

app.use(express.static("public"));

// app.use(function (req, res, next) {
//   res.sendFile(path.join(__dirname, "../", "public", "app.html"));
// });

const server = app.listen(3000, () =>
  console.info(`
🚀 Server ready at: http://localhost:3000`)
);
