import { Component } from '@angular/core';

// Providers
import { Events } from 'ionic-angular';
import { AppProvider } from '../../providers/app/app';
import { BitPayCardProvider } from '../../providers/bitpay-card/bitpay-card';
import { GiftCardProvider } from '../../providers/gift-card/gift-card';
import { HomeIntegrationsProvider } from '../../providers/home-integrations/home-integrations';
import { Network, PersistenceProvider } from '../../providers/persistence/persistence';
import { TabProvider } from '../../providers/tab/tab';
import { IABCardProvider } from '../../providers/in-app-browser/card';

@Component({
  selector: 'page-cards',
  templateUrl: 'cards.html',

})
export class CardsPage {
  public bitpayCardItems;
  public showGiftCards: boolean;
  public showBitPayCard: boolean;
  public activeCards: any;
  public tapped = 0;
  public showBitpayCardGetStarted: boolean;
  public ready: boolean;
  public cardExperimentEnabled: boolean;
  public gotCardItems: boolean = false;

  constructor(
    private appProvider: AppProvider,
    private homeIntegrationsProvider: HomeIntegrationsProvider,
    private bitPayCardProvider: BitPayCardProvider,
    private giftCardProvider: GiftCardProvider,
    private persistenceProvider: PersistenceProvider,
    private tabProvider: TabProvider,
    private events: Events,
    private iabCardProvider: IABCardProvider
  ) {
    this.persistenceProvider.getCardExperimentFlag().then(status => {
      this.cardExperimentEnabled = status === 'enabled';
    });
  }

  async ionViewWillEnter() {
    this.showGiftCards = this.homeIntegrationsProvider.shouldShowInHome(
      'giftcards'
    );
    this.showBitpayCardGetStarted = this.homeIntegrationsProvider.shouldShowInHome(
      'debitcard'
    );
    this.showBitPayCard = !!this.appProvider.info._enabledExtensions.debitcard;
    // check persistence first
    this.bitpayCardItems = await this.filterCards('Galileo');
    await this.fetchAllCards();

  }

  // method for filtering out and showing one galileo card
  private async filterCards(provider: string) {
    let cards = await this.persistenceProvider.getBitpayDebitCards(Network.testnet);
    let idx = cards.findIndex( c => c.provider === provider);
    cards.splice(idx, 1);
    return cards;
  }

  private async fetchBitpayCardItems() {

    if (this.cardExperimentEnabled) {

      await this.iabCardProvider.getCards();
      this.bitpayCardItems = await this.filterCards('Galileo');

      if (this.bitpayCardItems) {
        for (let card of this.bitpayCardItems) {
          if (card.provider === 'galileo') {
            this.persistenceProvider.setReachedCardLimit(true);
            this.events.publish('reachedCardLimit');
            break;
          }
        }
      }
      this.gotCardItems = true;

    } else {
      this.bitpayCardItems = await this.tabProvider.bitpayCardItemsPromise;

      const updatedBitpayCardItemsPromise = this.bitPayCardProvider.get({
        noHistory: true
      });
      this.bitpayCardItems = await updatedBitpayCardItemsPromise;
      this.tabProvider.bitpayCardItemsPromise = updatedBitpayCardItemsPromise;
    }

  }

  private async fetchActiveGiftCards() {
    this.activeCards = await this.tabProvider.activeGiftCardsPromise;
    const updatedActiveGiftCardsPromise = this.giftCardProvider.getActiveCards();
    this.activeCards = await updatedActiveGiftCardsPromise;
    this.tabProvider.activeGiftCardsPromise = updatedActiveGiftCardsPromise;
  }

  private async fetchAllCards() {
    return Promise.all([
      this.fetchBitpayCardItems(),
      this.fetchActiveGiftCards()
    ]);
  }

  public enableCard() {
    this.tapped++;

    if (this.tapped >= 10) {
      this.persistenceProvider.getCardExperimentFlag().then(res => {
        res === 'enabled'
          ? this.persistenceProvider.removeCardExperimentFlag()
          : this.persistenceProvider.setCardExperimentFlag('enabled');

        this.persistenceProvider.setBitpayIdPairingFlag('enabled');

        alert(
          `Card experiment ${
            res === 'enabled' ? 'disabled' : 'enabled'
          }. Restart required.`
        );
        this.tapped = 0;
      });
    }
  }
}
