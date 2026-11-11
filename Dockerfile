# Test runner image: Node, the project's dependencies and the Playwright browsers, ready to run the suite.
# Keep the tag in step with the @playwright/test version resolved in package-lock.json, because the browsers
# inside the image must match the library.
#
#   docker build -t qa-accelerator-runner .
#   docker run --rm --init --ipc=host --network host \
#     -e UI_URL -e API_URL -e CUSTOMER_EMAIL -e CUSTOMER_PASSWORD -e ADMIN_EMAIL -e ADMIN_PASSWORD \
#     qa-accelerator-runner
#
# --network host (Linux) lets the browser reach the application on the host's localhost, which the
# application's UI requires. Pass any Playwright arguments after the image name, e.g. --grep @smoke.
FROM mcr.microsoft.com/playwright:v1.65.0-noble

WORKDIR /app

# Install dependencies first so this layer is cached until the lockfile changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV CI=true
ENTRYPOINT ["npx", "playwright", "test"]
