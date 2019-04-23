import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from "@material-ui/core"
import { observable } from "mobx"
import { observer } from "mobx-react"
import * as React from "react"
import { spacing } from "../config/MuiConfig"
import { deckStore } from "../decks/DeckStore"
import { BuyingDisclaimer } from "../decks/sales/SaleInfoView"
import { messageStore } from "../ui/MessageStore"
import { userStore } from "../user/UserStore"
import { userDeckStore } from "../userdeck/UserDeckStore"
import { auctionStore } from "./AuctionStore"

interface BidButtonProps {
    nextValidBid: number
    currentBid?: number
    bidIncrement: number
    currencySymbol: string
    auctionId: string
    sellerUsername: string
    youAreHighestBidder: boolean
    style?: React.CSSProperties
}

@observer
export class BidButton extends React.Component<BidButtonProps> {

    @observable
    open = false

    @observable
    currentBid = ""

    constructor(props: BidButtonProps) {
        super(props)
        this.currentBid = props.nextValidBid.toString()
    }

    bid = () => {
        const {nextValidBid, currencySymbol, auctionId} = this.props
        this.open = false

        let currentBidNumber
        if (this.currentBid.trim().length > 0) {
            currentBidNumber = Number(this.currentBid.trim())
            if (isNaN(currentBidNumber)) {
                messageStore.setWarningMessage("The current bid must be a number.")
                return
            }
            if (currentBidNumber < nextValidBid) {
                messageStore.setWarningMessage(`Your bid must be equal to or greater than ${currencySymbol}${nextValidBid}.`)
                return
            }
        }

        auctionStore.bid(auctionId, currentBidNumber as number)
            .then(() => {
                userDeckStore.refreshDeckInfo()
                deckStore.refreshDeckSearch()
            })
    }

    render() {
        const {currentBid, bidIncrement, nextValidBid, currencySymbol, sellerUsername, youAreHighestBidder, style} = this.props
        const disabled = !userStore.loggedIn() || sellerUsername === userStore.username
        return (
            <div style={style}>
                <Button variant={"outlined"} color={"primary"} onClick={() => this.open = true} disabled={disabled}>
                    {youAreHighestBidder ? "Increase Bid" : "Bid"}
                </Button>
                <Dialog
                    open={this.open}
                    onClose={() => this.open = false}
                >
                    <DialogTitle>Place Bid</DialogTitle>
                    <DialogContent>
                        <TextField
                            label={"Bid"}
                            value={this.currentBid}
                            type={"number"}
                            onChange={event => this.currentBid = event.target.value}
                            style={{marginBottom: spacing(2)}}
                        />
                        <Typography variant={"subtitle1"} style={{marginBottom: spacing(2)}}>
                            {currentBid ? (
                                `To place a bid you must bid ${currencySymbol}${nextValidBid} or more. The current bid is ${currencySymbol}${currentBid}, ` +
                                `and this auction has a minimum bid increment of ${currencySymbol}${bidIncrement}`
                            ) : (
                                `No one has bid on this auction your bid must be equal to or greater than the minimum bid of ${currencySymbol}${nextValidBid}.`
                            )}
                        </Typography>
                        <Typography color={"textSecondary"} style={{marginBottom: spacing(1), fontStyle: "italic"}}>
                            By bidding on this deck you agree to pay the seller the final price when the auction is completed if you are the highest bidder.
                            That price will be equal to the second highest bidder's highest bid. You also agree to pay any shipping listed in the description.
                        </Typography>
                        <Typography color={"textSecondary"} style={{marginBottom: spacing(1), fontStyle: "italic"}}>
                            If you win, you and the seller will be sent an email from Decks of Keyforge.
                            You can also contact the seller separately with their listed contact information.
                        </Typography>
                        <BuyingDisclaimer/>
                    </DialogContent>
                    <DialogActions>
                        <div style={{flexGrow: 1}}/>
                        <Button onClick={() => this.open = false} style={{marginRight: spacing(2)}}>
                            Cancel
                        </Button>
                        <Button
                            onClick={this.bid}
                            color="primary"
                        >
                            Bid
                        </Button>
                    </DialogActions>
                </Dialog>
            </div>
        )
    }
}
