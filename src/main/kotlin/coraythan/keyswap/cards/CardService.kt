package coraythan.keyswap.cards

import com.fasterxml.jackson.dataformat.yaml.YAMLMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.querydsl.core.BooleanBuilder
import coraythan.keyswap.KeyforgeApi
import coraythan.keyswap.decks.KeyforgeDeck
import org.slf4j.LoggerFactory
import org.springframework.core.io.ClassPathResource
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Transactional
@Service
class CardService(
        val cardRepo: CardRepo,
        val keyforgeApi: KeyforgeApi,
        val yamlMapper: YAMLMapper
) {
    private val log = LoggerFactory.getLogger(this::class.java)

    lateinit var extraInfo: Map<Int, ExtraCardInfo>

    fun loadExtraInfo() {
        val extraInfosFromFile: List<ExtraCardInfo> = yamlMapper.readValue(
                ClassPathResource("extra-deck-info.yml").inputStream
        )
        this.extraInfo = extraInfosFromFile.map { it.cardNumber to it }.toMap()
    }

    fun fullCardsFromCards(cards: List<Card>) = cards.map { it.copy(extraCardInfo = this.extraInfo[it.cardNumber]) }

    fun findByIds(cardIds: List<String>) = cardRepo.findAllById(cardIds)

    fun filterCards(filters: CardFilters): Iterable<Card> {
        val cardQ = QCard.card
        val predicate = BooleanBuilder()

        if (!filters.includeMavericks) predicate.and(cardQ.maverick.isFalse)
        if (filters.rarities.isNotEmpty()) predicate.and(cardQ.rarity.`in`(filters.rarities))
        if (filters.types.isNotEmpty()) predicate.and(cardQ.cardType.`in`(filters.types))
        if (filters.houses.isNotEmpty()) predicate.and(cardQ.house.`in`(filters.houses))
        if (filters.ambers.isNotEmpty()) predicate.and(cardQ.amber.`in`(filters.ambers))
        if (filters.powers.isNotEmpty()) predicate.and(cardQ.power.`in`(filters.powers))
        if (filters.armors.isNotEmpty()) predicate.and(cardQ.armor.`in`(filters.armors))

        if (filters.title.isNotBlank()) predicate.and(cardQ.cardTitle.likeIgnoreCase("%${filters.title}%"))
        if (filters.description.isNotBlank()) predicate.and(cardQ.cardText.likeIgnoreCase("%${filters.description}%"))

        val sortProperty = when (filters.sort) {
            CardSortOptions.SET_NUMBER -> "cardNumber"
            CardSortOptions.CARD_NAME -> "cardTitle"
            CardSortOptions.AMBER -> "amber"
            CardSortOptions.POWER -> {
                predicate.and(cardQ.cardType.`in`(CardType.Creature))
                "power"
            }
            CardSortOptions.ARMOR -> {
                predicate.and(cardQ.cardType.`in`(CardType.Creature))
                "armor"
            }
        }

        return cardRepo.findAll(predicate, Sort.by(filters.sortDirection.direction, sortProperty))
    }

    fun importNewCards(decks: List<KeyforgeDeck>): List<Card> {
        val cards = cardRepo.findAll()
        val cardsToReturn = cards.toMutableList()
        val cardKeys = cards.map { it.id }.toSet()
        decks.forEach { deck ->
            if (deck.cards?.any { !cardKeys.contains(it) } == true) {
                keyforgeApi.findDeck(deck.id)?._linked?.cards?.forEach {
                    if (!cardKeys.contains(it.id)) {
                        cardsToReturn.add(this.saveNewCard(it.toCard(this.extraInfo)))
                    }
                }
                log.info("Loaded cards from deck.")
            } else {
                log.info("Skipped loading cards from deck.")
            }
        }
        return cardsToReturn
    }

    fun saveNewCard(card: Card): Card {
        return cardRepo.save(card)
    }
}