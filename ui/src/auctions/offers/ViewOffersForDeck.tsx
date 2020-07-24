import { Paper, Typography } from "@material-ui/core"
import { observer } from "mobx-react"
import * as React from "react"
import { spacing, themeStore } from "../../config/MuiConfig"
import { Routes } from "../../config/Routes"
import { OfferDto } from "../../generated-src/OfferDto"
import { countryToLabel } from "../../generic/CountryUtils"
import { SortableTable, SortableTableHeaderInfo } from "../../generic/SortableTable"
import { KeyLink } from "../../mui-restyled/KeyLink"
import { screenStore } from "../../ui/ScreenStore"
import { userStore } from "../../user/UserStore"
import { OfferActions } from "./OfferActions"

export const ViewOffersForDeck = observer((props: { offers: OfferDto[], currency: string }) => {
    const {offers, currency} = props
    if (offers.length === 0) {
        return <Typography variant={"subtitle1"}>No offers have been made yet on this deck.</Typography>
    }
    const offersToMe = offers[0].sentBy !== userStore.username
    return (
        <Paper style={{backgroundColor: themeStore.tableBackgroundColor, marginBottom: spacing(4)}}>
            <Typography variant={"h6"} style={{marginLeft: spacing(2), paddingTop: spacing(2)}}>
                Existing Offers
            </Typography>
            <OffersForDeckTable offers={offers} currency={currency} offerToMe={offersToMe}/>
        </Paper>
    )
})

const baseOfferTableHeaders = (currency: string, offerToMe: boolean, large?: boolean): SortableTableHeaderInfo<OfferDto>[] => {
    const otherUserColumn: SortableTableHeaderInfo<OfferDto> = {
        property: offerToMe ? "sentBy" : "receivedBy",
        title: offerToMe ? "Sender" : "Seller",
        sortable: true,
        transform: (data) => {
            const username = offerToMe ? data.sentBy : data.receivedBy
            if (username == null) {
                return null
            }
            return (
                <KeyLink to={Routes.userProfilePage(username)}>
                    {username}
                </KeyLink>
            )
        }
    }
    if (large) {
        return [
            {property: "amount", title: "Amount", sortable: true, transform: (data) => `${currency}${data.amount}`},
            {property: "status", title: "Status", sortable: true},
            {property: "sentTime", title: "Sent", sortable: true},
            {property: "expiresOn", title: "Expires", sortable: true},
            {property: "country", title: "Country", sortable: true, transform: (data) => countryToLabel(data.country)},
            // {property: "viewedTime", title: "Viewed", sortable: true, transform: (data) => data.viewedTime == null ? "" : "Yes"},
            otherUserColumn,
            {title: "Actions", transform: (data) => <OfferActions offer={data}/>},
        ]
    }
    return [
        {property: "amount", title: "Amount", sortable: true, transform: (data) => `${currency}${data.amount}`},
        {property: "status", title: "Status", sortable: true},
        {property: "sentTime", title: "Sent", sortable: true},
        otherUserColumn,
        {title: "Actions", transform: (data) => <OfferActions offer={data}/>},
    ]
}

const fullOfferTableHeaders = (currency: string, offerToMe: boolean, large?: boolean): SortableTableHeaderInfo<OfferDto>[] => {
    const combined = baseOfferTableHeaders(currency, offerToMe, large)
    const full: SortableTableHeaderInfo<OfferDto>[] = [
        {
            property: "message",
            title: "Message",
            width: 240,
            transform: (data) => (
                <Typography variant={"body2"} style={{whiteSpace: "pre-wrap"}}>{data.message}</Typography>
            )
        },
    ]
    combined.push(...full)
    return combined
}

export const OffersForDeckTable = observer((props: { offers: OfferDto[], offerToMe: boolean, currency: string, fullVersion?: boolean }) => {
    const {offers, offerToMe, currency} = props
    return (
        <SortableTable
            defaultSort={"sentTime"}
            data={offers}
            headers={baseOfferTableHeaders(currency, offerToMe, screenStore.screenSizeMdPlus())}
        />
    )
})

export const OffersForDeckTableFull = observer((props: { offers: OfferDto[], offerToMe: boolean, currency: string }) => {
    const {offers, offerToMe, currency} = props
    return (
        <SortableTable
            defaultSort={"sentTime"}
            data={offers}
            headers={fullOfferTableHeaders(currency, offerToMe, screenStore.screenSizeMdPlus())}
        />
    )
})
