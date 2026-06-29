package com.cofifinance.mobile.ui.home.viewmodel

import com.cofifinance.mobile.data.local.dao.SpendingDao
import com.cofifinance.mobile.data.local.entity.SpendingEntity
import com.cofifinance.mobile.data.local.entity.SyncStatus
import com.cofifinance.mobile.data.remote.dto.ApiEnvelope
import com.cofifinance.mobile.data.remote.dto.SpendingDto
import com.cofifinance.mobile.data.repository.SpendingRepository
import com.cofifinance.mobile.support.FakeSpendingApiService
import com.cofifinance.mobile.support.FakeSpendingDao
import com.cofifinance.mobile.support.MainDispatcherRule
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class HomeViewModelTest {

    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private lateinit var api: FakeSpendingApiService
    private lateinit var dao: FakeSpendingDao
    private lateinit var repo: SpendingRepository

    @Before
    fun setUp() {
        api = FakeSpendingApiService()
        dao = FakeSpendingDao()
        repo = SpendingRepository(api, dao)
    }

    // ── Initialization ────────────────────────────────────────────────────────

    @Test
    fun `init starts with isLoading true`() {
        val vm = HomeViewModel(repo)

        assertTrue(vm.ui.value.isLoading)
    }

    @Test
    fun `init sync success clears isLoading and populates spendings`() =
        runTest(mainDispatcherRule.dispatcher.scheduler) {
            api.listHandler = { ApiEnvelope(listOf(dto("s1"))) }

            val vm = HomeViewModel(repo)
            advanceUntilIdle()

            assertFalse(vm.ui.value.isLoading)
            assertNull(vm.ui.value.error)
            assertEquals(1, vm.ui.value.spendings.size)
            assertEquals("s1", vm.ui.value.spendings.first().id)
        }

    @Test
    fun `init sync failure clears isLoading and sets error`() =
        runTest(mainDispatcherRule.dispatcher.scheduler) {
            // pull() swallows API errors internally; a DAO failure propagates through sync()
            val vm = HomeViewModel(SpendingRepository(api, throwingDao()))
            advanceUntilIdle()

            assertFalse(vm.ui.value.isLoading)
            assertEquals("Could not sync spendings", vm.ui.value.error)
        }

    @Test
    fun `spendings from dao flow are reflected in ui state`() =
        runTest(mainDispatcherRule.dispatcher.scheduler) {
            val vm = HomeViewModel(repo)
            advanceUntilIdle()

            dao.upsert(localSpending("s1"))
            runCurrent()

            assertTrue(vm.ui.value.spendings.any { it.id == "s1" })
        }

    // ── refresh() ─────────────────────────────────────────────────────────────

    @Test
    fun `refresh sets isRefreshing true while in-flight`() =
        runTest(mainDispatcherRule.dispatcher.scheduler) {
            val gate = CompletableDeferred<ApiEnvelope<List<SpendingDto>>>()
            val vm = HomeViewModel(repo)
            advanceUntilIdle()

            api.listHandler = { gate.await() }
            vm.refresh()
            runCurrent()

            assertTrue(vm.ui.value.isRefreshing)

            gate.complete(ApiEnvelope(emptyList()))
            advanceUntilIdle()
        }

    @Test
    fun `refresh success clears isRefreshing and error`() =
        runTest(mainDispatcherRule.dispatcher.scheduler) {
            // Start with a DAO that throws to seed an error state via init
            val toggleDao = ToggleDao(dao)
            val vm = HomeViewModel(SpendingRepository(api, toggleDao))
            advanceUntilIdle()
            assertEquals("Could not sync spendings", vm.ui.value.error)

            // Now disable the throw so refresh succeeds
            toggleDao.shouldFail = false
            vm.refresh()
            advanceUntilIdle()

            assertFalse(vm.ui.value.isRefreshing)
            assertNull(vm.ui.value.error)
        }

    @Test
    fun `refresh failure clears isRefreshing and sets error`() =
        runTest(mainDispatcherRule.dispatcher.scheduler) {
            // Use a normal repo for init, then throw on refresh via ToggleDao
            val toggleDao = ToggleDao(dao, initialFail = false)
            val vm = HomeViewModel(SpendingRepository(api, toggleDao))
            advanceUntilIdle()
            assertNull(vm.ui.value.error)

            toggleDao.shouldFail = true
            vm.refresh()
            advanceUntilIdle()

            assertFalse(vm.ui.value.isRefreshing)
            assertEquals("Could not sync spendings", vm.ui.value.error)
        }

    @Test
    fun `refresh while already refreshing is a no-op`() =
        runTest(mainDispatcherRule.dispatcher.scheduler) {
            val gate = CompletableDeferred<ApiEnvelope<List<SpendingDto>>>()
            val vm = HomeViewModel(repo)
            advanceUntilIdle()

            api.listHandler = { gate.await() }
            vm.refresh()
            runCurrent()
            assertTrue(vm.ui.value.isRefreshing)

            val callsBefore = api.listCalls.size
            vm.refresh() // should be ignored
            runCurrent()

            assertEquals(callsBefore, api.listCalls.size)

            gate.complete(ApiEnvelope(emptyList()))
            advanceUntilIdle()
        }

    @Test
    fun `refresh pulls new items from backend into spendings`() =
        runTest(mainDispatcherRule.dispatcher.scheduler) {
            val vm = HomeViewModel(repo)
            advanceUntilIdle()
            assertTrue(vm.ui.value.spendings.isEmpty())

            api.listHandler = { ApiEnvelope(listOf(dto("s1"), dto("s2"))) }
            vm.refresh()
            advanceUntilIdle()

            assertEquals(2, vm.ui.value.spendings.size)
        }

    // ── deleteSpending / undoDelete ───────────────────────────────────────────

    @Test
    fun `deleteSpending hides item from visibleSpendings immediately`() =
        runTest(mainDispatcherRule.dispatcher.scheduler) {
            api.listHandler = { ApiEnvelope(listOf(dto("s1"))) }
            val vm = HomeViewModel(repo)
            advanceUntilIdle()
            assertEquals(1, vm.ui.value.visibleSpendings.size)

            vm.deleteSpending("s1")
            runCurrent()

            assertTrue(vm.ui.value.visibleSpendings.isEmpty())
            assertEquals("s1", vm.ui.value.pendingDeleteId)
        }

    @Test
    fun `deleteSpending emits snackbar event with spending name`() =
        runTest(mainDispatcherRule.dispatcher.scheduler) {
            api.listHandler = { ApiEnvelope(listOf(dto("s1"))) }
            val vm = HomeViewModel(repo)
            advanceUntilIdle()

            var emittedName: String? = null
            val job = launch { emittedName = vm.snackbarEvents.first() }
            runCurrent() // activate the collector before emitting

            vm.deleteSpending("s1")
            runCurrent()
            job.cancel()

            assertEquals("Coffee", emittedName)
        }

    @Test
    fun `undoDelete restores item in visibleSpendings`() =
        runTest(mainDispatcherRule.dispatcher.scheduler) {
            api.listHandler = { ApiEnvelope(listOf(dto("s1"))) }
            val vm = HomeViewModel(repo)
            advanceUntilIdle()

            vm.deleteSpending("s1")
            runCurrent()
            assertTrue(vm.ui.value.visibleSpendings.isEmpty())

            vm.undoDelete()
            runCurrent()

            assertEquals(1, vm.ui.value.visibleSpendings.size)
            assertNull(vm.ui.value.pendingDeleteId)
        }

    @Test
    fun `deleteSpending commits to repo after 4 seconds`() =
        runTest(mainDispatcherRule.dispatcher.scheduler) {
            api.listHandler = { ApiEnvelope(listOf(dto("s1"))) }
            val vm = HomeViewModel(repo)
            advanceUntilIdle()
            val deleteCallsBefore = api.deleteCalls.size

            vm.deleteSpending("s1")
            runCurrent()
            assertEquals(deleteCallsBefore, api.deleteCalls.size)

            advanceTimeBy(4_001)
            runCurrent()

            assertEquals(deleteCallsBefore + 1, api.deleteCalls.size)
            assertEquals("s1", api.deleteCalls.last())
        }

    @Test
    fun `undo before timer cancels the delete`() =
        runTest(mainDispatcherRule.dispatcher.scheduler) {
            api.listHandler = { ApiEnvelope(listOf(dto("s1"))) }
            val vm = HomeViewModel(repo)
            advanceUntilIdle()
            val deleteCallsBefore = api.deleteCalls.size

            vm.deleteSpending("s1")
            runCurrent()
            vm.undoDelete()
            advanceTimeBy(5_000)

            assertEquals(deleteCallsBefore, api.deleteCalls.size)
        }

    @Test
    fun `second swipe cancels first pending delete`() =
        runTest(mainDispatcherRule.dispatcher.scheduler) {
            api.listHandler = { ApiEnvelope(listOf(dto("s1"), dto("s2").copy(name = "Tea"))) }
            val vm = HomeViewModel(repo)
            advanceUntilIdle()
            val deleteCallsBefore = api.deleteCalls.size

            vm.deleteSpending("s1")
            runCurrent()
            vm.deleteSpending("s2")
            runCurrent()

            assertEquals("s2", vm.ui.value.pendingDeleteId)

            advanceTimeBy(4_001)
            runCurrent()

            assertEquals(deleteCallsBefore + 1, api.deleteCalls.size)
            assertEquals("s2", api.deleteCalls.last())
        }

    // ── helpers ───────────────────────────────────────────────────────────────

    // DAO that throws on getPending() (propagates through sync()) so the ViewModel error path fires.
    // pull() swallows API errors via its own runCatching; only DAO errors escape sync().
    private fun throwingDao(): SpendingDao = object : SpendingDao {
        override fun getAllFlow(): Flow<List<SpendingEntity>> = MutableStateFlow(emptyList())
        override suspend fun getAll(): List<SpendingEntity> = emptyList()
        override suspend fun getById(id: String): SpendingEntity? = null
        override suspend fun getPending(): List<SpendingEntity> = error("dao failure")
        override suspend fun upsert(entity: SpendingEntity) {}
        override suspend fun upsertAll(entities: List<SpendingEntity>) {}
        override suspend fun deleteById(id: String) {}
        override suspend fun deleteByIds(ids: List<String>) {}
        override suspend fun updateSyncStatus(id: String, status: SyncStatus) {}
    }

    private inner class ToggleDao(
        private val delegate: FakeSpendingDao,
        initialFail: Boolean = true,
    ) : SpendingDao by delegate {
        var shouldFail = initialFail
        override suspend fun getPending(): List<SpendingEntity> {
            if (shouldFail) error("dao failure")
            return delegate.getPending()
        }
    }

    private fun dto(id: String) = SpendingDto(
        id = id,
        userId = 1L,
        name = "Coffee",
        category = "Food",
        price = 5.0,
        observation = null,
        spentAt = "2026-01-01T00:00:00Z",
        orderNumber = 1,
        createdAt = "2026-01-01T00:00:00Z",
        updatedAt = "2026-01-01T00:00:00Z",
    )

    private fun localSpending(id: String) = SpendingEntity(
        id = id,
        userId = 1L,
        name = "Coffee",
        category = "Food",
        price = 5.0,
        observation = null,
        spentAt = "2026-01-01T00:00:00Z",
        orderNumber = 1,
        createdAt = "2026-01-01T00:00:00Z",
        updatedAt = "2026-01-01T00:00:00Z",
        syncStatus = SyncStatus.SYNCED,
    )
}
