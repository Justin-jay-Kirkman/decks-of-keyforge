import { Button, Divider, TextField, Typography } from "@material-ui/core"
import { Delete } from "@material-ui/icons"
import { cloneDeep, sortBy } from "lodash"
import { autorun, computed, observable } from "mobx"
import { observer } from "mobx-react"
import * as React from "react"
import { Redirect } from "react-router"
import { CardSearchSuggest } from "../cards/CardSearchSuggest"
import { CardAsLine } from "../cards/CardSimpleView"
import { CardStore } from "../cards/CardStore"
import { KCard } from "../cards/KCard"
import { spacing } from "../config/MuiConfig"
import { Routes } from "../config/Routes"
import { log } from "../config/Utils"
import { KeyCard } from "../generic/KeyCard"
import { House, houseValues } from "../houses/House"
import { KeyButton } from "../mui-restyled/KeyButton"
import { deckImportStore } from "./DeckImportStore"
import { deckImportViewStore } from "./DeckImportView"
import { SaveUnregisteredDeck } from "./SaveUnregisteredDeck"

interface CreateUnregisteredDeckProps {
    initialDeck: SaveUnregisteredDeck
}

class SaveUnregisteredDeckStore {
    @observable
    currentDeck?: SaveUnregisteredDeck

    @computed
    get deckIsValid(): boolean {
        const deck = this.currentDeck
        if (!deck) {
            return false
        }
        const {name, cards} = deck
        if (name.trim().length === 0 || name === "Unrecognized Deck Name") {
            return false
        }
        const entries = Object.entries(this.currentDeck!.cards)
        let valid = true
        entries.forEach((value: [string, KCard[]]) => {
            if (value[1].length !== 12) {
                valid = false
            }
        })
        return valid
    }

    removeCard = (card: KCard) => {
        Object.entries(this.currentDeck!.cards).map((value: [string, KCard[]]) => {
            const cards = value[1]
            const firstIdx = cards.indexOf(card)
            if (firstIdx !== -1) {
                cards.splice(firstIdx, 1)
            }
        })
    }

    addCardHandler = (house: House) => {
        const cardHolder = observable({
            cardName: "", quantity: 1
        })

        autorun(() => {
            if (cardHolder.cardName !== "") {
                const foundCard = CardStore.instance.cardNameLowercaseToCard!.get(cardHolder.cardName.toLowerCase())!
                const copiedCard = cloneDeep(foundCard)
                if (copiedCard.house !== house) {
                    copiedCard.maverick = true
                    copiedCard.house = house
                }
                log.debug(`Pushing ${copiedCard.cardTitle} to house ${house}`)
                const houseCards = this.currentDeck!.cards[house]
                houseCards.push(copiedCard)
                this.currentDeck!.cards[house] = sortBy(houseCards, (card: KCard) => card.cardNumber)
                cardHolder.cardName = ""
            }
        })
        return cardHolder
    }
}

export const saveUnregisteredDeckStore = new SaveUnregisteredDeckStore()

@observer
export class CreateUnregisteredDeck extends React.Component<CreateUnregisteredDeckProps> {

    componentDidMount(): void {
        saveUnregisteredDeckStore.currentDeck = cloneDeep(this.props.initialDeck)
        deckImportStore.newDeckId = undefined
    }

    componentWillReceiveProps(nextProps: Readonly<CreateUnregisteredDeckProps>): void {
        if (saveUnregisteredDeckStore.currentDeck == null && nextProps.initialDeck != null) {
            saveUnregisteredDeckStore.currentDeck = cloneDeep(nextProps.initialDeck)
        }
    }

    createUnregisteredDeck = () => {
        const deck = saveUnregisteredDeckStore.currentDeck
        if (deck) {
            deckImportStore.addUnregisteredDeck(deck)
        }
    }

    render() {
        if (deckImportStore.newDeckId) {
            return <Redirect to={Routes.deckPage(deckImportStore.newDeckId)}/>
        }

        if (saveUnregisteredDeckStore.currentDeck == null || CardStore.instance.cardNameLowercaseToCard == null) {
            return null
        }
        const {name, cards} = saveUnregisteredDeckStore.currentDeck
        return (
            <div>
                <Typography style={{marginLeft: spacing(4)}} variant={"h4"}>Unregistered Deck</Typography>
                <Typography style={{margin: spacing(2), marginLeft: spacing(4)}} variant={"subtitle1"}>
                    Please make sure the title and cards are accurate, including punctuation.
                </Typography>
                <KeyCard
                    topContents={
                        <TextField
                            variant={"outlined"}
                            value={name}
                            label={"Deck Name"}
                            onChange={(event) => saveUnregisteredDeckStore.currentDeck!.name = event.target.value}
                            fullWidth={true}
                        />
                    }
                    light={true}
                    style={{overflow: "visible", marginLeft: spacing(4)}}
                >
                    <div style={{display: "flex", flexWrap: "wrap", margin: spacing(2), paddingBottom: spacing(2)}}>
                        {Object.entries(cards).map((value: [string, KCard[]], index: number) => {
                            return (
                                <div key={value[0]} style={{marginRight: index !== 2 ? spacing(2) : 0}}>
                                    <DisplayCardsInHouseEditable house={value[0] as House} cards={value[1]}/>
                                </div>
                            )
                        })}
                    </div>
                </KeyCard>
                <div style={{display: "flex", alignItems: "center"}}>
                    <Typography style={{marginLeft: spacing(4)}}>Unregistered decks will be deleted when they are registered.</Typography>
                    <div style={{flexGrow: 1}}/>
                    <KeyButton
                        variant={"outlined"}
                        color={"primary"}
                        onClick={() => {
                            saveUnregisteredDeckStore.currentDeck = undefined
                            deckImportStore.readDeck = undefined
                            deckImportViewStore.deckImage = undefined
                        }}
                        style={{marginRight: spacing(2)}}
                    >
                        Clear
                    </KeyButton>
                    <KeyButton
                        variant={"contained"}
                        color={"primary"}
                        style={{marginRight: spacing(2)}}
                        disabled={!saveUnregisteredDeckStore.deckIsValid || deckImportStore.addingNewDeck}
                        onClick={this.createUnregisteredDeck}
                        loading={deckImportStore.addingNewDeck}
                    >
                        Save
                    </KeyButton>
                </div>
            </div>
        )
    }
}

@observer
class DisplayCardsInHouseEditable extends React.Component<{ house: House, cards: KCard[] }> {
    render() {
        return (
            <div style={{display: "flex", flexDirection: "column"}}>
                {houseValues.get(this.props.house)!.title}
                <Divider style={{marginTop: 4}}/>
                {this.props.cards.map((card, idx) => (
                    <div key={idx} style={{display: "flex", alignItems: "center"}}>
                        <CardAsLine card={card}/>
                        <div style={{flexGrow: 1}}/>
                        <Button
                            size={"small"}
                            style={{width: 32, height: 32, minWidth: 32, minHeight: 32}}
                            onClick={() => saveUnregisteredDeckStore.removeCard(card)}
                        >
                            <Delete color={"action"}/>
                        </Button>
                    </div>
                ))}
                <div style={{flexGrow: 1}}/>
                {this.props.cards.length < 12 ? (
                    <CardSearchSuggest
                        card={saveUnregisteredDeckStore.addCardHandler(this.props.house)}
                        style={{marginTop: spacing(2)}}
                        placeholder={"Add Card"}
                    />
                ) : null}
            </div>
        )

    }
}