package com.cofifinance.mobile.ui.spending.screens

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import com.cofifinance.mobile.data.local.entity.SpendingEntity
import com.cofifinance.mobile.data.local.entity.SyncStatus
import com.cofifinance.mobile.data.remote.dto.ApiEnvelope
import com.cofifinance.mobile.data.remote.dto.SpendingDto
import com.cofifinance.mobile.data.repository.SpendingRepository
import com.cofifinance.mobile.support.FakeSpendingApiService
import com.cofifinance.mobile.support.FakeSpendingDao
import com.cofifinance.mobile.ui.spending.viewmodel.SpendingFormViewModel
import kotlinx.coroutines.runBlocking
import org.junit.Rule
import org.junit.Test

class SpendingFormScreenTest {

    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun create_mode_shows_New_Spending_title_and_Create_button() {
        val vm = vm(spendingId = null)

        composeRule.setContent {
            SpendingFormScreen(spendingId = null, onBack = {}, vm = vm)
        }

        composeRule.onNodeWithText("New Spending").assertIsDisplayed()
        composeRule.onNodeWithText("Create").assertIsDisplayed()
    }

    @Test
    fun edit_mode_shows_Edit_Spending_title_and_prefilled_fields_and_Save_button() {
        val entity = seedEntity(
            id = "s1",
            name = "Tea",
            category = "Drink",
            price = 3.5,
            observation = "warm",
        )
        val vm = vm(spendingId = "s1", seed = entity)

        composeRule.setContent {
            SpendingFormScreen(spendingId = "s1", onBack = {}, vm = vm)
        }

        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule.onAllNodesWithText("Tea").fetchSemanticsNodes().isNotEmpty()
        }

        composeRule.onNodeWithText("Edit Spending").assertIsDisplayed()
        composeRule.onNodeWithText("Tea").assertIsDisplayed()
        composeRule.onNodeWithText("Drink").assertIsDisplayed()
        composeRule.onNodeWithText("3.5").assertIsDisplayed()
        composeRule.onNodeWithText("warm").assertIsDisplayed()
        composeRule.onNodeWithText("Save").assertIsDisplayed()
    }

    @Test
    fun edit_mode_with_missing_id_shows_formError() {
        val vm = vm(spendingId = "ghost")

        composeRule.setContent {
            SpendingFormScreen(spendingId = "ghost", onBack = {}, vm = vm)
        }

        composeRule.waitUntil(timeoutMillis = 5_000) {
            composeRule.onAllNodesWithText("Spending not found").fetchSemanticsNodes().isNotEmpty()
        }
        composeRule.onNodeWithText("Spending not found").assertIsDisplayed()
    }

    @Test
    fun tapping_Create_with_blank_fields_shows_validation_errors() {
        val vm = vm(spendingId = null)

        composeRule.setContent {
            SpendingFormScreen(spendingId = null, onBack = {}, vm = vm)
        }

        composeRule.onNodeWithText("Create").performClick()

        composeRule.onNodeWithText("Name is required").assertIsDisplayed()
        composeRule.onNodeWithText("Category is required").assertIsDisplayed()
        composeRule.onNodeWithText("Price is required").assertIsDisplayed()
    }

    @Test
    fun tapping_Create_with_invalid_price_shows_invalid_price_error() {
        val vm = vm(spendingId = null)

        composeRule.setContent {
            SpendingFormScreen(spendingId = null, onBack = {}, vm = vm)
        }

        composeRule.onNodeWithText("Name").performTextInput("Coffee")
        composeRule.onNodeWithText("Category").performTextInput("Food")
        composeRule.onNodeWithText("Price").performTextInput("abc")
        composeRule.onNodeWithText("Create").performClick()

        composeRule.onNodeWithText("Invalid price").assertIsDisplayed()
    }

    @Test
    fun successful_save_invokes_onBack() {
        var backCalled = false
        val vm = vm(spendingId = null)

        composeRule.setContent {
            SpendingFormScreen(spendingId = null, onBack = { backCalled = true }, vm = vm)
        }

        composeRule.onNodeWithText("Name").performTextInput("Coffee")
        composeRule.onNodeWithText("Category").performTextInput("Food")
        composeRule.onNodeWithText("Price").performTextInput("5")
        composeRule.onNodeWithText("Create").performClick()

        composeRule.waitUntil(timeoutMillis = 5_000) { backCalled }
    }

    @Test
    fun tapping_back_arrow_invokes_onBack() {
        var backCalled = false
        val vm = vm(spendingId = null)

        composeRule.setContent {
            SpendingFormScreen(spendingId = null, onBack = { backCalled = true }, vm = vm)
        }

        composeRule.onNodeWithContentDescription("Back").performClick()

        composeRule.waitUntil(timeoutMillis = 5_000) { backCalled }
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private fun vm(spendingId: String?, seed: SpendingEntity? = null): SpendingFormViewModel {
        val api = FakeSpendingApiService().apply {
            createHandler = { ApiEnvelope(dto("server-new", name = it.name)) }
            updateHandler = { id, body -> ApiEnvelope(dto(id, name = body.name)) }
        }
        val dao = FakeSpendingDao()
        if (seed != null) runBlocking { dao.upsert(seed) }
        return SpendingFormViewModel(spendingId, SpendingRepository(api, dao))
    }

    private fun seedEntity(
        id: String,
        name: String,
        category: String,
        price: Double,
        observation: String?,
    ) = SpendingEntity(
        id = id,
        userId = 1L,
        name = name,
        category = category,
        price = price,
        observation = observation,
        spentAt = "2026-01-01T00:00:00Z",
        orderNumber = 1,
        createdAt = "2026-01-01T00:00:00Z",
        updatedAt = "2026-01-01T00:00:00Z",
        syncStatus = SyncStatus.SYNCED,
    )

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
}
