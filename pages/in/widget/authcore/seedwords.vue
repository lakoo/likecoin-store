<!-- eslint-disable max-len -->
<template>
  <div
    v-if="isLoading"
    key="loading"
    class="likepay-body likepay-body--center"
  >
    <span class="likepay-text-panel">
      {{ $t('General.loading') }}
    </span>
  </div>
  <div
    v-else
    key="panel"
    class="likepay-body"
  >
    <header class="likepay-body__header">
      <div class="likepay-panel__header-title">{{ $t('AuthCoreWidget.seedWords.title') }}</div>
    </header>
    <div class="likepay-panel">
      <section
        v-if="isShowWarning"
        class="likepay-panel__section-container"
      >
        <div class="likepay-panel__section-meta">
          <h1>{{ $t('General.label.warning') }}</h1>
          <p>{{ $t('AuthCore.SeedWords.seedWordsWarning') }}</p>
          <p>{{ $t('AuthCore.SeedWords.seedWordsDescription') }}</p>
        </div>
      </section>
      <section
        v-else
        class="likepay-panel__section-container"
      >
        <div
          v-if="error"
          class="likepay-panel__section-meta"
        >{{ error.message || error }}</div>
        <div
          class="likepay-panel__section-meta"
        >
          <div class="likepay-panel__section-meta">
            <p>{{ $t('AuthCore.SeedWords.seedWordsDescription') }}</p>
          </div>
          <textarea
            v-model="seedWords"
            v-if="seedWords"
            class="lc-margin-top-8"
            :rows="6"
            readonly
          />
          <template v-else-if="isPasswordNeeded">
            <div class="likepay-panel__section-meta">
              <p>{{ $t('AuthCore.SeedWords.passwordDescription') }}</p>
            </div>
            <input
              v-model="password"
              v-if="isPasswordNeeded"
              type="password"
              required
            >
          </template>
        </div>
      </section></div>
    <footer class="likepay-panel__footer">
      <div v-if="isShowWarning">
        <button
          class="likepay-block-button"
          @click="onClickAgreeWarning"
        >
          {{ $t('General.accept') }}
        </button>
      </div>
      <div v-else-if="!getUserIsRegistered">
        <button
          class="likepay-block-button"
          @click="onClickSignInButton"
        >
          {{ $t('Home.Header.button.signIn') }}
        </button>
      </div>
      <div
        v-else-if="!getAuthCoreAuthClient || getAuthCoreNeedReAuth"
        class="create-account-wrapper"
      >
        <button
          class="likepay-block-button"
          @click="onClickAuthCoreReAuth"
        >
          {{ $t('AuthCore.button.reAuthNeeded') }}
        </button>
      </div>
      <div v-else-if="seedWords">
        <button
          v-clipboard:copy="seedWords"
          v-clipboard:success="onCopySeedWords"
          type="button"
          class="likepay-block-button"
        >
          {{ $t(`General.button.${hasCopiedSeedWords ? 'copied' : 'copy'}`) }}
        </button>
      </div>
      <div v-else>
        <button
          class="likepay-block-button"
          @click="onClickAuthenticate"
        >
          {{ $t('AuthCore.button.exportSeedWords') }}
        </button>
      </div>
    </footer>
  </div>
</template>


<script>
import { mapActions, mapGetters } from 'vuex';
import { AuthcoreCosmosProvider, AuthcoreVaultClient } from '@likecoin/secretd-js';

import { AUTHCORE_API_HOST } from '@/constant';

export default {
  name: 'payment',
  layout: 'likepay',
  data() {
    return {
      hasCopiedSeedWords: false,
      isLoading: false,
      isInited: false,
      secretToken: '',
      isShowWarning: true,
      isPasswordNeeded: false,
      password: '',
      seedWords: '',
      error: '',
    };
  },
  head() {
    return {
      title: 'Authcore export seed words',
    };
  },
  computed: {
    ...mapGetters([
      'getAuthCoreAuthClient',
      'getUserIsRegistered',
      'getAuthCoreNeedReAuth',
    ]),
  },
  async mounted() {
    this.error = '';
    this.checkAuthCoreStatus();
  },
  methods: {
    ...mapActions([
      'setReAuthDialogShow',
      'forceAuthCoreReAuth',
    ]),
    async checkAuthCoreStatus() {
      this.isLoading = true;
      try {
        const authClient = this.getAuthCoreAuthClient;
        if (authClient) {
          const res = await authClient.startSecretdExportAuthentication();
          this.isPasswordNeeded = res.challenges.includes('PASSWORD');
          this.isInited = true;
        } else {
          throw new Error('authClient is not initialized');
        }
      } catch (err) {
        // If the user resets his password via forget password flow
        // (not via user setting as that requires old password) recently,
        // this API calls will fail with message last reset password is too recent, with
        // response 400 with message "last reset password is too recent"
        console.error(err);
        this.error = err;
      }
      this.isLoading = false;
    },
    async onClickAgreeWarning() {
      this.isShowWarning = false;
    },
    onClickSignInButton() {
      this.$router.push({
        name: 'in-register',
        query: { platform: 'authcore', redirect: `${window.location.origin}${this.$route.fullPath}` },
      });
    },
    onClickAuthCoreReAuth() {
      this.setReAuthDialogShow(true);
    },
    async onClickAuthenticate() {
      this.error = '';
      try {
        this.isLoading = true;
        if (!this.isInited) {
          await this.checkAuthCoreStatus();
        }
        if (this.isInited && !this.error) {
          await this.getAccessToken();
          await this.exportSeedWords();
        } else {
          throw new Error('NOT_INITIALIZED');
        }
      } catch (err) {
        console.error(err);
        this.error = err;
      } finally {
        this.isLoading = false;
      }
    },
    async getAccessToken() {
      const authClient = this.getAuthCoreAuthClient;
      if (this.isPasswordNeeded) {
        if (!this.password) {
          throw new Error('PLEASE_ENTER_AUTHCORE_PASSWORD');
        }
        const res = await authClient.authenticateSecretdWithPassword(this.password);
        this.secretToken = res.secretd_access_token;
      } else {
        const res = await authClient.authenticateSecretdWithNoPassword();
        this.secretToken = res.secretd_access_token;
      }
    },
    async exportSeedWords() {
      if (!this.secretToken) throw new Error('NOT_AUTHENTICATED');
      const vaultClient = new AuthcoreVaultClient({
        apiBaseURL: AUTHCORE_API_HOST,
        accessToken: this.secretToken,
      });
      const cosmosProvider = new AuthcoreCosmosProvider({ client: vaultClient });
      const seeds = await cosmosProvider.exportMnemonic();
      this.seedWords = seeds;
    },
    onCopySeedWords() {
      this.hasCopiedSeedWords = true;
    },
  },
};
</script>

<style lang="scss">
@import '~assets/variables';

.likepay-body {
  &__header {
    display: flex;
    align-items: center;
    justify-content: center;

    padding: 12px 8px;

    &,
    & h1 {
      text-align: center;

      color: $civic-green;

      font-size: 18px;
      font-weight: 600;
    }

    & h1 {
      margin: 0;
      margin-left: 8px;

      line-height: 1.5;
    }
  }
  & input {
    width: 100%;

    margin-top: 8px;
    padding: 8px;

    border: 2px solid #ccc;
    border-radius: 4px;

    font-size: 16px;
  }
}
</style>
