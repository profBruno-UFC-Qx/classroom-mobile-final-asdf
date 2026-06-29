package com.cofifinance.mobile.ui.spending.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cofifinance.mobile.data.repository.SpendingRepository
import dagger.assisted.Assisted
import dagger.assisted.AssistedFactory
import dagger.assisted.AssistedInject
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

@HiltViewModel(assistedFactory = SpendingFormViewModel.Factory::class)
class SpendingFormViewModel @AssistedInject constructor(
    @Assisted private val spendingId: String?,
    private val repo: SpendingRepository,
) : ViewModel() {

    @AssistedFactory
    interface Factory {
        fun create(spendingId: String?): SpendingFormViewModel
    }

    private val _ui = MutableStateFlow(SpendingFormUiState(spentAt = nowIso8601()))
    val ui: StateFlow<SpendingFormUiState> = _ui.asStateFlow()

    private val _navigationEvent = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val navigationEvent: SharedFlow<Unit> = _navigationEvent.asSharedFlow()

    init {
        if (spendingId != null) {
            viewModelScope.launch {
                _ui.update { it.copy(isLoading = true) }
                val entity = repo.getSpendingById(spendingId)
                if (entity != null) {
                    _ui.update {
                        it.copy(
                            isLoading = false,
                            name = entity.name,
                            category = entity.category,
                            price = entity.price.toString(),
                            observation = entity.observation ?: "",
                            spentAt = entity.spentAt,
                        )
                    }
                } else {
                    _ui.update { it.copy(isLoading = false, formError = "Spending not found") }
                }
            }
        }
    }

    fun onNameChange(v: String) = _ui.update { it.copy(name = v, nameError = null) }
    fun onCategoryChange(v: String) = _ui.update { it.copy(category = v, categoryError = null) }
    fun onPriceChange(v: String) = _ui.update { it.copy(price = v, priceError = null) }
    fun onObservationChange(v: String) = _ui.update { it.copy(observation = v) }
    fun onSpentAtChange(v: String) = _ui.update { it.copy(spentAt = v) }

    fun save() {
        val state = _ui.value
        if (state.isSubmitting) return

        val nameError = if (state.name.isBlank()) "Name is required" else null
        val categoryError = if (state.category.isBlank()) "Category is required" else null
        val priceDouble = state.price.toDoubleOrNull()
        val priceError = when {
            state.price.isBlank() -> "Price is required"
            priceDouble == null -> "Invalid price"
            priceDouble <= 0 -> "Price must be greater than zero"
            else -> null
        }

        if (nameError != null || categoryError != null || priceError != null) {
            _ui.update { it.copy(nameError = nameError, categoryError = categoryError, priceError = priceError) }
            return
        }

        _ui.update { it.copy(isSubmitting = true, formError = null) }
        viewModelScope.launch {
            val result = if (spendingId == null) {
                runCatching {
                    repo.createSpending(
                        name = state.name.trim(),
                        category = state.category.trim(),
                        price = priceDouble!!,
                        observation = state.observation.takeIf { it.isNotBlank() },
                        spentAt = state.spentAt,
                    )
                }
            } else {
                runCatching {
                    repo.updateSpending(
                        id = spendingId,
                        name = state.name.trim(),
                        category = state.category.trim(),
                        price = priceDouble!!,
                        observation = state.observation.takeIf { it.isNotBlank() },
                        spentAt = state.spentAt,
                    )
                }
            }
            result.fold(
                onSuccess = {
                    _ui.update { it.copy(isSubmitting = false) }
                    _navigationEvent.emit(Unit)
                },
                onFailure = { _ui.update { it.copy(isSubmitting = false, formError = "Could not save. Please try again.") } },
            )
        }
    }
}

private fun nowIso8601(): String =
    SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
        .also { it.timeZone = TimeZone.getTimeZone("UTC") }
        .format(Date())
