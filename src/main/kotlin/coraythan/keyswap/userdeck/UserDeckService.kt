package coraythan.keyswap.userdeck

import coraythan.keyswap.auctions.DeckListingRepo
import coraythan.keyswap.auctions.DeckListingStatus
import coraythan.keyswap.config.BadRequestException
import coraythan.keyswap.config.SchedulingConfig
import coraythan.keyswap.decks.DeckRepo
import coraythan.keyswap.decks.models.Deck
import coraythan.keyswap.scheduledException
import coraythan.keyswap.scheduledStart
import coraythan.keyswap.scheduledStop
import coraythan.keyswap.users.CurrentUserService
import coraythan.keyswap.users.KeyUser
import coraythan.keyswap.users.KeyUserRepo
import coraythan.keyswap.users.search.UserSearchService
import org.slf4j.LoggerFactory
import org.springframework.data.repository.findByIdOrNull
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Transactional
@Service
class UserDeckService(
        private val currentUserService: CurrentUserService,
        private val userRepo: KeyUserRepo,
        private val deckRepo: DeckRepo,
        private val userSearchService: UserSearchService,
        private val userDeckRepo: UserDeckRepo,
        private val deckListingRepo: DeckListingRepo,
        private val previouslyOwnedDeckRepo: PreviouslyOwnedDeckRepo
) {

    private val log = LoggerFactory.getLogger(this::class.java)

    // Don't want this running regularly
    @Scheduled(fixedDelayString = "PT24H", initialDelayString = SchedulingConfig.correctCountsInitialDelay)
    fun correctCounts() {
        log.info("$scheduledStart correcting counts.")
        try {
            userDeckRepo
                    .findAll(QUserDeck.userDeck.wishlist.isTrue)
                    .groupBy { it.deck.id }
                    .map { it.value.first().deck to it.value.size }
                    .forEach { if (it.first.wishlistCount != it.second) deckRepo.save(it.first.copy(wishlistCount = it.second)) }

            userDeckRepo
                    .findAll(QUserDeck.userDeck.funny.isTrue)
                    .groupBy { it.deck.id }
                    .map { it.value.first().deck to it.value.size }
                    .forEach { if (it.first.funnyCount != it.second) deckRepo.save(it.first.copy(funnyCount = it.second)) }
        } catch (e: Throwable) {
            log.error("$scheduledException Couldn't correct wishlist counts", e)
        }
        log.info("$scheduledStop correcting counts.")
    }

    fun addToWishlist(deckId: Long, add: Boolean = true) {
        modOrCreateUserDeck(deckId, currentUserService.loggedInUserOrUnauthorized(), {
            it.copy(wishlistCount = it.wishlistCount + if (add) 1 else -1)
        }) {
            it.copy(wishlist = add)
        }
    }

    fun updateNotes(deckId: Long, notes: String) {
        modOrCreateUserDeck(deckId, currentUserService.loggedInUserOrUnauthorized(), null) {
            it.copy(notes = notes)
        }
    }

    fun markAsFunny(deckId: Long, mark: Boolean = true) {
        modOrCreateUserDeck(deckId, currentUserService.loggedInUserOrUnauthorized(), {
            it.copy(funnyCount = it.funnyCount + if (mark) 1 else -1)
        }) {
            it.copy(funny = mark)
        }
    }

    fun markAsOwned(deckId: Long, mark: Boolean = true) {
        val user = currentUserService.loggedInUserOrUnauthorized()
        val team = user.team
        if (!mark && deckListingRepo.existsBySellerIdAndDeckIdAndStatusNot(user.id, deckId, DeckListingStatus.COMPLETE)) {
            throw BadRequestException("Please unlist the deck for sale before removing it from your decks.")
        }
        modOrCreateUserDeck(deckId, user, null) {
            it.copy(
                    ownedBy = if (mark) user.username else null,
                    teamId = if (mark && team != null) team.id else null
            )
        }
        if (mark) {
            if (previouslyOwnedDeckRepo.existsByDeckIdAndPreviousOwnerId(deckId, user.id)) {
                previouslyOwnedDeckRepo.deleteByDeckIdAndPreviousOwnerId(deckId, user.id)
            }
        } else {
            val deck = deckRepo.findByIdOrNull(deckId)
            if (deck != null) {
                previouslyOwnedDeckRepo.save(PreviouslyOwnedDeck(user, deck))
            }
        }
        userSearchService.scheduleUserForUpdate(user)
    }

    fun removePreviouslyOwned(deckId: Long) {
        val user = currentUserService.loggedInUserOrUnauthorized()
        if (previouslyOwnedDeckRepo.existsByDeckIdAndPreviousOwnerId(deckId, user.id)) {
            previouslyOwnedDeckRepo.deleteByDeckIdAndPreviousOwnerId(deckId, user.id)
        }
    }

    private fun modOrCreateUserDeck(
            deckId: Long,
            currentUser: KeyUser,
            modDeck: ((deck: Deck) -> Deck)?,
            mod: (userDeck: UserDeck) -> UserDeck
    ) {
        val deck = deckRepo.getOne(deckId)
        val userDeck = currentUser.decks.filter { it.deck.id == deckId }.getOrElse(0) {
            UserDeck(currentUser, deck)
        }

        val toSave = currentUser.copy(decks = currentUser.decks.filter { it.deck.id != deckId }.plus(
                mod(userDeck)
        ))
        userRepo.save(toSave)

        if (modDeck != null) {
            deckRepo.save(modDeck(deck))
        }
    }

    fun findAllForUser(): List<UserDeckDto> {
        val currentUser = currentUserService.loggedInUserOrUnauthorized()
        return userDeckRepo.findByUserId(currentUser.id).map {
            it.toDto()
        }
    }
}
