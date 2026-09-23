FROM node:20-alpine

WORKDIR /app

# Dependencies first so a source-only change doesn't reinstall them.
COPY package*.json ./
RUN npm ci

COPY . .

# NEXT_PUBLIC_* values are inlined into the client bundle during `npm run
# build`, so they must exist BEFORE it runs. CI passes them as --build-arg;
# promoting them to ENV is what makes Next see them at build time.
#
# The build deliberately fails without the WalletConnect id — a missing id
# produces a connect modal that half-works at runtime, which is far worse to
# debug than a red build.
ARG NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
ARG NEXT_PUBLIC_ALCHEMY_KEY
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=$NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
ENV NEXT_PUBLIC_ALCHEMY_KEY=$NEXT_PUBLIC_ALCHEMY_KEY
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

# NEXT_PUBLIC_ENABLE_PREVIEW is intentionally NOT wired up here. The preview
# harness is a design-review tool; if it's ever needed on a deployed build,
# pass it explicitly rather than having it ride along by default.

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
