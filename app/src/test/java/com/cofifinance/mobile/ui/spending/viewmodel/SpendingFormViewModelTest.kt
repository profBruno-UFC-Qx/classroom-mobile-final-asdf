package com.cofifinance.mobile.ui.spending.viewmodel

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
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class SpendingFormViewModelTest {

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
        api.createHandler = { ApiEnvelope(spendingDto("server-new", name = it.name)) }
        api.updateHandler = { id, body -> ApiEnvelope(spendingDto(id, name = body.name)) }
    }

    // ── Initialization ────────────────────────────────────────────────────────

    @Test
    fun `create mode initial state is blank with current timestamp`() {
        val vm = SpendingFormViewModel(spendingId = null, repo = repo)

        val state = vm.ui.value
        assertEquals("", state.name)
        assertEquals("", state.category)
        assertEquals("", state.price)
        assertEquals("", state.observation)
        assertTrue(
            "expected spentAt to look like an ISO8601 UTC timestamp, was '${state.spentAt}'",
            state.spentAt.matches(Regex("""\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z""")),
        )
        assertFalse(state.isLoading)
        assertNull(state.nameError)
        assertNull(state.categoryError)
        assertNull(state.priceError)
        assertNull(state.formError)
        assertFalse(state.isSubmitting)
    }

    @Test
    fun `edit mode loads entity and pre-fills fields`() = runTest(mainDispatcherRule.dispatcher.scheduler) {
        dao.upsert(localSpending("s1", name = "Tea", category = "Drink", price = 3.5, observation = "warm"))

        val vm = SpendingFormViewModel(spendingId = "s1", repo = repo)
        advanceUntilIdle()

        val state = vm.ui.value
        assertFalse(state.isLoading)
        assertEquals("Tea", state.name)
        assertEquals("Drink", state.category)
        assertEquals("3.5", state.price)
        assertEquals("warm", state.observation)
        assertEquals("2026-01-01T00:00:00Z", state.spentAt)
        assertNull(state.formError)
    }

    @Test
    fun `edit mode with missing entity sets formError`() = runTest(mainDispatcherRule.dispatcher.scheduler) {
        val vm = SpendingFormViewModel(spendingId = "missing", repo = repo)
        advanceUntilIdle()

        val state = vm.ui.value
        assertFalse(state.isLoading)
        assertEquals("Spending not found", state.formError)
        assertEquals("", state.name)
    }

    @Test
    fun `edit mode loads null observation as empty string`() = runTest(mainDispatcherRule.dispatcher.scheduler) {
        dao.upsert(localSpending("s1", observation = null))

        val vm = SpendingFormViewModel(spendingId = "s1", repo = repo)
        advanceUntilIdle()

        assertEquals("", vm.ui.value.observation)
    }

    // ── Input handlers clear field errors ─────────────────────────────────────

    @Test
    fun `onNameChange clears nameError`() = runTest(mainDispatcherRule.dispatcher.scheduler) {
        val vm = SpendingFormViewModel(spendingId = null, repo = repo)
        vm.save() // blanks → populates errors
        runCurrent()
        assertNotNull(vm.ui.value.nameError)

        vm.onNameChange("Coffee")

        assertEquals("Coffee", vm.ui.value.name)
        assertNull(vm.ui.value.nameError)
    }

    @Test
    fun `onCategoryChange clears categoryError`() = runTest(mainDispatcherRule.dispatcher.scheduler) {
        val vm = SpendingFormViewModel(spendingId = null, repo = repo)
        vm.save()
        runCurrent()
        assertNotNull(vm.ui.value.categoryError)

        vm.onCategoryChange("Food")

        assertEquals("Food", vm.ui.value.category)
        assertNull(vm.ui.value.categoryError)
    }

    @Test
    fun `onPriceChange clears priceError`() = runTest(mainDispatcherRule.dispatcher.scheduler) {
        val vm = SpendingFormViewModel(spendingId = null, repo = repo)
        vm.save()
        runCurrent()
        assertNotNull(vm.ui.value.priceError)

        vm.onPriceChange("5")

        assertEquals("5", vm.ui.value.price)
        assertNull(vm.ui.value.priceError)
    }

    @Test
    fun `onObservationChange updates observation`() {
        val vm = SpendingFormViewModel(spendingId = null, repo = repo)

        vm.onObservationChange("with milk")

        assertEquals("with milk", vm.ui.value.observation)
    }

    @Test
    fun `onSpentAtChange updates spentAt`() {
        val vm = SpendingFormViewModel(spendingId = null, repo = repo)

        vm.onSpentAtChange("2026-06-29T00:00:00Z")

        assertEquals("2026-06-29T00:00:00Z", vm.ui.value.spentAt)
    }

    // ── Validation ────────────────────────────────────────────────────────────

    @Test
    fun `save with blank name surfaces name required error and skips repo call`() = runTest(mainDispatcherRule.dispatcher.scheduler) {
        val vm = SpendingFormViewModel(spendingId = null, repo = repo)
        vm.onCategoryChange("Food")
        vm.onPriceChange("5")

        vm.save()
        advanceUntilIdle()

        assertEquals("Name is required", vm.ui.value.nameError)
        assertTrue(api.createCalls.isEmpty())
    }

    @Test
    fun `save with blank category surfaces category required error`() = runTest(mainDispatcherRule.dispatcher.scheduler) {
        val vm = SpendingFormViewModel(spendingId = null, repo = repo)
        vm.onNameChange("Coffee")
        vm.onPriceChange("5")

        vm.save()
        advanceUntilIdle()

        assertEquals("Category is required", vm.ui.value.categoryError)
        assertTrue(api.createCalls.isEmpty())
    }

    @Test
    fun `save with blank price surfaces price required error`() = runTest(mainDispatcherRule.dispatcher.scheduler) {
        val vm = SpendingFormViewModel(spendingId = null, repo = repo)
        vm.onNameChange("Coffee")
        vm.onCategoryChange("Food")

        vm.save()
        advanceUntilIdle()

        assertEquals("Price is required", vm.ui.value.priceError)
        assertTrue(api.createCalls.isEmpty())
    }

    @Test
    fun `save with non-numeric price surfaces invalid price error`() = runTest(mainDispatcherRule.dispatcher.scheduler) {
        val vm = SpendingFormViewModel(spendingId = null, repo = repo)
        vm.onNameChange("Coffee")
        vm.onCategoryChange("Food")
        vm.onPriceChange("abc")

        vm.save()
        advanceUntilIdle()

        assertEquals("Invalid price", vm.ui.value.priceError)
        assertTrue(api.createCalls.isEmpty())
    }

    @Test
    fun `save with zero price surfaces price greater than zero error`() = runTest(mainDispatcherRule.dispatcher.scheduler) {
        val vm = SpendingFormViewModel(spendingId = null, repo = repo)
        vm.onNameChange("Coffee")
        vm.onCategoryChange("Food")
        vm.onPriceChange("0")

        vm.save()
        advanceUntilIdle()

        assertEquals("Price must be greater than zero", vm.ui.value.priceError)
        assertTrue(api.createCalls.isEmpty())
    }

    @Test
    fun `save with negative price surfaces price greater than zero error`() = runTest(mainDispatcherRule.dispatcher.scheduler) {
        val vm = SpendingFormViewModel(spendingId = null, repo = repo)
        vm.onNameChange("Coffee")
        vm.onCategoryChange("Food")
        vm.onPriceChange("-1")

        vm.save()
        advanceUntilIdle()

        assertEquals("Price must be greater than zero", vm.ui.value.priceError)
        assertTrue(api.createCalls.isEmpty())
    }

    // ── Submission — create ───────────────────────────────────────────────────

    @Test
    fun `save in create mode trims name and category and calls createSpending`() = runTest(mainDispatcherRule.dispatcher.scheduler) {
        val vm = SpendingFormViewModel(spendingId = null, repo = repo)
        vm.onNameChange("  Coffee  ")
        vm.onCategoryChange("  Food  ")
        vm.onPriceChange("5.5")

        vm.save()
        advanceUntilIdle()

        assertEquals(1, api.createCalls.size)
        val req = api.createCalls.single()
        assertEquals("Coffee", req.name)
        assertEquals("Food", req.category)
        assertEquals(5.5, req.price, 0.0)
    }

    @Test
    fun `save in create mode passes null observation when blank`() = runTest(mainDispatcherRule.dispatcher.scheduler) {
        val vm = SpendingFormViewModel(spendingId = null, repo = repo)
        vm.onNameChange("Coffee")
        vm.onCategoryChange("Food")
        vm.onPriceChange("5")

        vm.save()
        advanceUntilIdle()

        assertNull(api.createCalls.single().observation)
    }

    @Test
    fun `save in create mode passes observation when present`() = runTest(mainDispatcherRule.dispatcher.scheduler) {
        val vm = SpendingFormViewModel(spendingId = null, repo = repo)
        vm.onNameChange("Coffee")
        vm.onCategoryChange("Food")
        vm.onPriceChange("5")
        vm.onObservationChange("with milk")

        vm.save()
        advanceUntilIdle()

        assertEquals("with milk", api.createCalls.single().observation)
    }

    @Test
    fun `save in create mode emits navigationEvent and resets isSubmitting on success`() = runTest(mainDispatcherRule.dispatcher.scheduler) {
        val vm = SpendingFormViewModel(spendingId = null, repo = repo)
        val events = mutableListOf<Unit>()
        val collectorJob = launch { vm.navigationEvent.collect { events += it } }
        runCurrent()

        vm.onNameChange("Coffee")
        vm.onCategoryChange("Food")
        vm.onPriceChange("5")
        vm.save()
        advanceUntilIdle()

        assertEquals(1, events.size)
        assertFalse(vm.ui.value.isSubmitting)
        assertNull(vm.ui.value.formError)
        collectorJob.cancel()
    }

    // ── Submission — edit ─────────────────────────────────────────────────────

    @Test
    fun `save in edit mode calls updateSpending with correct id and fields`() = runTest(mainDispatcherRule.dispatcher.scheduler) {
        dao.upsert(localSpending("s1", name = "Tea"))
        val vm = SpendingFormViewModel(spendingId = "s1", repo = repo)
        advanceUntilIdle()

        vm.onNameChange("Espresso")
        vm.save()
        advanceUntilIdle()

        assertEquals(1, api.updateCalls.size)
        val (id, body) = api.updateCalls.single()
        assertEquals("s1", id)
        assertEquals("Espresso", body.name)
        assertTrue(api.createCalls.isEmpty())
    }

    @Test
    fun `save in edit mode emits navigationEvent`() = runTest(mainDispatcherRule.dispatcher.scheduler) {
        dao.upsert(localSpending("s1"))
        val vm = SpendingFormViewModel(spendingId = "s1", repo = repo)
        advanceUntilIdle()

        val events = mutableListOf<Unit>()
        val collectorJob = launch { vm.navigationEvent.collect { events += it } }
        runCurrent()

        vm.save()
        advanceUntilIdle()

        assertEquals(1, events.size)
        collectorJob.cancel()
    }

    // ── Failure path ──────────────────────────────────────────────────────────

    @Test
    fun `save failure sets formError and clears isSubmitting and does not emit nav event`() = runTest(mainDispatcherRule.dispatcher.scheduler) {
        val throwingRepo = SpendingRepository(api, throwingDao())
        val vm = SpendingFormViewModel(spendingId = null, repo = throwingRepo)
        val events = mutableListOf<Unit>()
        val collectorJob = launch { vm.navigationEvent.collect { events += it } }
        runCurrent()

        vm.onNameChange("Coffee")
        vm.onCategoryChange("Food")
        vm.onPriceChange("5")
        vm.save()
        advanceUntilIdle()

        assertEquals("Could not save. Please try again.", vm.ui.value.formError)
        assertFalse(vm.ui.value.isSubmitting)
        assertTrue(events.isEmpty())
        collectorJob.cancel()
    }

    // ── Double-submit guard ───────────────────────────────────────────────────

    @Test
    fun `save while already submitting is a no-op`() = runTest(mainDispatcherRule.dispatcher.scheduler) {
        val gate = CompletableDeferred<ApiEnvelope<SpendingDto>>()
        api.createHandler = { gate.await() }
        val vm = SpendingFormViewModel(spendingId = null, repo = repo)
        vm.onNameChange("Coffee")
        vm.onCategoryChange("Food")
        vm.onPriceChange("5")

        vm.save()
        runCurrent()
        assertTrue("expected isSubmitting=true while API in flight", vm.ui.value.isSubmitting)

        vm.save() // should be guarded out
        runCurrent()

        gate.complete(ApiEnvelope(spendingDto("server-new")))
        advanceUntilIdle()

        assertEquals(1, api.createCalls.size)
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private fun spendingDto(id: String, name: String = "Coffee") = SpendingDto(
        id = id,
        userId = 1L,
        name = name,
        category = "Food",
        price = 5.0,
        observation = null,
        spentAt = "2026-01-01T00:00:00Z",
        orderNumber = 1,
        createdAt = "2026-01-01T00:00:00Z",
        updatedAt = "2026-01-01T00:00:00Z",
    )

    private fun localSpending(
        id: String,
        name: String = "Coffee",
        category: String = "Food",
        price: Double = 5.0,
        observation: String? = null,
        spentAt: String = "2026-01-01T00:00:00Z",
        syncStatus: SyncStatus = SyncStatus.SYNCED,
    ) = SpendingEntity(
        id = id,
        userId = 1L,
        name = name,
        category = category,
        price = price,
        observation = observation,
        spentAt = spentAt,
        orderNumber = 1,
        createdAt = "2026-01-01T00:00:00Z",
        updatedAt = "2026-01-01T00:00:00Z",
        syncStatus = syncStatus,
    )

    private fun throwingDao(): SpendingDao = object : SpendingDao {
        override fun getAllFlow(): Flow<List<SpendingEntity>> = MutableStateFlow(emptyList())
        override suspend fun getAll(): List<SpendingEntity> = emptyList()
        override suspend fun getById(id: String): SpendingEntity? = null
        override suspend fun getPending(): List<SpendingEntity> = emptyList()
        override suspend fun upsert(entity: SpendingEntity) = error("boom")
        override suspend fun upsertAll(entities: List<SpendingEntity>) = error("boom")
        override suspend fun deleteById(id: String) {}
        override suspend fun deleteByIds(ids: List<String>) {}
        override suspend fun updateSyncStatus(id: String, status: SyncStatus) {}
    }
}
