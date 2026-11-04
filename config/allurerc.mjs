import { defineConfig } from 'allure';

export default defineConfig({
  name: 'QA Accelerator - Test Report',
  output: './reports/standard/allure',
  historyPath: './.allure/history.jsonl',
  plugins: {
    awesome: {
      options: {
        reportName: 'QA Accelerator - Test Report',
        reportLanguage: 'en',
      },
    },
  },
});
