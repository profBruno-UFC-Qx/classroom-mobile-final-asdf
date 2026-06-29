package com.cofifinance.mobile.ui.home.screens

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.swipeDown
import com.cofifinance.mobile.data.local.entity.SpendingEntity
import com.cofifinance.mobile.data.local.entity.SyncStatus
import com.cofifinance.mobile.data.remote.dto.ApiEnvelope
import com.cofifinance.mobile.data.remote.dto.SpendingDto
import com.cofifinance.mobile.data.repository.SpendingRepository
import com.cofifinance.mobile.support.FakeSpendingApiService
import com.cofifinance.mobile.support.FakeSpendingDao
import com.cofifinance.mobile.ui.home.viewmodel.HomeViewModel
import kotlinx.coroutines.runBlocking
import org.junit.Rule
import org.junit.Test

class HomeScreenTest {

    @get:Rule
    val composeRule = createComposeRule()

    // ── Empty / loading states ────────────────────────────────────────────────

    @Test
    fun empty_list_shows_no_spendings_message() {
        val vm = vm()

        composeRule.setContent {
            HomeScreen(onNavigateToCreate = {}, onNavigateToEdit = {}, vm = vm)
        }

        composeRule.waitUntil(5_000) { !vm.ui.value.isLoading }
        composeRule.onNodeWithText("No spendings yet").assertIsDisplayed()
    }

    @Test
    fun spending_items_are_shown_when_list_is_non_empty() {
        val api = FakeSpendingApiService().apply {
            listHandler = { ApiEnvelope(listOf(dto("s1", "Afternoon Coffee"))) }
        }
        val vm = vm(api = api)

        composeRule.setContent {
            HomeScreen(onNavigateToCreate = {}, onNavigateToEdit = {}, vm = vm)
        }

        composeRule.waitUntil(5_000) {
            composeRule.onAllNodesWithText("Afternoon Coffee").fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onNodeWithText("Afternoon Coffee").assertIsDisplayed()
    }

    @Test
    fun error_message_is_shown_when_sync_fails() {
        val api = FakeSpendingApiService().apply {
            listHandler = { error("network failure") }
        }
        val vm = vm(api = api)

        composeRule.setContent {
            HomeScreen(onNavigateToCreate = {}, onNavigateToEdit = {}, vm = vm)
        }

        composeRule.waitUntil(5_000) { !vm.ui.value.isLoading }
        composeRule.onNodeWithText("Could not sync spendings").assertIsDisplayed()
    }

    // ── Navigation ────────────────────────────────────────────────────────────

    @Test
    fun fab_invokes_onNavigateToCreate() {
        var createCalled = false
        val vm = vm()

        composeRule.setContent {
            HomeScreen(
                onNavigateToCreate = { createCalled = true },
                onNavigateToEdit = {},
                vm = vm,
            )
        }

        composeRule.onNodeWithContentDescription("Add spending").performClick()

        composeRule.waitUntil(5_000) { createCalled }
    }

    @Test
    fun clicking_spending_item_invokes_onNavigateToEdit_with_correct_id() {
        var editId: String? = null
        val api = FakeSpendingApiService().apply {
            listHandler = { ApiEnvelope(listOf(dto("s1", "Tea"))) }
        }
        val vm = vm(api = api)

        composeRule.setContent {
            HomeScreen(
                onNavigateToCreate = {},
                onNavigateToEdit = { editId = it },
                vm = vm,
            )
        }

        composeRule.waitUntil(5_000) {
            composeRule.onAllNodesWithText("Tea").fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onNodeWithText("Tea").performClick()

        composeRule.waitUntil(5_000) { editId != null }
        assert(editId == "s1")
    }

    // ── Pull-to-refresh ───────────────────────────────────────────────────────

    @Test
    fun pull_to_refresh_triggers_sync() {
        val api = FakeSpendingApiService().apply {
            listHandler = { ApiEnvelope(listOf(dto("s1", "Coffee"))) }
        }
        val vm = vm(api = api)

        composeRule.setContent {
            HomeScreen(onNavigateToCreate = {}, onNavigateToEdit = {}, vm = vm)
        }

        // Wait for initial load to complete so the list is rendered
        composeRule.waitUntil(5_000) { !vm.ui.value.isLoading }

        val callsBefore = api.listCalls.size

        composeRule.onRoot().performTouchInput { swipeDown() }

        composeRule.waitUntil(5_000) { api.listCalls.size > callsBefore }
    }

    @Test
    fun pull_to_refresh_updates_spendings_from_backend() {
        var serveNewItem = false
        val api = FakeSpendingApiService().apply {
            listHandler = {
                if (serveNewItem) ApiEnvelope(listOf(dto("s1", "Coffee"), dto("s2", "New Item")))
                else ApiEnvelope(listOf(dto("s1", "Coffee")))
            }
        }
        val vm = vm(api = api)

        composeRule.setContent {
            HomeScreen(onNavigateToCreate = {}, onNavigateToEdit = {}, vm = vm)
        }

        composeRule.waitUntil(5_000) { !vm.ui.value.isLoading }

        serveNewItem = true
        composeRule.onRoot().performTouchInput { swipeDown() }

        composeRule.waitUntil(5_000) {
            composeRule.onAllNodesWithText("New Item").fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onNodeWithText("New Item").assertIsDisplayed()
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private fun vm(
        api: FakeSpendingApiService = FakeSpendingApiService(),
        seed: SpendingEntity? = null,
    ): HomeViewModel {
        val dao = FakeSpendingDao()
        if (seed != null) runBlocking { dao.upsert(seed) }
        return HomeViewModel(SpendingRepository(api, dao))
    }

    private fun dto(id: String, name: String) = SpendingDto(
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

    @Suppress("SameParameterValue")
    private fun entity(id: String, name: String) = SpendingEntity(
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
        syncStatus = SyncStatus.SYNCED,
    )
}
