# ─────────────────────────────────────────────────────────────────────────────
#  ViS-Go — all-in-one image for Google Cloud Run
#
#  This container serves BOTH the built SPA and /api. That is a competition
#  requirement, not a preference: #AIRiserVietnam awards the deployment points
#  only when "the solution must be hosted on Google Cloud Run only", so the
#  submitted link has to be *.run.app and Firebase Hosting cannot be the thing
#  serving the page. See PLAN_CODEX.md §0.3.
#
#  Two stages. Only the final stage's layers are pushed to Artifact Registry,
#  so the toolchain, the TypeScript sources and .env never leave this machine.
# ─────────────────────────────────────────────────────────────────────────────

# ---------- stage 1: build the SPA and bundle the server ----------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Sources and .env together.
#
# Vite bakes every VITE_* variable into the bundle as a string literal AT BUILD
# TIME, so they have to be present right here. A missing VITE_FIREBASE_API_KEY
# does not fail the build — it produces an app that cannot sign anyone in, and
# that only surfaces when a judge clicks the login button.
#
# GEMINI_API_KEY and MAPILLARY_TOKEN also live in .env but carry no VITE_
# prefix, so Vite never puts them in the bundle. They reach the container
# through --set-env-vars at deploy time instead. scripts/deploy-cloudrun.sh
# greps the built assets to prove it.
COPY . .

RUN npm run build

# --packages=external bundles only our own server/*.ts into one file and leaves
# express / @google/genai / compression / dotenv as plain imports, installed in
# the runtime stage. Bundling express into an ESM file is where this breaks:
# it is CommonJS with dynamic requires.
RUN npx esbuild server/index.ts \
      --bundle \
      --platform=node \
      --format=esm \
      --target=node22 \
      --packages=external \
      --outfile=dist-server/index.js

# ---------- stage 2: runtime ----------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# A minimal package.json: four real runtime dependencies rather than the
# thirteen in the root manifest. React, three, leaflet, firebase and the rest
# are already compiled into dist/ and have no business being installed again.
COPY docker/package.runtime.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server

# Cloud Run injects PORT; server/index.ts already reads process.env.PORT, and
# Express binds 0.0.0.0 by default, which is what Cloud Run needs.
ENV PORT=8080
EXPOSE 8080

# The node image ships a non-root `node` user. Use it.
USER node

CMD ["node", "dist-server/index.js"]
