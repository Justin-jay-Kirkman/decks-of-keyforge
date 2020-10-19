import { Button, IconButton, MenuItem } from "@material-ui/core"
import TextField from "@material-ui/core/TextField/TextField"
import { Delete } from "@material-ui/icons"
import { Autocomplete } from "@material-ui/lab"
import { observable } from "mobx"
import { observer } from "mobx-react"
import * as React from "react"
import { ChangeEvent } from "react"
import { cardStore } from "../../cards/CardStore"
import { spacing } from "../../config/MuiConfig"
import { Utils } from "../../config/Utils"
import { DeckCardQuantity } from "../../generated-src/DeckCardQuantity"
import { House } from "../../generated-src/House"
import { houseValuesArray } from "../../houses/HouseUtils"
import { SelectedOptions } from "../../mui-restyled/SelectedOptions"

interface DeckCardSelectProps {
    store: DeckCardSelectStore
}

export class DeckCardSelectStore {

    @observable
    cards: DeckCardQuantity[]

    constructor(initialCards: DeckCardQuantity[]) {
        this.cards = initialCards.length === 0 ? this.defaultCardsSearch() : initialCards
    }

    isDefaultValue = () => Utils.equals(this.cards, this.defaultCardsSearch())

    reset = () => {
        this.cards = this.defaultCardsSearch()
    }

    private defaultCardsSearch = () => [{cardNames: [], quantity: 1, mav: false}]
}

export const DeckCardSelect = observer((props: DeckCardSelectProps) => {
    const {store} = props

    return (
        <>
            {store.cards.map((card, idx) => {
                const value = card.mav ? "Maverick" : (card.house ? card.house : card.quantity.toString())
                const selected = new SelectedOptions(card.cardNames, (values: string[]) => card.cardNames = values)
                return (
                    <div key={idx}>
                        <Autocomplete
                            multiple={true}
                            // @ts-ignore
                            options={cardStore.cardNames}
                            value={selected.selectedValues}
                            renderInput={(params) => <TextField {...params} label={"Any of these cards"}/>}
                            onChange={(event: ChangeEvent<{}>, newValue: string[] | null) => {
                                selected.update(newValue ?? [])
                            }}
                        />
                        <TextField
                            style={{minWidth: 80, marginTop: spacing(1), marginBottom: spacing(1)}}
                            label={"Copies"}
                            select={true}
                            value={value}
                            onChange={event => {
                                const valueAsNumber = Number(event.target.value)
                                if (isNaN(valueAsNumber)) {
                                    if (event.target.value === "maverick") {
                                        card.mav = true
                                    } else {
                                        card.house = event.target.value as House
                                    }
                                    card.quantity = 1
                                } else {
                                    card.quantity = valueAsNumber
                                    card.house = undefined
                                }
                            }}
                        >
                            <MenuItem value={"0"}>None</MenuItem>
                            <MenuItem value={"1"}>1+</MenuItem>
                            <MenuItem value={"2"}>2+</MenuItem>
                            <MenuItem value={"3"}>3+</MenuItem>
                            <MenuItem value={"4"}>4+</MenuItem>
                            <MenuItem value={"5"}>5+</MenuItem>
                            <MenuItem value={"6"}>6+</MenuItem>
                            <MenuItem value={"7"}>7+</MenuItem>
                            <MenuItem value={"Maverick"}>Maverick</MenuItem>
                            {houseValuesArray.map(houseValue => {
                                return (
                                    <MenuItem value={houseValue.house} key={houseValue.house}>
                                        {houseValue.house}
                                    </MenuItem>
                                )
                            })}
                        </TextField>
                        <IconButton
                            onClick={() => store.cards.splice(idx, 1)}
                            style={{marginTop: spacing(2), marginLeft: spacing(1)}}
                        >
                            <Delete fontSize={"small"}/>
                        </IconButton>
                    </div>
                )
            })}
            <Button style={{marginTop: spacing(1)}} onClick={() => store.cards.push({cardNames: [], quantity: 1, mav: false})}>
                Add Card
            </Button>
        </>
    )
})
