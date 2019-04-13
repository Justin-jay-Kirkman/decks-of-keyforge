package coraythan.keyswap.userdeck

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import coraythan.keyswap.decks.models.Deck
import coraythan.keyswap.generic.Country
import coraythan.keyswap.users.KeyUser
import java.time.LocalDate
import java.time.ZonedDateTime
import java.util.*
import javax.persistence.*

@Entity
data class UserDeck(

        @JsonIgnoreProperties("decks")
        @ManyToOne
        val user: KeyUser,

        @ManyToOne
        val deck: Deck,

        val wishlist: Boolean = false,
        val funny: Boolean = false,
        val ownedBy: String? = null,

        /**
         * Only for unregistered decks
         */
        val creator: Boolean = false,

        // Deck selling info below
        val forSale: Boolean = false,
        val forTrade: Boolean = false,
//        val forAuction: Boolean = false,

//        @OneToOne(cascade = [CascadeType.ALL])
//        @PrimaryKeyJoinColumn
//        val auction: Auction? = null,

        @Enumerated(EnumType.STRING)
        val forSaleInCountry: Country? = null,

        val askingPrice: Double? = null,

        val listingInfo: String? = null,

        val condition: DeckCondition? = null,
        val redeemed: Boolean = true,
        val externalLink: String? = null,

        val dateListed: ZonedDateTime? = null,
        val expiresAt: ZonedDateTime? = null,

        @Id
        val id: UUID = UUID.randomUUID()
) {
    val dateListedLocalDate: LocalDate?
        get() = this.dateListed?.toLocalDate()

    val expiresAtLocalDate: LocalDate?
        get() = this.expiresAt?.toLocalDate()

    fun toDto() = UserDeckDto(
            wishlist = wishlist,
            funny = funny,
            ownedBy = ownedBy,
            creator = creator,
            forSale = forSale,
            forTrade = forTrade,
            forSaleInCountry = forSaleInCountry,
            askingPrice = askingPrice,
            listingInfo = listingInfo,
            condition = condition,
            redeemed = redeemed,
            externalLink = externalLink,
            dateListed = dateListed,
            expiresAt = expiresAt,
            id = id,
            deckId = deck.id,

            username = user.username,
            publicContactInfo = user.publicContactInfo
    )
}

enum class DeckCondition {
    NEW_IN_PLASTIC,
    NEAR_MINT,
    PLAYED,
    HEAVILY_PLAYED
}

data class UserDeckDto(

        val wishlist: Boolean = false,
        val funny: Boolean = false,
        val ownedBy: String? = null,

        val creator: Boolean = false,

        val forSale: Boolean = false,
        val forTrade: Boolean = false,

        val forSaleInCountry: Country? = null,

        val askingPrice: Double? = null,

        val listingInfo: String? = null,

        val condition: DeckCondition? = null,
        val redeemed: Boolean = true,
        val externalLink: String? = null,

        val dateListed: ZonedDateTime? = null,
        val expiresAt: ZonedDateTime? = null,

        val id: UUID = UUID.randomUUID(),

        val deckId: Long,

        val username: String,
        val publicContactInfo: String?
) {
    val dateListedLocalDate: LocalDate?
        get() = this.dateListed?.toLocalDate()

    val expiresAtLocalDate: LocalDate?
        get() = this.expiresAt?.toLocalDate()
}
