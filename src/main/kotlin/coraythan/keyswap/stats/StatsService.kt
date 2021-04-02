package coraythan.keyswap.stats

import com.querydsl.jpa.impl.JPAQueryFactory
import coraythan.keyswap.cards.CardService
import coraythan.keyswap.cards.CardType
import coraythan.keyswap.config.Env
import coraythan.keyswap.config.SchedulingConfig
import coraythan.keyswap.decks.DeckPageService
import coraythan.keyswap.decks.DeckPageType
import coraythan.keyswap.decks.Wins
import coraythan.keyswap.decks.addWinsLosses
import coraythan.keyswap.decks.models.Deck
import coraythan.keyswap.decks.models.doneRatingDecks
import coraythan.keyswap.expansions.Expansion
import coraythan.keyswap.expansions.activeExpansions
import coraythan.keyswap.now
import coraythan.keyswap.scheduledException
import coraythan.keyswap.scheduledStart
import coraythan.keyswap.scheduledStop
import coraythan.keyswap.synergy.DeckSynergyService
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import javax.persistence.EntityManager
import kotlin.math.roundToInt
import kotlin.system.measureTimeMillis

private const val lockStatsVersionUpdate = "PT72H"
private const val lockUpdateStats = "PT20S"
private const val statsUpdateQuantity = 10000L

@Transactional
@Service
class StatsService(
        private val cardService: CardService,
        private val deckStatisticsRepo: DeckStatisticsRepo,
        private val deckPageService: DeckPageService,
        @Value("\${env}")
        private val env: Env,
        entityManager: EntityManager
) {

    private val query = JPAQueryFactory(entityManager)
    private val log = LoggerFactory.getLogger(this::class.java)

    private var updateStats = true

    private final val defaultGlobalStats = listOf(GlobalStatsWithExpansion(null, GlobalStats()))
    var cachedStats: DeckStatistics? = null
    var cachedGlobalStats: List<GlobalStatsWithExpansion> = defaultGlobalStats

    fun findGlobalStats(): List<GlobalStatsWithExpansion> {
        if (cachedGlobalStats != defaultGlobalStats) {
            return cachedGlobalStats
        }
        this.updateCachedStats()
        return cachedGlobalStats
    }

    fun findCurrentStats(): DeckStatistics? {
        if (cachedStats != null) {
            return cachedStats
        }
        this.updateCachedStats()
        return cachedStats
    }

    fun setStats(deckStats: DeckStatistics) {
        val mostRecentVersion = deckStatisticsRepo.findFirstByOrderByVersionDesc()
        if (mostRecentVersion?.completeDateTime != null) {
            log.info("Setting deck stats manually.")
            deckStatisticsRepo.save(
                    DeckStatisticsEntity.fromDeckStatistics(deckStats)
                            .copy(version = mostRecentVersion.version + 1, completeDateTime = now())
            )
            updateStats = true
            updateCachedStats()
        } else {
            throw IllegalStateException("Can't set stats manually with no previous stats or while in progress.")
        }
    }

    //    @Scheduled(fixedDelayString = lockStatsVersionUpdate, initialDelayString = "PT1M")
    @Scheduled(fixedDelayString = "PT1H", initialDelayString = SchedulingConfig.newDeckStatsInitialDelay)
    @SchedulerLock(name = "updateStatisticsVersion", lockAtLeastFor = lockStatsVersionUpdate, lockAtMostFor = lockStatsVersionUpdate)
    fun startNewDeckStats() {

        if (env == Env.qa) {
            log.info("QA environment, skip stats.")
            return
        }

        try {

            log.info("$scheduledStart start new deck stats.")
            if (!doneRatingDecks) {
                log.info("Skipping stats update as decks are being rated.")
                return
            }
            val mostRecentVersion = deckStatisticsRepo.findFirstByOrderByVersionDesc()
            if (mostRecentVersion == null) {
                log.info("No stats existed")
                deckStatisticsRepo.save(DeckStatisticsEntity.fromDeckStatistics(DeckStatistics()))
                deckPageService.setCurrentPage(0, DeckPageType.STATS)
                updateStats = true
            } else if (mostRecentVersion.completeDateTime != null) {
                log.info("Creating deck stats with new version.")
                deckStatisticsRepo.save(
                        DeckStatisticsEntity.fromDeckStatistics(DeckStatistics())
                                .copy(version = mostRecentVersion.version + 1)
                )
                Expansion.values().forEach {
                    deckStatisticsRepo.save(
                            DeckStatisticsEntity.fromDeckStatistics(DeckStatistics())
                                    .copy(version = mostRecentVersion.version + 1, expansion = it)
                    )
                }
                deckPageService.setCurrentPage(0, DeckPageType.STATS)
                updateStats = true
            }
            log.info("$scheduledStop starting new deck stats.")
        } catch (e: Exception) {
            log.error("$scheduledException starting new deck stats", e)
        }

    }

    @Scheduled(fixedDelayString = lockUpdateStats, initialDelayString = SchedulingConfig.newDeckStatsInitialDelay)
    @SchedulerLock(name = "updateStatistics", lockAtLeastFor = lockUpdateStats, lockAtMostFor = lockUpdateStats)
    fun updateStatsForDecks() {
        try {

            if (!updateStats) return

            log.info("$scheduledStart update stats for decks.")

            val millisTaken = measureTimeMillis {

                val stats = deckStatisticsRepo.findFirstByOrderByVersionDesc()
                val statsWithVersion = if (stats == null) null else deckStatisticsRepo.findAllByVersion(stats.version)

                when {
                    stats == null -> log.warn("There was no stats version for updating deck stats.")
                    statsWithVersion?.isEmpty() == true -> log.warn("How can stats with version be empty or null?")
                    stats.completeDateTime != null -> {
                        updateStats = false
                        log.info("Deck Stats were already completed updating for version ${stats.version}.")
                    }
                    else -> {
                        val currentPage = deckPageService.findCurrentPage(DeckPageType.STATS)
                        val deckResults = deckPageService.decksForPage(currentPage, DeckPageType.STATS)

                        if (deckResults.isEmpty()) {
                            updateStats = false
                            statsWithVersion!!.forEach {
                                deckStatisticsRepo.save(it.copy(completeDateTime = now()))
                            }
                            updateCachedStats()
                            log.info("Done updating deck stats! Final stats are: \n\n$stats\n\n")
                        }

                        updateStats(statsWithVersion!!, deckResults)
                        deckPageService.setCurrentPage(currentPage + 1, DeckPageType.STATS)
                    }
                }
            }
            if (updateStats) log.info("$scheduledStop Took $millisTaken ms to update stats with $statsUpdateQuantity decks.")
        } catch (e: Throwable) {
            log.error("$scheduledException To update stats", e)
        }
    }

    private fun updateStats(statsEntities: List<DeckStatisticsEntity>, decks: List<Deck>) {
        statsEntities.forEach { statsEntity ->
            val stats = statsEntity.toDeckStatistics()

            if (statsEntity.expansion == null) {
                val datasToInclude = activeExpansions.map {
                    AercData(0, it)
                }.plus(
                        activeExpansions.flatMap { expansion ->
                            expansion.houses.map {
                                AercData(0, expansion, it)
                            }
                        }
                ).associateBy { Pair(it.expansion, it.house) }

                stats.aercDatas = datasToInclude
                        .plus(stats.aercDatas.associateBy { Pair(it.expansion, it.house) })
                        .values.toList()
            }

            decks
                    .filter { statsEntity.expansion == null || statsEntity.expansion.expansionNumber == it.expansion }
                    .forEach { ratedDeck ->
                        val cards = cardService.cardsForDeck(ratedDeck)
                        val deckWithSyns = DeckSynergyService.fromDeckWithCards(ratedDeck, cards)

                        stats.armorValues.incrementValue(ratedDeck.totalArmor)
                        stats.totalCreaturePower.incrementValue(ratedDeck.totalPower)
                        stats.aerc.incrementValue(ratedDeck.aercScore.roundToInt())
                        stats.expectedAmber.incrementValue(ratedDeck.expectedAmber.roundToInt())
                        stats.amberControl.incrementValue(ratedDeck.amberControl.roundToInt())
                        stats.creatureControl.incrementValue(ratedDeck.creatureControl.roundToInt())
                        stats.artifactControl.incrementValue(ratedDeck.artifactControl.roundToInt())
                        stats.efficiency.incrementValue(ratedDeck.efficiency.roundToInt())
                        stats.recursion.incrementValue(ratedDeck.recursion?.roundToInt() ?: 0)
                        stats.disruption.incrementValue(ratedDeck.disruption.roundToInt())
                        stats.creatureProtection.incrementValue(ratedDeck.creatureProtection?.roundToInt() ?: 0)
                        stats.other.incrementValue(ratedDeck.other.roundToInt())
                        stats.effectivePower.incrementValue(ratedDeck.effectivePower)
                        stats.sas.incrementValue(ratedDeck.sasRating)
                        stats.meta.incrementValue(deckWithSyns.meta().roundToInt())
                        stats.synergy.incrementValue(ratedDeck.synergyRating)
                        stats.antisynergy.incrementValue(ratedDeck.antisynergyRating)
                        stats.creatureCount.incrementValue(ratedDeck.creatureCount)
                        stats.actionCount.incrementValue(ratedDeck.actionCount)
                        stats.artifactCount.incrementValue(ratedDeck.artifactCount)
                        stats.upgradeCount.incrementValue(ratedDeck.upgradeCount)

                        val creatureCards = cards.filter { card -> card.cardType == CardType.Creature }
                        stats.power2OrLower.incrementValue(creatureCards.filter { card -> card.power < 3 }.size)
                        stats.power3OrLower.incrementValue(creatureCards.filter { card -> card.power < 4 }.size)
                        stats.power3OrHigher.incrementValue(creatureCards.filter { card -> card.power > 2 }.size)
                        stats.power4OrHigher.incrementValue(creatureCards.filter { card -> card.power > 3 }.size)
                        stats.power5OrHigher.incrementValue(creatureCards.filter { card -> card.power > 4 }.size)

                        if (ratedDeck.wins != 0 || ratedDeck.losses != 0) {
                            val wins = Wins(ratedDeck.wins, ratedDeck.losses)
                            stats.sasToWinsLosses.addWinsLosses(ratedDeck.sasRating, wins)
                            stats.metaToWinsLosses.addWinsLosses(deckWithSyns.meta().roundToInt(), wins)
                            stats.synergyToWinsLosses.addWinsLosses(ratedDeck.synergyRating, wins)
                            stats.antisynergyToWinsLosses.addWinsLosses(ratedDeck.antisynergyRating, wins)
                            stats.aercToWinsLosses.addWinsLosses(ratedDeck.aercScore.roundToInt(), wins)
                            stats.amberControlToWinsLosses.addWinsLosses(ratedDeck.amberControl.roundToInt(), wins)
                            stats.expectedAmberToWinsLosses.addWinsLosses(ratedDeck.expectedAmber.roundToInt(), wins)
                            stats.artifactControlToWinsLosses.addWinsLosses(ratedDeck.artifactControl.roundToInt(), wins)
                            stats.creatureControlToWinsLosses.addWinsLosses(ratedDeck.creatureControl.roundToInt(), wins)
                            stats.efficiencyToWinsLosses.addWinsLosses(ratedDeck.efficiency.roundToInt(), wins)
                            stats.recursionToWinsLosses.addWinsLosses(ratedDeck.recursion?.roundToInt() ?: 0, wins)
                            stats.disruptionToWinsLosses.addWinsLosses(ratedDeck.disruption.roundToInt(), wins)
                            stats.creatureProtectionToWinsLosses.addWinsLosses(ratedDeck.creatureProtection?.roundToInt() ?: 0, wins)
                            stats.otherToWinsLosses.addWinsLosses(ratedDeck.other.roundToInt(), wins)
                            stats.effectivePowerToWinsLosses.addWinsLosses((ratedDeck.effectivePower / 5) * 5, wins)

                            stats.creatureWins.addWinsLosses(ratedDeck.creatureCount, wins)
                            stats.actionWins.addWinsLosses(ratedDeck.actionCount, wins)
                            stats.artifactWins.addWinsLosses(ratedDeck.artifactCount, wins)
                            stats.upgradeWins.addWinsLosses(ratedDeck.upgradeCount, wins)

                            stats.raresWins.addWinsLosses(ratedDeck.raresCount, wins)
                            ratedDeck.houses.forEach { house ->
                                stats.housesWins.addWinsLosses(house, wins)
                            }
                        }

                        if (statsEntity.expansion == null) {

                            stats.aercDatas = stats.aercDatas.map { aercData ->
                                if (ratedDeck.expansionEnum == aercData.expansion && (aercData.house == null || ratedDeck.houses.contains(aercData.house))) {

                                    val relevantCombos = deckWithSyns.synergyCombos.filter { aercData.house == null || aercData.house == it.house }

                                    aercData.copy(
                                            count = aercData.count + 12,
                                            amberControl = aercData.amberControl + relevantCombos.sumByDouble { it.amberControl * it.copies },
                                            expectedAmber = aercData.expectedAmber + relevantCombos.sumByDouble { it.expectedAmber * it.copies },
                                            artifactControl = aercData.artifactControl + relevantCombos.sumByDouble { it.artifactControl * it.copies },
                                            creatureControl = aercData.creatureControl + relevantCombos.sumByDouble { it.creatureControl * it.copies },
                                            effectivePower = aercData.effectivePower + relevantCombos.sumBy { it.effectivePower * it.copies },
                                            efficiency = aercData.efficiency + relevantCombos.sumByDouble { it.efficiency * it.copies },
                                            recursion = aercData.recursion + relevantCombos.sumByDouble { it.recursion * it.copies },
                                            disruption = aercData.disruption + relevantCombos.sumByDouble { it.disruption * it.copies },
                                            creatureProtection = aercData.creatureProtection + relevantCombos.sumByDouble { it.creatureProtection * it.copies },
                                            other = aercData.other + relevantCombos.sumByDouble { it.other * it.copies }
                                    )
                                } else {
                                    aercData
                                }
                            }
                        }

                    }

            deckStatisticsRepo.save(statsEntity.copy(deckStats = DeckStatisticsEntity.fromDeckStatistics(stats).deckStats))
        }
    }

    private fun updateCachedStats() {
        val statsToCache = deckStatisticsRepo.findFirstByCompleteDateTimeNotNullAndExpansionOrderByVersionDesc(null)?.toDeckStatistics() ?: DeckStatistics()
        cachedStats = statsToCache
        cachedGlobalStats = listOf(GlobalStatsWithExpansion(
                null,
                statsToCache.toGlobalStats()
                        .let {
                            it.copy(aercDatas = it.aercDatas.sortedBy { it.house })
                        }
        ))
                .plus(Expansion.values().map {
                    GlobalStatsWithExpansion(it.expansionNumber,
                            (deckStatisticsRepo.findFirstByCompleteDateTimeNotNullAndExpansionOrderByVersionDesc(it)?.toDeckStatistics() ?: DeckStatistics())
                                    .toGlobalStats()
                    )
                })
    }
}