import axios, { AxiosResponse } from "axios"
import { clone } from "lodash"
import { observable } from "mobx"
import { HttpConfig } from "../config/HttpConfig"
import { log, prettyJson } from "../config/Utils"
import { MessageStore } from "../ui/MessageStore"
import { DeckCount, DeckPage, DeckWithSynergyInfo } from "./Deck"
import { DeckSaleInfo } from "./sales/DeckSaleInfo"
import { DeckFilters } from "./search/DeckFilters"

export class DeckStore {

    static readonly CONTEXT = HttpConfig.API + "/decks"
    private static innerInstance: DeckStore

    @observable
    deckPage?: DeckPage

    @observable
    nextDeckPage?: DeckPage

    @observable
    decksCount?: DeckCount

    @observable
    currentFilters?: DeckFilters

    @observable
    searchingForDecks = false

    @observable
    countingDecks = false

    @observable
    addingMoreDecks = false

    @observable
    deck?: DeckWithSynergyInfo

    @observable
    saleInfo?: DeckSaleInfo[]

    @observable
    importedDeck?: boolean

    @observable
    importingDeck = false

    private constructor() {
    }

    static get instance() {
        return this.innerInstance || (this.innerInstance = new this())
    }

    reset = () => {
        this.deckPage = undefined
    }

    findDeck = (keyforgeId: string) => {
        axios.get(`${DeckStore.CONTEXT}/${keyforgeId}`)
            .then((response: AxiosResponse) => {
                const deck: DeckWithSynergyInfo = response.data
                deck.deck.houses.sort()
                this.deck = deck
            })
    }

    importDeck = (keyforgeId: string) => {
        this.importingDeck = true
        axios.post(`${DeckStore.CONTEXT}/${keyforgeId}/import`)
            .then((response: AxiosResponse) => {
                this.importedDeck = response.data
                if (!response.data) {
                    MessageStore.instance.setErrorMessage("Sorry, we couldn't find a deck with the given id")
                }

                this.importingDeck = false
            })
    }

    findDeckSaleInfo = (keyforgeId: string) => {
        axios.get(`${DeckStore.CONTEXT}/${keyforgeId}/sale-info`)
            .then((response: AxiosResponse) => {
                this.saleInfo = response.data
            })
    }

    searchDecks = async (filters: DeckFilters) => {
        this.searchingForDecks = true
        this.currentFilters = clone(filters)
        log.debug(`Searching for first deck page with ${prettyJson(this.currentFilters)}`)
        this.nextDeckPage = undefined
        this.countingDecks = true
        const decksPromise = this.findDecks(filters)
        const countPromise = this.findDecksCount(filters)
        const decks = await decksPromise
        if (decks) {
            this.deckPage = decks
        }
        this.searchingForDecks = false
        await countPromise
        this.countingDecks = false
        this.findNextDecks()
    }

    findNextDecks = async () => {
        if (this.currentFilters && this.moreDecksAvailable()) {
            this.addingMoreDecks = true
            this.currentFilters.page++
            log.debug(`Searching for next deck page with ${prettyJson(this.currentFilters)}`)
            const decks = await this.findDecks(this.currentFilters)
            if (decks) {
                this.addingMoreDecks = false
                this.nextDeckPage = decks
            }
        }
    }

    showMoreDecks = () => {
        if (this.deckPage && this.nextDeckPage && this.decksCount) {
            log.debug(`Current decks name: ${this.deckPage.decks.map(deck => deck.name)}`)
            log.debug(`Pushing decks name: ${this.nextDeckPage.decks.map(deck => deck.name)}`)
            this.deckPage.decks.push(...this.nextDeckPage.decks)
            this.deckPage.page++
            this.nextDeckPage = undefined
            log.debug(`Current decks page ${this.deckPage.page}. Total pages ${this.decksCount.pages}.`)
            this.findNextDecks()
        }
    }

    moreDecksAvailable = () => (this.deckPage && this.decksCount && this.deckPage.page + 1 < this.decksCount.pages)
        || (this.deckPage && !this.decksCount && this.deckPage.decks.length % 10 === 0)

    private findDecks = async (filters: DeckFilters) => new Promise<DeckPage>(resolve => {
        axios.post(`${DeckStore.CONTEXT}/filter`, filters)
            .then((response: AxiosResponse) => {
                // log.debug(`With filters: ${prettyJson(filters)} Got the filtered decks. decks: ${prettyJson(response.data)}`)
                const decks: DeckPage = response.data
                decks.decks.forEach(deck => deck.houses.sort())
                resolve(decks)
            })
            .catch(() => {
                resolve()
            })
    })

    private findDecksCount = (filters: DeckFilters) => {
        this.decksCount = undefined
        axios.post(`${DeckStore.CONTEXT}/filter-count`, filters)
            .then((response: AxiosResponse) => {
                this.decksCount = response.data
            })
    }

}