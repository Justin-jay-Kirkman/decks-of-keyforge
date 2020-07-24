import axios, { AxiosResponse } from "axios"
import { observable } from "mobx"
import * as React from "react"
import { HttpConfig } from "../../config/HttpConfig"
import { Routes } from "../../config/Routes"
import { LinkButton } from "../../mui-restyled/LinkButton"
import { messageStore } from "../../ui/MessageStore"
import { userStore } from "../../user/UserStore"
import { ForSaleQuery } from "./ForSaleQuery"

export class ForSaleNotificationsStore {

    static readonly CONTEXT = HttpConfig.API + "/for-sale-notifications"
    static readonly SECURE_CONTEXT = HttpConfig.API + "/for-sale-notifications/secured"

    @observable
    queries?: ForSaleQuery[]

    @observable
    queriesCount?: number

    addQuery = (query: ForSaleQuery) => {
        query.cards = query.cards.filter((card) => card.cardNames.length > 0)

        axios.post(`${ForSaleNotificationsStore.SECURE_CONTEXT}/add-query`, query)
            .then(() => {
                messageStore.setMessage(
                    `Created deck notification "${query.queryName}". See it on your `,
                    "Success",
                    <LinkButton
                        color={"secondary"}
                        href={Routes.myProfile}
                        key={"profile"}
                    >
                        Profile
                    </LinkButton>
                )
                userStore.loadLoggedInUser()
            })
    }

    deleteQuery = (queryId: string) => {
        axios.delete(`${ForSaleNotificationsStore.SECURE_CONTEXT}/${queryId}`)
            .then(() => {
                messageStore.setSuccessMessage(`Deleted deck notification filter.`)
                this.findAllForUser()
            })
    }

    findAllForUser = () => {
        axios.get(`${ForSaleNotificationsStore.SECURE_CONTEXT}`)
            .then((response: AxiosResponse) => {
                this.queries = response.data
            })
    }

    findCountForUser = () => {
        axios.get(`${ForSaleNotificationsStore.SECURE_CONTEXT}/count`)
            .then((response: AxiosResponse<number>) => {
                this.queriesCount = response.data
            })
    }
}

export const forSaleNotificationsStore = new ForSaleNotificationsStore()