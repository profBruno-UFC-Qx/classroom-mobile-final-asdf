package com.cofifinance.mobile.ui.home.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.cofifinance.mobile.data.repository.SpendingRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val repo: SpendingRepository,
) : ViewModel() {

    private val _ui = MutableStateFlow(HomeUiState())
    val ui: StateFlow<HomeUiState> = _ui.asStateFlow()

    private val _snackbarEvents = MutableSharedFlow<String>(extraBufferCapacity = 1)
    val snackbarEvents: SharedFlow<String> = _snackbarEvents.asSharedFlow()

    private var pendingDeleteJob: Job? = null

    init {
        viewModelScope.launch {
            repo.spendings.collect { list ->
                _ui.update { it.copy(spendings = list) }
            }
        }
        viewModelScope.launch {
            runCatching { repo.sync() }
                .onFailure { _ui.update { it.copy(isLoading = false, error = "Could not sync spendings") } }
                .onSuccess { _ui.update { it.copy(isLoading = false) } }
        }
    }

    fun refresh() {
        if (_ui.value.isRefreshing) return
        viewModelScope.launch {
            _ui.update { it.copy(isRefreshing = true, error = null) }
            runCatching { repo.sync() }
                .onFailure { _ui.update { it.copy(isRefreshing = false, error = "Could not sync spendings") } }
                .onSuccess { _ui.update { it.copy(isRefreshing = false) } }
        }
    }

    fun deleteSpending(id: String) {
        val name = _ui.value.spendings.find { it.id == id }?.name ?: return
        pendingDeleteJob?.cancel()
        _ui.update { it.copy(pendingDeleteId = id) }
        _snackbarEvents.tryEmit(name)
        pendingDeleteJob = viewModelScope.launch {
            delay(4_000)
            repo.deleteSpending(id)
            _ui.update { it.copy(pendingDeleteId = null) }
        }
    }

    fun undoDelete() {
        pendingDeleteJob?.cancel()
        pendingDeleteJob = null
        _ui.update { it.copy(pendingDeleteId = null) }
    }
}
