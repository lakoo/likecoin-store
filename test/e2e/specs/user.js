const { initBrowser } = require('../util/index.js');

module.exports = {
  beforeEach: (browser) => {
    initBrowser(browser);
    browser.pause(1000);
    browser.page.metamask().acceptTerms();
  },

  /* eslint quote-props: "off" */
  'Register': (browser) => {
    const devServer = browser.globals.devServerURL;

    browser
      .url(devServer)
      .click('.lc-container-3 button.account-btn')
      .waitForElementVisible('#registerForm', 2000)
      .pause(6000)
      .setValue('#registerForm input[type=text][required=required]', 'testacct')
      .submitForm('#registerForm')
      .pause(2000)
      .windowHandles(function func(res) {
        const metamaskPopup = res.value[1];
        this.switchWindow(metamaskPopup);
      })
      .pause(1000)
      .verify.title('MetaMask Notification')
      .click('#app-content button:nth-child(2)')
      .pause(1000)
      .windowHandles(function func(res) {
        const originalWindow = res.value[0];
        this.switchWindow(originalWindow);
      })
      .waitForElementVisible('#user-info-form', 5000)
      .waitForElementVisible('.toolbars', 1000)
      .verify.containsText('.toolbars > div > div > span', 'View your page')
      .end();
  },

  'Edit': (browser) => {
    const devServer = browser.globals.devServerURL;
    const inputSequence = [];
    for (let i = 0; i < 100; i += 1) {
      inputSequence.push(browser.Keys.BACK_SPACE);
    }
    inputSequence.push('Test Name');

    browser
      .url(`${devServer}/in`)
      .waitForElementVisible('#user-info-form', 2000)
      .pause(6000)
      .click('#user-info-form .input-display-name')
      .waitForElementVisible('#user-info-form div.btn-container div:nth-child(1) button', 2000)
      .setValue('#user-info-form .input-display-name', inputSequence)
      .pause(2000)
      .click('#user-info-form div.btn-container div:nth-child(1) button')
      .pause(2000)
      .windowHandles(function func(res) {
        const metamaskPopup = res.value[1];
        this.switchWindow(metamaskPopup);
      })
      .pause(1000)
      .verify.title('MetaMask Notification')
      .click('#app-content button:nth-child(2)')
      .pause(2000)
      .windowHandles(function func(res) {
        const originalWindow = res.value[0];
        this.switchWindow(originalWindow);
      })
      .waitForElementVisible('#user-info-form', 5000)
      .waitForElementVisible('.toolbars', 1000)
      .pause(1000)
      .verify.containsText('.toolbars > div > div > span', 'View your page')
      .end();
  },

  'Claim coupon test and error dialog': (browser) => {
    const devServer = browser.globals.devServerURL;
    browser
      .url(`${devServer}/in`)
      .waitForElementVisible('#redeemForm', 2000)
      .click('#redeemForm input[type=text]')
      .setValue('#redeemForm input[type=text]', '22223333')
      .pause(1000)
      .click('#confirm-btn')
      .pause(1000)
      .waitForElementVisible('.md-dialog', 2000)
      .verify.containsText('.md-dialog', 'Coupon Error')
      .click('.md-dialog #btn-confirm')
      .end();
  },
};
