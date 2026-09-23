FROM node:20-alpine

WORKDIR /app

# Dependencies first so a source-only change doesn't reinstall them.
COPY package*.json ./
RUN npm ci

COPY . .

# NEXT_PUBLIC_* values are inlined into the client bundle during `npm run
# build`, so they must exist BEFORE it runs. CI passes them as a single DOTENV
# build arg (see .github/workflows/build-and-push.yaml) which is written to
# .env.production, the file Next reads for a production build. .dockerignore
# excludes local .env files, so nothing else leaks in.
#
# The build deliberately fails without the WalletConnect id: a missing id
# produces a connect modal that half-works at runtime, which is far worse to
# debug than a red build.
#
# NEXT_PUBLIC_ENABLE_PREVIEW is intentionally NOT set by CI. The preview
# harness is a design-review tool; if it's ever needed on a deployed build,
# pass it explicitly rather than having it ride along by default.
ARG DOTENV=""
RUN printf '%s\n' "$DOTENV" > .env.production && npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
