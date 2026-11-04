import { defineConfig } from 'allure';

// The Allure report that goes into the validation evidence pack. It has no history file, so a validation run never
// writes into (or reads from) the trend history of the everyday report. The output folder is passed on the command line.
export default defineConfig({
  name: 'QA Accelerator - Validation Run',
  plugins: {
    awesome: {
      options: {
        reportName: 'QA Accelerator - Validation Run',
        reportLanguage: 'en',
      },
    },
  },
});
