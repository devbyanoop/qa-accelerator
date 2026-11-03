// Declarative Jenkins pipeline.
//
// Agent requirements: Linux with Docker (and arm64 emulation, see infra/toolshop/docker-compose.yml) and the
// NodeJS plugin with a tool named "node-20". Tests run in the runner image from the Dockerfile, so the agent
// needs no browsers installed.
//
// Credentials (Manage Jenkins > Credentials, kind "Secret text"): qa-customer-email, qa-customer-password,
// qa-admin-email, qa-admin-password.
pipeline {
  agent { label 'linux && docker' }

  options {
    timeout(time: 30, unit: 'MINUTES')
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  triggers {
    cron('H 2 * * *') // nightly
  }

  tools {
    nodejs 'node-20'
  }

  environment {
    RUNNER_IMAGE      = "qa-accelerator-runner:${env.BUILD_NUMBER}"
    CUSTOMER_EMAIL    = credentials('qa-customer-email')
    CUSTOMER_PASSWORD = credentials('qa-customer-password')
    ADMIN_EMAIL       = credentials('qa-admin-email')
    ADMIN_PASSWORD    = credentials('qa-admin-password')
  }

  stages {
    stage('Build runner image') {
      steps {
        sh 'docker build -t "$RUNNER_IMAGE" .'
      }
    }

    stage('Quality') {
      steps {
        sh 'docker run --rm --entrypoint sh "$RUNNER_IMAGE" -c "npm run lint && npm run typecheck && npm run format:check"'
      }
    }

    stage('Start application under test') {
      steps {
        sh 'node scripts/start-app.mjs'
      }
    }

    stage('Run tests') {
      steps {
        sh '''
          mkdir -p playwright-report test-results allure-results
          docker run --rm --init --ipc=host --network host \
            --user "$(id -u):$(id -g)" -e HOME=/tmp \
            -e TEST_ENV=jenkins -e APP_NAME=Toolshop \
            -e UI_URL=http://localhost:4200 -e API_URL=http://localhost:8091 \
            -e CUSTOMER_EMAIL -e CUSTOMER_PASSWORD -e ADMIN_EMAIL -e ADMIN_PASSWORD \
            -v "$WORKSPACE/playwright-report:/app/playwright-report" \
            -v "$WORKSPACE/test-results:/app/test-results" \
            -v "$WORKSPACE/allure-results:/app/allure-results" \
            "$RUNNER_IMAGE"
        '''
      }
    }
  }

  post {
    always {
      junit allowEmptyResults: true, testResults: 'test-results/junit.xml'
      sh 'npm ci --ignore-scripts && npx allure generate allure-results --clean || true'
      archiveArtifacts artifacts: 'playwright-report/**, allure-report/**, test-results/**', allowEmptyArchive: true
      // To browse the reports inside Jenkins, add the HTML Publisher plugin and publish
      // playwright-report/ or allure-report/ with publishHTML.
      sh 'node scripts/start-app.mjs --stop || true'
      sh 'docker rmi "$RUNNER_IMAGE" || true'
    }
  }
}
